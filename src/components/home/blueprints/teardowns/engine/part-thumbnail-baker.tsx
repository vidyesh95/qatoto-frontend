// TRANSPORT: props-only — renders nothing, produces images. Lives inside the `<Canvas>` because it
// needs the live renderer and scene, which only R3F's context hands out.

"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  Box3,
  type Material,
  NoToneMapping,
  OrthographicCamera,
  Sphere,
  type Scene,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";

export interface PartThumbnailBakerProps {
  readonly loadedAssembly: LoadedTeardownAssembly;
  /**
   * False until the reader opens the Components tab. A bake is several dozen extra draw calls and
   * a `readRenderTargetPixels` per part — cheap once, and entirely wasted on the majority of
   * readers who never open the tab that shows them.
   */
  readonly isRequested: boolean;
  readonly onThumbnailsBaked: (thumbnailsByPartId: ReadonlyMap<string, string>) => void;
}

/** The name `blueprint-canvas.tsx` gives its `<ContactShadows>`, so this can find and hide it. */
export const CONTACT_SHADOW_OBJECT_NAME = "teardown_contact_shadow";

const THUMBNAIL_PIXELS = 256;
/** Multisampling on the render target — the readback has no browser antialiasing of its own. */
const THUMBNAIL_SAMPLES = 4;
/** Slack around the part's bounding sphere, so nothing touches the frame edge. */
const FRAME_PADDING_MULTIPLE = 1.12;
/** How far back the orthographic camera sits. Distance does not affect scale; it affects clipping. */
const CAMERA_DISTANCE_MULTIPLE = 4;
const WEBP_QUALITY = 0.82;

/**
 * The stage's own three-quarter angle, normalised. Baking each part from the SAME direction the
 * viewer looks from is what makes a rail thumbnail recognisable as the thing that lights up in the
 * stage when you click it. Bake from an axis instead and a reader gets a silhouette they cannot
 * match to anything on screen.
 */
const BAKE_DIRECTION = new Vector3(2.2, 1.4, 2.6).normalize();

function toMaterialList(material: Material | Material[]): Material[] {
  return Array.isArray(material) ? material : [material];
}

/**
 * ⚠️ GL'S ORIGIN IS BOTTOM-LEFT AND `ImageData`'S IS TOP-LEFT. Skip this and every thumbnail comes
 * out upside down — the classic tell of a readback pasted straight onto a 2D canvas. Copying row by
 * row from the back is cheaper and clearer than transforming the canvas afterwards.
 */
function flipPixelRows(
  pixels: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const bytesPerRow = width * 4;
  // The buffer is constructed explicitly because `ImageData` will not take a view over a
  // `SharedArrayBuffer`, and the bare-length constructor is typed as either.
  const flipped = new Uint8ClampedArray(new ArrayBuffer(pixels.length));
  for (let row = 0; row < height; row += 1) {
    const sourceStart = (height - 1 - row) * bytesPerRow;
    flipped.set(pixels.subarray(sourceStart, sourceStart + bytesPerRow), row * bytesPerRow);
  }
  return flipped;
}

/**
 * One render pass per part, into an offscreen target, read back as a data URL.
 *
 * WHY A BAKE AND NOT A SECOND `<Canvas>` PER ROW. A rail of nine live canvases is nine WebGL
 * contexts — browsers cap that at around sixteen and silently kill the oldest — nine copies of the
 * geometry, and nine frame loops competing with the one that matters. One pass over the model
 * already in memory produces the same pictures and costs a few milliseconds, once.
 *
 * THE BACKGROUND IS TRANSPARENT AND THAT IS FREE. The renderer is `alpha: true` because the stage
 * is painted in CSS behind it, so the readback's alpha channel is already a cut-out. The rail can
 * sit a thumbnail on any ground without a matte.
 *
 * ⚠️ IT BAKES WHATEVER MATERIAL IS CURRENTLY ASSIGNED. Open the Components tab with the stress heat
 * map switched on and the thumbnails are heat maps. That is arguably right — they match the stage —
 * and it is recorded here because it is a surprise otherwise. What it does NOT inherit is a
 * half-faded opacity: the isolation animation is mid-flight when the tab opens, so this forces every
 * material opaque for the pass and puts it back after.
 *
 * ⚠️ MODULE LEVEL, NOT INSIDE THE COMPONENT, and the reason is the linter rather than taste. The
 * bake mutates `visible` and `opacity` on objects that arrive as a prop and on the renderer that
 * arrives from `useThree`; `react(immutability)` rejects that written inside a component body,
 * because from its point of view a component must not write to what it was handed. It is right in
 * general and wrong here: a scene graph is an external system this file drives, exactly as
 * `advanceExplosionFrame` and `applyCanvasCursor` already are. Hoisting says so structurally.
 *
 * Every mutation below is undone before it returns. The scene it hands back is the scene it got.
 */
function bakePartThumbnails(
  gl: WebGLRenderer,
  scene: Scene,
  loadedAssembly: LoadedTeardownAssembly,
): ReadonlyMap<string, string> {
  const thumbnailsByPartId = new Map<string, string>();

  const imageCanvas = document.createElement("canvas");
  imageCanvas.width = THUMBNAIL_PIXELS;
  imageCanvas.height = THUMBNAIL_PIXELS;
  const imageContext = imageCanvas.getContext("2d");
  if (imageContext === null) return thumbnailsByPartId;

  const target = new WebGLRenderTarget(THUMBNAIL_PIXELS, THUMBNAIL_PIXELS, {
    samples: THUMBNAIL_SAMPLES,
  });
  const camera = new OrthographicCamera();
  const readbackPixels = new Uint8Array(THUMBNAIL_PIXELS * THUMBNAIL_PIXELS * 4);

  // ⚠️ THE CONTACT SHADOW IS A SCENE OBJECT, so leaving it visible bakes the whole assembly's
  // shadow under a single isolated part — a dark cloud with nothing casting it. The same artefact
  // the stage itself hit when that shadow was cached with `frames={1}`.
  const contactShadow = scene.getObjectByName(CONTACT_SHADOW_OBJECT_NAME);
  const wasContactShadowVisible = contactShadow?.visible ?? false;
  const partVisibility = loadedAssembly.parts.map((loadedPart) => loadedPart.object.visible);

  // The isolation fade is mid-flight when the Components tab opens, so a part caught at 0.4 opacity
  // would bake as a ghost. Forced opaque for the pass, restored from this map after.
  const materialOpacities = new Map<Material, number>();
  for (const loadedPart of loadedAssembly.parts) {
    for (const mesh of loadedPart.meshes) {
      for (const material of toMaterialList(mesh.material)) {
        if (!materialOpacities.has(material)) materialOpacities.set(material, material.opacity);
        material.opacity = 1;
      }
    }
  }

  // Tone mapping is the stage's look, not the thumbnail's: applied to a 256px cut-out on a light
  // rail it washes the part out.
  const previousToneMapping = gl.toneMapping;
  const previousRenderTarget = gl.getRenderTarget();
  if (contactShadow !== undefined) contactShadow.visible = false;
  for (const loadedPart of loadedAssembly.parts) loadedPart.object.visible = false;
  gl.toneMapping = NoToneMapping;

  const partBox = new Box3();
  const partSphere = new Sphere();
  loadedAssembly.root.updateMatrixWorld(true);

  for (const loadedPart of loadedAssembly.parts) {
    loadedPart.object.visible = true;

    partBox.setFromObject(loadedPart.object, true);
    partBox.getBoundingSphere(partSphere);
    const halfExtent = Math.max(partSphere.radius, Number.EPSILON) * FRAME_PADDING_MULTIPLE;

    camera.position
      .copy(BAKE_DIRECTION)
      .multiplyScalar(halfExtent * CAMERA_DISTANCE_MULTIPLE)
      .add(partSphere.center);
    camera.lookAt(partSphere.center);
    camera.left = -halfExtent;
    camera.right = halfExtent;
    camera.top = halfExtent;
    camera.bottom = -halfExtent;
    camera.near = 0.01;
    camera.far = halfExtent * (CAMERA_DISTANCE_MULTIPLE + 2);
    camera.updateProjectionMatrix();

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.readRenderTargetPixels(target, 0, 0, THUMBNAIL_PIXELS, THUMBNAIL_PIXELS, readbackPixels);

    imageContext.clearRect(0, 0, THUMBNAIL_PIXELS, THUMBNAIL_PIXELS);
    imageContext.putImageData(
      new ImageData(
        flipPixelRows(readbackPixels, THUMBNAIL_PIXELS, THUMBNAIL_PIXELS),
        THUMBNAIL_PIXELS,
        THUMBNAIL_PIXELS,
      ),
      0,
      0,
    );
    thumbnailsByPartId.set(loadedPart.part.id, imageCanvas.toDataURL("image/webp", WEBP_QUALITY));

    loadedPart.object.visible = false;
  }

  gl.setRenderTarget(previousRenderTarget);
  gl.toneMapping = previousToneMapping;
  for (const [index, loadedPart] of loadedAssembly.parts.entries()) {
    loadedPart.object.visible = partVisibility[index] ?? true;
  }
  for (const [material, opacity] of materialOpacities) material.opacity = opacity;
  if (contactShadow !== undefined) contactShadow.visible = wasContactShadowVisible;
  target.dispose();

  return thumbnailsByPartId;
}

export default function PartThumbnailBaker({
  loadedAssembly,
  isRequested,
  onThumbnailsBaked,
}: PartThumbnailBakerProps) {
  const { gl, scene } = useThree();
  const hasBakedRef = useRef(false);

  useEffect(() => {
    if (!isRequested || hasBakedRef.current) return;
    hasBakedRef.current = true;
    onThumbnailsBaked(bakePartThumbnails(gl, scene, loadedAssembly));
  }, [isRequested, loadedAssembly, gl, scene, onThumbnailsBaked]);

  return null;
}
