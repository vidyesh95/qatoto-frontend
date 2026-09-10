// TRANSPORT: props-only — the engine chunk's entry. THE ONLY MODULE GRAPH THAT IMPORTS
// `@react-three/fiber`, `@react-three/drei` and `three` at runtime on this surface, reachable
// solely through the `await import()` in `exploded-viewport.tsx`, so the ~half-megabyte of
// renderer never loads for a reader who does not scroll to a teardown with a model.
//
// WEBGL 2 THROUGH THE STOCK `WebGLRenderer`, by decision (see `todo.md` §1a): this scene is tens
// of parts and no compute, smoothness comes from the frame-loop design rather than the API, and one
// renderer in every browser beats two renderers and a fallback. Nothing here names `three/webgpu`.

"use client";

import { Bvh, ContactShadows } from "@react-three/drei";
import { Canvas, type RootState } from "@react-three/fiber";
import { ACESFilmicToneMapping, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import CameraRig from "@/components/home/blueprints/teardowns/engine/camera-rig";
import ExplodedAssembly from "@/components/home/blueprints/teardowns/engine/exploded-assembly";
import type { ExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import HoverCursor from "@/components/home/blueprints/teardowns/engine/hover-cursor";
import PartThumbnailBaker, {
  CONTACT_SHADOW_OBJECT_NAME,
} from "@/components/home/blueprints/teardowns/engine/part-thumbnail-baker";

export { parseTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
export type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";

export interface BlueprintCanvasProps {
  readonly store: ExplosionStore;
  readonly loadedAssembly: LoadedTeardownAssembly;
  readonly stiffnessPerSecond: number;
  readonly onRendererFailed: (message: string) => void;
  /** True once the Components tab has been opened. Threaded, not inferred — see the baker. */
  readonly isThumbnailBakeRequested: boolean;
  readonly onThumbnailsBaked: (thumbnailsByPartId: ReadonlyMap<string, string>) => void;
}

const ENVIRONMENT_INTENSITY = 0.9;

export function BlueprintCanvas({
  store,
  loadedAssembly,
  stiffnessPerSecond,
  onRendererFailed,
  isThumbnailBakeRequested,
  onThumbnailsBaked,
}: BlueprintCanvasProps) {
  const radius = loadedAssembly.boundingSphere.radius;

  function handleCanvasCreated(state: RootState): void {
    // Studio lighting from local code — drei's `<Environment preset>` would fetch an HDR from a
    // CDN, which this repo does not allow.
    const pmremGenerator = new PMREMGenerator(state.gl);
    state.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    state.scene.environmentIntensity = ENVIRONMENT_INTENSITY;
    pmremGenerator.dispose();

    state.gl.domElement.addEventListener("webglcontextlost", (event) => {
      // R3F forces a context loss when it unmounts the canvas, and by then React has already taken
      // the element out of the document. That is a teardown, not a failure.
      if (!state.gl.domElement.isConnected) return;
      event.preventDefault();
      onRendererFailed("The graphics context was lost. Reload the page to try again.");
    });
  }

  function handleCanvasPointerMissed(): void {
    store.selectPart(null);
  }

  return (
    <Canvas
      gl={{
        antialias: true,
        // TRANSPARENT, because the stage is painted in CSS behind the canvas rather than by a
        // clear colour. That is what lets the vignette and the grid be a background image the
        // renderer never touches — and it is why there is no `gridHelper` here any more.
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      frameloop="demand"
      dpr={[1, 2]}
      camera={{
        fov: 35,
        near: radius * 0.02,
        far: radius * 60,
        position: [radius * 2.2, radius * 1.4, radius * 2.6],
      }}
      onCreated={handleCanvasCreated}
      onPointerMissed={handleCanvasPointerMissed}
      // `touch-pan-y!` IS THE PAGE'S SCROLL, AND THE `!` IS LOAD-BEARING. camera-controls writes
      // `touch-action: none` inline on this wrapper in `connect()` and again every time its
      // `enabled` flag flips, so a plain class loses to it and a phone could not scroll past the
      // stage. `pan-y` leaves the browser the one-finger vertical swipe; the viewer's own gestures
      // are two-fingered and cancel themselves (`use-camera-gestures`).
      className="size-full touch-pan-y!"
    >
      {/*
        LIT FOR A WHITE GROUND. `RoomEnvironment` already supplies most of the fill, so the ambient
        term is low and the key is soft — turn either up and the shells blow out to flat white,
        which is the failure mode of every product shot on a light stage.
      */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <directionalLight position={[-6, 3, -4]} intensity={0.3} color="#9DB4FF" />
      {/*
        The soft ground shadow is what stops the model floating.
        ⚠️ IT REDRAWS EVERY FRAME, and `frames={1}` is wrong here even though it is cheaper. Parts
        move under the explosion slider and vanish under isolation, and a shadow baked once kept
        showing the whole closed assembly beneath a single isolated part — a dark cloud with
        nothing casting it. The resolution is dropped instead: this is a depth pass over a handful
        of meshes, and the on-demand loop means it only runs on frames something else already
        needed.
        It does not raycast, for the reason the 3D grid it replaced had to go — three's
        `Raycaster.params.Line.threshold` is ONE METRE against a scene centimetres across, so any
        full-stage plane swallows every callout pin's occlusion ray.
      */}
      <ContactShadows
        // Named so the thumbnail baker can hide it for its pass. A shadow of the whole assembly
        // under one isolated part is the exact artefact this name prevents.
        name={CONTACT_SHADOW_OBJECT_NAME}
        position={[0, loadedAssembly.boundingBox.min.y - radius * 0.02, 0]}
        scale={radius * 3.4}
        opacity={0.38}
        blur={2.6}
        far={radius * 1.6}
        resolution={256}
        color="#1F2937"
        raycast={() => undefined}
      />
      <Bvh firstHitOnly>
        <ExplodedAssembly
          store={store}
          loadedAssembly={loadedAssembly}
          stiffnessPerSecond={stiffnessPerSecond}
        />
      </Bvh>
      <CameraRig store={store} loadedAssembly={loadedAssembly} />
      <HoverCursor store={store} />
      <PartThumbnailBaker
        loadedAssembly={loadedAssembly}
        isRequested={isThumbnailBakeRequested}
        onThumbnailsBaked={onThumbnailsBaked}
      />
    </Canvas>
  );
}
