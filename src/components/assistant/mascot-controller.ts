// TRANSPORT: props-only — drives a WebGL canvas from static art. No fetching beyond the atlas
// image, no React.
//
// THE MASCOT'S RENDER LOOP, AND THE ONLY CODE THAT TOUCHES PIXI.
//
// It is plain imperative code rather than a component because everything in it happens per frame:
// where the perch is, where the mascot is, which pose it shows. A React commit per frame would be
// the cost this design exists to avoid, so React hands this a canvas host and the mascot's DOM box
// once, and from then on talks to it through a handful of methods.
//
// Pixi is passed IN as the module namespace, never imported as a value. `mascot-stage.tsx` loads it
// with `await import("pixi.js")` inside an effect (the teardown engine's precedent), which is what
// keeps every Pixi byte out of the page until AI Assist Mode is switched on.
//
// FRAME ORDER IS READS, THEN WRITES. The perch tracker does its one layout read, the viewport size
// is read if a resize dirtied it, and only then does anything get written: the Pixi sprites (a canvas
// draw, not DOM) and at most one `transform` on the DOM box that holds the open button and speech
// bubble — and that only when the position actually moved.
//
// POSES CROSSFADE. Each frame of an expression is a pose held for the atlas's `frameHoldMs`, and two
// sprites trade places between them: the incoming pose fades in over the outgoing one by opacity,
// which is the one kind of motion `docs/Design.md` allows everywhere. Reduced motion shows frame 0
// of each expression and swaps without a fade.
//
// POINTING IS LAID OVER THE MOOD. On the way to a perch it points where it is going, on arrival it
// points down at the perch for a moment, and `pointAt` lets the panel say "over here". When the
// pointing ends, the mood (joy, thinking, …) is what shows again.

import type * as PixiNamespace from "pixi.js";

import {
  AMBIENT_MASCOT_MOOD,
  canMoodReplace,
  type MascotMood,
  type MascotPlacement,
  type MascotPointing,
  type MascotReaction,
} from "@/components/assistant/mascot-state";
import { createPerchTracker, type PerchReading } from "@/components/assistant/perch-tracker";
import {
  readMascotFrameHoldMs,
  resolveMascotFigureKey,
  resolveMascotPointingKey,
  type MascotAtlas,
} from "@/lib/assistant/mascot-atlas.schemas";
import { selectPointingDirection, type MascotExpression } from "@/lib/assistant/mascot-expressions";
import {
  MASCOT_DISPLAY_SCALE_BY_SIZE,
  MASCOT_DOCK_BOTTOM_OFFSET_DESKTOP_PX,
  MASCOT_DOCK_BOTTOM_OFFSET_MOBILE_PX,
  MASCOT_MOBILE_BREAKPOINT_PX,
  MASCOT_SPEED_MULTIPLIER,
} from "@/lib/assistant/mascot-display";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";

type PixiModule = typeof PixiNamespace;

export interface MascotController {
  /** A signal reaction: change expression, optionally go and stand on a perch. */
  readonly react: (reaction: MascotReaction) => void;
  /** A short expression for something the viewer did, such as asking a question. */
  readonly showInteractionMood: (expression: MascotExpression, holdMs: number) => void;
  /** Point toward a viewport point for a while ("it's over here"), then back to the mood. */
  readonly pointAt: (targetX: number, targetY: number, holdMs: number) => void;
  /** Call after a route change: a perch removed by navigation fires no event of its own. */
  readonly markLayoutDirty: () => void;
  readonly setDockSide: (dockSide: MascotDockSide) => void;
  /** The viewer's size and speed choices. Applied from the next frame, no remount. */
  readonly setAppearance: (appearance: { size: MascotSize; speed: MascotSpeed }) => void;
  /** Pointer drag, in viewport pixels. `endDrag` returns the side it will dock on. */
  readonly beginDrag: (pointerX: number, pointerY: number) => void;
  readonly dragTo: (pointerX: number, pointerY: number) => void;
  readonly endDrag: () => MascotDockSide;
  readonly destroy: () => void;
}

const DOCK_SIDE_OFFSET_MOBILE_PX = 12;
const DOCK_SIDE_OFFSET_DESKTOP_PX = 24;
const VIEWPORT_MARGIN_PX = 8;
/** The figure's base disc overlaps the perch's top edge by this much, so it reads as standing on it. */
const PERCH_SINK_PX = 4;
/** Exponential-approach time constant for a trip between dock and perch, at Normal speed. */
const TRAVEL_TIME_CONSTANT_MS = 140;
const ARRIVAL_DISTANCE_PX = 1;
const REDUCED_MOTION_FADE_IN_MS = 200;
const BOB_AMPLITUDE_PX = 2;
const BOB_PERIOD_MS = 2_800;
const POSE_CROSSFADE_MS = 240;
const MAXIMUM_FRAMES_PER_SECOND = 30;
/** On reaching a perch it points down at it this long before its reaction plays on. */
const ARRIVAL_POINTING_MS = 1_200;

interface ViewportPoint {
  x: number;
  y: number;
}

function arriveAt(destinationPerchId: string | null): MascotPlacement {
  return destinationPerchId === null
    ? { mode: "docked" }
    : { mode: "perched", perchId: destinationPerchId };
}

/** Reaching a perch: point down at it for a moment. Reaching home: stop pointing. */
function pointingOnArrival(
  destinationPerchId: string | null,
  nowMs: number,
): MascotPointing | null {
  return destinationPerchId === null
    ? null
    : { direction: "down", expiresAtMs: nowMs + ARRIVAL_POINTING_MS };
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
      return clampToViewport(perchReading.anchorX, perchReading.anchorY + PERCH_SINK_PX);
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
  initialDockSide,
  initialSize,
  initialSpeed,
}: {
  readonly pixi: PixiModule;
  readonly atlas: MascotAtlas;
  readonly canvasHost: HTMLElement;
  /** The fixed DOM box over the mascot: open button and speech bubble. Moved by transform. */
  readonly mascotBox: HTMLElement;
  readonly initialDockSide: MascotDockSide;
  readonly initialSize: MascotSize;
  readonly initialSpeed: MascotSpeed;
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

  const initialAnimationKey = resolveMascotFigureKey(atlas, AMBIENT_MASCOT_MOOD.expression);
  const initialTexture = readAnimationTextures(initialAnimationKey)[0] ?? pixi.Texture.EMPTY;
  const createFigureSprite = () => {
    const figureSprite = new pixi.Sprite(initialTexture);
    figureSprite.anchor.set(0.5, 1);
    return figureSprite;
  };
  // `incomingSprite` is the pose on screen; `outgoingSprite` only shows during a crossfade.
  const outgoingSprite = createFigureSprite();
  outgoingSprite.visible = false;
  const incomingSprite = createFigureSprite();

  const mascotContainer = new pixi.Container();
  mascotContainer.addChild(outgoingSprite, incomingSprite);
  application.stage.addChild(mascotContainer);

  // ---- state, all of it plain variables read and written by the tick ----

  const perchTracker = createPerchTracker();
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isReducedMotion = reducedMotionQuery.matches;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let isViewportDirty = false;
  let mascotSize = initialSize;
  let speedMultiplier = MASCOT_SPEED_MULTIPLIER[initialSpeed];
  const selectDisplayScale = () =>
    viewportWidth < MASCOT_MOBILE_BREAKPOINT_PX
      ? MASCOT_DISPLAY_SCALE_BY_SIZE[mascotSize].mobile
      : MASCOT_DISPLAY_SCALE_BY_SIZE[mascotSize].desktop;
  let mascotScale = selectDisplayScale();
  let dockSide = initialDockSide;

  let placement: MascotPlacement = { mode: "docked" };
  let mood: MascotMood = AMBIENT_MASCOT_MOOD;
  let pointing: MascotPointing | null = null;
  let perchAnchor: ViewportPoint | null = null;
  let dragPointerOffset: ViewportPoint = { x: 0, y: 0 };

  let shownAnimationKey = initialAnimationKey;
  let shownFrameIndex = 0;
  let shownFrameStartedMs = performance.now();
  let crossfadeStartedMs: number | null = null;

  const readBoxWidth = () => atlas.frameWidthPx * mascotScale;
  const readBoxHeight = () => atlas.frameHeightPx * mascotScale;

  const computeDockPoint = (): ViewportPoint => {
    const isMobileViewport = viewportWidth < MASCOT_MOBILE_BREAKPOINT_PX;
    const sideOffsetPx = isMobileViewport
      ? DOCK_SIDE_OFFSET_MOBILE_PX
      : DOCK_SIDE_OFFSET_DESKTOP_PX;
    const halfBoxWidth = readBoxWidth() / 2;
    return {
      x:
        dockSide === "left"
          ? sideOffsetPx + halfBoxWidth
          : viewportWidth - sideOffsetPx - halfBoxWidth,
      y:
        viewportHeight -
        (isMobileViewport
          ? MASCOT_DOCK_BOTTOM_OFFSET_MOBILE_PX
          : MASCOT_DOCK_BOTTOM_OFFSET_DESKTOP_PX),
    };
  };
  const mascotPosition: ViewportPoint = computeDockPoint();

  let lastWrittenBoxLeft = Number.NaN;
  let lastWrittenBoxTop = Number.NaN;
  let lastWrittenBoxWidth = Number.NaN;
  let lastWrittenBubbleSide = "";

  const clampToViewport = (anchorX: number, anchorY: number): ViewportPoint => ({
    x: Math.min(
      Math.max(anchorX, readBoxWidth() / 2 + VIEWPORT_MARGIN_PX),
      viewportWidth - readBoxWidth() / 2 - VIEWPORT_MARGIN_PX,
    ),
    y: Math.min(
      Math.max(anchorY, readBoxHeight() + VIEWPORT_MARGIN_PX),
      viewportHeight - VIEWPORT_MARGIN_PX,
    ),
  });

  // ---- pose clock ----

  const showPose = (nextTexture: PixiNamespace.Texture, nowMs: number) => {
    if (isReducedMotion) {
      incomingSprite.texture = nextTexture;
      incomingSprite.alpha = 1;
      outgoingSprite.visible = false;
      crossfadeStartedMs = null;
      return;
    }
    outgoingSprite.texture = incomingSprite.texture;
    outgoingSprite.alpha = 1;
    outgoingSprite.visible = true;
    incomingSprite.texture = nextTexture;
    incomingSprite.alpha = 0;
    crossfadeStartedMs = nowMs;
  };

  /** A pointing pose outranks the mood while it lasts; an atlas without one shows the mood. */
  const selectWantedAnimationKey = (): string => {
    const pointingKey =
      pointing === null ? null : resolveMascotPointingKey(atlas, pointing.direction);
    return pointingKey ?? resolveMascotFigureKey(atlas, mood.expression);
  };

  const advancePoseClock = (nowMs: number) => {
    const wantedAnimationKey = selectWantedAnimationKey();
    const animationTextures = readAnimationTextures(wantedAnimationKey);
    if (wantedAnimationKey !== shownAnimationKey) {
      shownAnimationKey = wantedAnimationKey;
      shownFrameIndex = 0;
      shownFrameStartedMs = nowMs;
      showPose(animationTextures[0] ?? incomingSprite.texture, nowMs);
    } else if (!isReducedMotion && animationTextures.length > 1) {
      const frameHoldMs = readMascotFrameHoldMs(atlas, shownAnimationKey) / speedMultiplier;
      if (nowMs - shownFrameStartedMs >= frameHoldMs) {
        shownFrameIndex = (shownFrameIndex + 1) % animationTextures.length;
        shownFrameStartedMs = nowMs;
        showPose(animationTextures[shownFrameIndex] ?? incomingSprite.texture, nowMs);
      }
    }

    if (crossfadeStartedMs !== null) {
      // A fast animation (dancing) must not spend its whole hold fading.
      const crossfadeMs = Math.min(
        POSE_CROSSFADE_MS,
        readMascotFrameHoldMs(atlas, shownAnimationKey) / speedMultiplier / 2,
      );
      const crossfadeProgress = Math.min(1, (nowMs - crossfadeStartedMs) / crossfadeMs);
      incomingSprite.alpha = crossfadeProgress;
      outgoingSprite.alpha = 1 - crossfadeProgress;
      if (crossfadeProgress >= 1) {
        outgoingSprite.visible = false;
        crossfadeStartedMs = null;
      }
    }
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
      mascotScale = selectDisplayScale();
      perchTracker.markDirty();
    }
    perchAnchor = selectPerchAnchor(perchReading, perchAnchor, clampToViewport);

    // PLACEMENT. A dragged mascot is wherever the pointer put it; nothing else moves it.
    if (placement.mode !== "dragged") {
      const destinationPerchId = perchAnchor === null ? null : perchTracker.targetPerchId();
      const destination = perchAnchor ?? computeDockPoint();
      const isFollowingCurrentSpot =
        (placement.mode === "perched" && placement.perchId === destinationPerchId) ||
        (placement.mode === "docked" && destinationPerchId === null);

      if (isFollowingCurrentSpot) {
        // Standing on a perch that scrolls, or docked in a window that resized: follow, no tween.
        mascotPosition.x = destination.x;
        mascotPosition.y = destination.y;
      } else if (isReducedMotion) {
        // Fade-jump: no travel, but arriving somewhere new is still legible.
        mascotPosition.x = destination.x;
        mascotPosition.y = destination.y;
        mascotContainer.alpha = 0;
        placement = arriveAt(destinationPerchId);
        pointing = pointingOnArrival(destinationPerchId, nowMs);
      } else {
        const approachFraction =
          1 - Math.exp(-ticker.deltaMS / (TRAVEL_TIME_CONSTANT_MS / speedMultiplier));
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
          pointing = pointingOnArrival(destinationPerchId, nowMs);
        } else {
          placement = { mode: "travelling", toPerchId: destinationPerchId };
          // On the way to a perch it points where it is going. Home is not worth pointing at.
          pointing =
            destinationPerchId === null
              ? null
              : {
                  direction: selectPointingDirection(
                    destination.x - mascotPosition.x,
                    destination.y - mascotPosition.y,
                  ),
                  expiresAtMs: null,
                };
        }
      }
    }

    // MOOD, and the pointing laid over it.
    if (mood.expiresAtMs !== null && mood.expiresAtMs <= nowMs) mood = AMBIENT_MASCOT_MOOD;
    if (pointing !== null && pointing.expiresAtMs !== null && pointing.expiresAtMs <= nowMs) {
      pointing = null;
    }

    // WRITES, canvas first.
    advancePoseClock(nowMs);
    const isFloating = placement.mode === "docked" || placement.mode === "travelling";
    const bobOffsetPx =
      isFloating && !isReducedMotion
        ? Math.sin(((nowMs * speedMultiplier) / BOB_PERIOD_MS) * Math.PI * 2) * BOB_AMPLITUDE_PX
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
    const boxWidth = readBoxWidth();
    const boxHeight = readBoxHeight();
    const boxLeft = Math.round(mascotPosition.x - boxWidth / 2);
    const boxTop = Math.round(mascotPosition.y - boxHeight);
    if (boxLeft !== lastWrittenBoxLeft || boxTop !== lastWrittenBoxTop) {
      mascotBox.style.transform = `translate3d(${boxLeft}px, ${boxTop}px, 0)`;
      lastWrittenBoxLeft = boxLeft;
      lastWrittenBoxTop = boxTop;
    }
    if (boxWidth !== lastWrittenBoxWidth) {
      mascotBox.style.width = `${boxWidth}px`;
      mascotBox.style.height = `${boxHeight}px`;
      lastWrittenBoxWidth = boxWidth;
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
    // Re-enter the current expression at frame 0, the one reduced motion shows.
    shownAnimationKey = "";
  };

  window.addEventListener("resize", handleViewportResize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

  const applyMood = (incomingMood: MascotMood) => {
    if (canMoodReplace(incomingMood, mood, performance.now())) mood = incomingMood;
  };

  return {
    react: (reaction) => {
      const nowMs = performance.now();
      applyMood({
        expression: reaction.expression,
        priority: "signal",
        expiresAtMs: nowMs + reaction.holdMs,
      });
      if (reaction.perchId !== null && placement.mode !== "dragged") {
        perchTracker.track(reaction.perchId, nowMs);
      }
    },
    showInteractionMood: (expression, holdMs) => {
      applyMood({ expression, priority: "interaction", expiresAtMs: performance.now() + holdMs });
    },
    pointAt: (targetX, targetY, holdMs) => {
      if (placement.mode === "dragged") return;
      const mascotCenterY = mascotPosition.y - readBoxHeight() / 2;
      pointing = {
        direction: selectPointingDirection(targetX - mascotPosition.x, targetY - mascotCenterY),
        expiresAtMs: performance.now() + holdMs,
      };
    },
    markLayoutDirty: () => {
      perchTracker.markDirty();
    },
    setDockSide: (nextDockSide) => {
      dockSide = nextDockSide;
    },
    setAppearance: ({ size, speed }) => {
      mascotSize = size;
      speedMultiplier = MASCOT_SPEED_MULTIPLIER[speed];
      // The next frame re-reads the scale, resizes the box and re-clamps to the viewport.
      isViewportDirty = true;
    },
    beginDrag: (pointerX, pointerY) => {
      // Holding the mascot takes it off any perch: the viewer has said where they want it.
      perchTracker.untrack();
      perchAnchor = null;
      dragPointerOffset = { x: mascotPosition.x - pointerX, y: mascotPosition.y - pointerY };
      placement = { mode: "dragged" };
      pointing = null;
    },
    dragTo: (pointerX, pointerY) => {
      const draggedPosition = clampToViewport(
        pointerX + dragPointerOffset.x,
        pointerY + dragPointerOffset.y,
      );
      mascotPosition.x = draggedPosition.x;
      mascotPosition.y = draggedPosition.y;
    },
    endDrag: () => {
      dockSide = mascotPosition.x < viewportWidth / 2 ? "left" : "right";
      // Released anywhere, it glides to the dock on the nearer side.
      placement = { mode: "travelling", toPerchId: null };
      return dockSide;
    },
    destroy: () => {
      window.removeEventListener("resize", handleViewportResize);
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
