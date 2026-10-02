// TRANSPORT: props-only — drives a WebGL canvas from static art. No fetching beyond the atlas
// image, no React.
//
// THE MASCOT'S RENDER LOOP, AND THE ONLY CODE THAT TOUCHES PIXI.
//
// It is plain imperative code rather than a component because everything in it happens per frame:
// where the perch is, where the mascot is, which face it wears. A React commit per frame would be
// the cost this design exists to avoid, so React hands this a canvas host and the mascot's DOM box
// once, and from then on talks to it through four methods.
//
// Pixi is passed IN as the module namespace, never imported as a value. `mascot-stage.tsx` loads it
// with `await import("pixi.js")` inside an effect (the teardown engine's precedent), which is what
// keeps every Pixi byte out of the page until AI Assist Mode is switched on.
//
// FRAME ORDER IS READS, THEN WRITES. The perch tracker does its one layout read, the viewport size
// is read if a resize dirtied it, and only then does anything get written: the Pixi container (a
// canvas draw, not DOM) and at most one `transform` on the DOM box that holds the open button and
// speech bubble — and that only when the position actually moved.
//
// `ticker.maxFPS = 30` and AnimatedSprite `autoUpdate: false`. Left on `autoUpdate`, Pixi's sprites
// tick from the SHARED ticker, which is uncapped and would keep running after this app's ticker is
// stopped for a hidden tab.

import type * as PixiNamespace from "pixi.js";

import {
  canMoodReplace,
  selectAmbientMood,
  selectPoseForPlacement,
  type MascotMood,
  type MascotPlacement,
  type MascotReaction,
} from "@/components/assistant/mascot-state";
import { createPerchTracker, type PerchReading } from "@/components/assistant/perch-tracker";
import {
  MASCOT_FRAME_SIZE_PX,
  resolveMascotBodyKey,
  resolveMascotEffectKey,
  resolveMascotFaceKey,
  type MascotAtlas,
} from "@/lib/assistant/mascot-atlas.schemas";
import type { MascotEffect, MascotExpression } from "@/lib/assistant/mascot-expressions";

type PixiModule = typeof PixiNamespace;

export interface MascotController {
  /** A signal reaction: change face, optionally go and sit on a perch. */
  readonly react: (reaction: MascotReaction) => void;
  /** A short face change for something the viewer did to the mascot itself. */
  readonly showInteractionMood: (
    expression: MascotExpression,
    effect: MascotEffect | null,
    holdMs: number,
  ) => void;
  /** Call after a route change: a perch removed by navigation fires no event of its own. */
  readonly markLayoutDirty: () => void;
  readonly destroy: () => void;
}

/** Matches `(home)`'s 80px mobile bottom nav plus a gap; md and up has no bottom nav. */
const DOCK_BOTTOM_OFFSET_MOBILE_PX = 96;
const DOCK_BOTTOM_OFFSET_DESKTOP_PX = 24;
const DOCK_SIDE_OFFSET_MOBILE_PX = 12;
const DOCK_SIDE_OFFSET_DESKTOP_PX = 24;
const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_SCALE = 0.8;
const VIEWPORT_MARGIN_PX = 8;
/** The sit pose's seat is drawn a few pixels above the frame's bottom edge. */
const SIT_SINK_PX = 6;
/** Exponential-approach time constant for a trip between dock and perch. */
const TRAVEL_TIME_CONSTANT_MS = 140;
const ARRIVAL_DISTANCE_PX = 1;
const REDUCED_MOTION_FADE_IN_MS = 200;
const BOB_AMPLITUDE_PX = 3;
const BOB_PERIOD_MS = 2_400;
const BODY_ANIMATION_SPEED = 0.05;
const FACE_ANIMATION_SPEED = 0.05;
const EFFECT_ANIMATION_SPEED = 0.12;
const MAXIMUM_FRAMES_PER_SECOND = 30;

interface ViewportPoint {
  x: number;
  y: number;
}

function arriveAt(destinationPerchId: string | null): MascotPlacement {
  return destinationPerchId === null
    ? { mode: "docked" }
    : { mode: "perched", perchId: destinationPerchId };
}

/** The perch anchor after this frame's reading: kept, replaced, or gone (and the dock it is). */
function selectPerchAnchor(
  perchReading: PerchReading,
  previousPerchAnchor: ViewportPoint | null,
  clampToViewport: (anchorX: number, anchorY: number) => ViewportPoint,
): ViewportPoint | null {
  switch (perchReading.kind) {
    case "unchanged":
      return previousPerchAnchor;
    case "anchor":
      return clampToViewport(perchReading.anchorX, perchReading.anchorY);
    case "none":
    case "hidden":
    case "lost":
      return null;
    default: {
      const exhaustiveCheck: never = perchReading;
      return exhaustiveCheck;
    }
  }
}

export async function createMascotController({
  pixi,
  atlas,
  canvasHost,
  mascotBox,
}: {
  readonly pixi: PixiModule;
  readonly atlas: MascotAtlas;
  readonly canvasHost: HTMLElement;
  /** The fixed DOM box over the mascot: open button and speech bubble. Moved by transform. */
  readonly mascotBox: HTMLElement;
}): Promise<MascotController> {
  const application = new pixi.Application();
  try {
    await application.init({
      backgroundAlpha: 0,
      resizeTo: window,
      autoDensity: true,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: "webgl",
    });
  } catch (initError) {
    application.destroy({ removeView: true }, { children: true });
    throw initError;
  }

  // Loaded around `Assets` on purpose. `Assets` caches by URL, and under StrictMode's dev double
  // mount the first controller's teardown would unload the texture the second one is drawing with.
  // A texture built from this mount's own ImageBitmap belongs to this mount alone.
  const atlasImageResponse = await fetch(atlas.imageUrl);
  if (!atlasImageResponse.ok) {
    application.destroy({ removeView: true }, { children: true });
    throw new Error(`Mascot atlas image answered ${atlasImageResponse.status}.`);
  }
  const atlasBitmap = await createImageBitmap(await atlasImageResponse.blob());
  const atlasTexture = new pixi.Texture({
    source: new pixi.ImageSource({ resource: atlasBitmap }),
  });
  const spritesheet = new pixi.Spritesheet(atlasTexture, atlas.spritesheetData);
  await spritesheet.parse();

  const readAnimationTextures = (animationKey: string): PixiNamespace.Texture[] => {
    const animationTextures = spritesheet.animations[animationKey];
    if (animationTextures === undefined || animationTextures.length === 0) {
      throw new Error(`Mascot atlas has no textures for "${animationKey}".`);
    }
    return animationTextures;
  };

  application.ticker.maxFPS = MAXIMUM_FRAMES_PER_SECOND;
  canvasHost.appendChild(application.canvas);

  const createLayerSprite = (animationKey: string, animationSpeed: number) => {
    const layerSprite = new pixi.AnimatedSprite({
      textures: readAnimationTextures(animationKey),
      autoUpdate: false,
      animationSpeed,
    });
    layerSprite.anchor.set(0.5, 1);
    return layerSprite;
  };

  const initialBodyKey = resolveMascotBodyKey(atlas, "float_idle");
  const initialFaceKey = resolveMascotFaceKey(atlas, "neutral");
  const bodySprite = createLayerSprite(initialBodyKey, BODY_ANIMATION_SPEED);
  const faceSprite = createLayerSprite(initialFaceKey, FACE_ANIMATION_SPEED);
  const effectSprite = createLayerSprite(initialBodyKey, EFFECT_ANIMATION_SPEED);
  effectSprite.visible = false;

  const mascotContainer = new pixi.Container();
  mascotContainer.addChild(bodySprite, faceSprite, effectSprite);
  application.stage.addChild(mascotContainer);

  // ---- state, all of it plain variables read and written by the tick ----

  const perchTracker = createPerchTracker();
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isReducedMotion = reducedMotionQuery.matches;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let isViewportDirty = false;
  let mascotScale = viewportWidth < MOBILE_BREAKPOINT_PX ? MOBILE_SCALE : 1;
  let lastActivityMs = performance.now();

  let placement: MascotPlacement = { mode: "docked" };
  let mood: MascotMood = selectAmbientMood(0);
  let perchAnchor: ViewportPoint | null = null;
  const computeDockPoint = (): ViewportPoint => {
    const isMobileViewport = viewportWidth < MOBILE_BREAKPOINT_PX;
    const halfBoxWidth = (MASCOT_FRAME_SIZE_PX * mascotScale) / 2;
    return {
      x:
        viewportWidth -
        (isMobileViewport ? DOCK_SIDE_OFFSET_MOBILE_PX : DOCK_SIDE_OFFSET_DESKTOP_PX) -
        halfBoxWidth,
      y:
        viewportHeight -
        (isMobileViewport ? DOCK_BOTTOM_OFFSET_MOBILE_PX : DOCK_BOTTOM_OFFSET_DESKTOP_PX),
    };
  };
  const mascotPosition: ViewportPoint = computeDockPoint();

  let shownBodyKey = initialBodyKey;
  let shownFaceKey = initialFaceKey;
  let shownEffectKey: string | null = null;
  let lastWrittenBoxLeft = Number.NaN;
  let lastWrittenBoxTop = Number.NaN;
  let lastWrittenBoxSize = Number.NaN;
  let lastWrittenBubbleSide = "";

  // ---- sprite helpers ----

  const startOrFreeze = (layerSprite: PixiNamespace.AnimatedSprite) => {
    // Reduced motion keeps every expression, one still frame each. Frame 0 is the resting frame
    // by contract (eyes open, effect at rest).
    if (isReducedMotion) layerSprite.gotoAndStop(0);
    else layerSprite.play();
  };

  const showLayerAnimation = (
    layerSprite: PixiNamespace.AnimatedSprite,
    shownKey: string,
    nextKey: string,
  ): string => {
    if (shownKey === nextKey) return shownKey;
    layerSprite.textures = readAnimationTextures(nextKey);
    startOrFreeze(layerSprite);
    return nextKey;
  };

  for (const layerSprite of [bodySprite, faceSprite]) startOrFreeze(layerSprite);

  const clampToViewport = (anchorX: number, anchorY: number): ViewportPoint => {
    const boxSize = MASCOT_FRAME_SIZE_PX * mascotScale;
    return {
      x: Math.min(
        Math.max(anchorX, boxSize / 2 + VIEWPORT_MARGIN_PX),
        viewportWidth - boxSize / 2 - VIEWPORT_MARGIN_PX,
      ),
      y: Math.min(
        Math.max(anchorY + SIT_SINK_PX, boxSize + VIEWPORT_MARGIN_PX),
        viewportHeight - VIEWPORT_MARGIN_PX,
      ),
    };
  };

  // ---- the frame ----

  const tick = (ticker: PixiNamespace.Ticker) => {
    const nowMs = performance.now();

    // READS. At most one layout read (inside the tracker), plus the window size if dirtied.
    const perchReading = perchTracker.read(nowMs);
    if (isViewportDirty) {
      isViewportDirty = false;
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      mascotScale = viewportWidth < MOBILE_BREAKPOINT_PX ? MOBILE_SCALE : 1;
      perchTracker.markDirty();
    }

    perchAnchor = selectPerchAnchor(perchReading, perchAnchor, clampToViewport);

    // PLACEMENT.
    const destinationPerchId = perchAnchor === null ? null : perchTracker.targetPerchId();
    const destination = perchAnchor ?? computeDockPoint();
    const isFollowingCurrentSpot =
      (placement.mode === "perched" && placement.perchId === destinationPerchId) ||
      (placement.mode === "docked" && destinationPerchId === null);

    if (isFollowingCurrentSpot) {
      // Sitting on a perch that scrolls, or docked in a window that resized: follow, no tween.
      mascotPosition.x = destination.x;
      mascotPosition.y = destination.y;
    } else if (isReducedMotion) {
      // Fade-jump: no travel, but arriving somewhere new is still legible.
      mascotPosition.x = destination.x;
      mascotPosition.y = destination.y;
      mascotContainer.alpha = 0;
      placement = arriveAt(destinationPerchId);
    } else {
      const approachFraction = 1 - Math.exp(-ticker.deltaMS / TRAVEL_TIME_CONSTANT_MS);
      mascotPosition.x += (destination.x - mascotPosition.x) * approachFraction;
      mascotPosition.y += (destination.y - mascotPosition.y) * approachFraction;
      const remainingDistance = Math.hypot(
        destination.x - mascotPosition.x,
        destination.y - mascotPosition.y,
      );
      if (remainingDistance <= ARRIVAL_DISTANCE_PX) {
        mascotPosition.x = destination.x;
        mascotPosition.y = destination.y;
        placement = arriveAt(destinationPerchId);
      } else {
        placement = { mode: "travelling", toPerchId: destinationPerchId };
      }
    }

    // MOOD.
    if (mood.priority === "ambient" || (mood.expiresAtMs !== null && mood.expiresAtMs <= nowMs)) {
      mood = selectAmbientMood(nowMs - lastActivityMs);
    }

    // WRITES, canvas first.
    shownBodyKey = showLayerAnimation(
      bodySprite,
      shownBodyKey,
      resolveMascotBodyKey(atlas, selectPoseForPlacement(placement)),
    );
    shownFaceKey = showLayerAnimation(
      faceSprite,
      shownFaceKey,
      resolveMascotFaceKey(atlas, mood.expression),
    );
    const nextEffectKey = resolveMascotEffectKey(atlas, mood.effect);
    if (nextEffectKey !== shownEffectKey) {
      effectSprite.visible = nextEffectKey !== null;
      if (nextEffectKey !== null) {
        effectSprite.textures = readAnimationTextures(nextEffectKey);
        startOrFreeze(effectSprite);
      }
      shownEffectKey = nextEffectKey;
    }
    if (!isReducedMotion) {
      bodySprite.update(ticker);
      faceSprite.update(ticker);
      if (effectSprite.visible) effectSprite.update(ticker);
    }

    const isFloating = placement.mode !== "perched";
    const bobOffsetPx =
      isFloating && !isReducedMotion
        ? Math.sin((nowMs / BOB_PERIOD_MS) * Math.PI * 2) * BOB_AMPLITUDE_PX
        : 0;
    mascotContainer.scale.set(mascotScale);
    mascotContainer.position.set(mascotPosition.x, mascotPosition.y + bobOffsetPx);
    if (mascotContainer.alpha < 1) {
      mascotContainer.alpha = Math.min(
        1,
        mascotContainer.alpha + ticker.deltaMS / REDUCED_MOTION_FADE_IN_MS,
      );
    }

    // Then the DOM box, only when it moved. The bob is excluded: the button's box already covers
    // a few pixels of float, and a style write every frame for it would be pure waste.
    const boxSize = MASCOT_FRAME_SIZE_PX * mascotScale;
    const boxLeft = Math.round(mascotPosition.x - boxSize / 2);
    const boxTop = Math.round(mascotPosition.y - boxSize);
    if (boxLeft !== lastWrittenBoxLeft || boxTop !== lastWrittenBoxTop) {
      mascotBox.style.transform = `translate3d(${boxLeft}px, ${boxTop}px, 0)`;
      lastWrittenBoxLeft = boxLeft;
      lastWrittenBoxTop = boxTop;
    }
    if (boxSize !== lastWrittenBoxSize) {
      mascotBox.style.width = `${boxSize}px`;
      mascotBox.style.height = `${boxSize}px`;
      lastWrittenBoxSize = boxSize;
    }
    // The bubble opens toward the middle of the screen so it never runs off the nearer edge.
    const bubbleSide = mascotPosition.x > viewportWidth / 2 ? "right" : "left";
    if (bubbleSide !== lastWrittenBubbleSide) {
      mascotBox.dataset.bubbleSide = bubbleSide;
      lastWrittenBubbleSide = bubbleSide;
    }
  };

  application.ticker.add(tick);

  // ---- listeners ----

  const handleViewportResize = () => {
    isViewportDirty = true;
  };
  const handleViewerActivity = () => {
    lastActivityMs = performance.now();
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      application.ticker.stop();
    } else {
      isViewportDirty = true;
      application.ticker.start();
    }
  };
  const handleReducedMotionChange = (reducedMotionChange: MediaQueryListEvent) => {
    isReducedMotion = reducedMotionChange.matches;
    for (const layerSprite of [bodySprite, faceSprite, effectSprite]) startOrFreeze(layerSprite);
  };

  const passiveListenerOptions = { passive: true };
  window.addEventListener("resize", handleViewportResize, passiveListenerOptions);
  window.addEventListener("pointerdown", handleViewerActivity, passiveListenerOptions);
  window.addEventListener("pointermove", handleViewerActivity, passiveListenerOptions);
  window.addEventListener("keydown", handleViewerActivity, passiveListenerOptions);
  window.addEventListener("wheel", handleViewerActivity, passiveListenerOptions);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

  const applyMood = (incomingMood: MascotMood) => {
    if (canMoodReplace(incomingMood, mood, performance.now())) mood = incomingMood;
  };

  return {
    react: (reaction) => {
      const nowMs = performance.now();
      lastActivityMs = nowMs;
      applyMood({
        expression: reaction.expression,
        effect: reaction.effect,
        priority: "signal",
        expiresAtMs: nowMs + reaction.holdMs,
      });
      if (reaction.perchId !== null) perchTracker.track(reaction.perchId, nowMs);
    },
    showInteractionMood: (expression, effect, holdMs) => {
      const nowMs = performance.now();
      lastActivityMs = nowMs;
      applyMood({ expression, effect, priority: "interaction", expiresAtMs: nowMs + holdMs });
    },
    markLayoutDirty: () => {
      perchTracker.markDirty();
    },
    destroy: () => {
      window.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("pointerdown", handleViewerActivity);
      window.removeEventListener("pointermove", handleViewerActivity);
      window.removeEventListener("keydown", handleViewerActivity);
      window.removeEventListener("wheel", handleViewerActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      perchTracker.untrack();
      application.ticker.remove(tick);
      spritesheet.destroy(true);
      atlasBitmap.close();
      // Destroying the application releases the WebGL context, which is the point of switching
      // AI Assist Mode off.
      application.destroy({ removeView: true }, { children: true });
    },
  };
}
