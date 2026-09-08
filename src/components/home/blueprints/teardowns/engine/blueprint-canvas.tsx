// TRANSPORT: props-only — the engine chunk's entry. THE ONLY MODULE GRAPH THAT IMPORTS
// `@react-three/fiber`, `@react-three/drei` and `three` at runtime on this surface, reachable
// solely through the `await import()` in `exploded-viewport.tsx`, so the ~half-megabyte of
// renderer never loads for a reader who does not scroll to a teardown with a model.
//
// WEBGL 2 THROUGH THE STOCK `WebGLRenderer`, by decision (see `todo.md` §1a): this scene is tens
// of parts and no compute, smoothness comes from the frame-loop design rather than the API, and one
// renderer in every browser beats two renderers and a fallback. Nothing here names `three/webgpu`.

"use client";

import { Bvh } from "@react-three/drei";
import { Canvas, type RootState } from "@react-three/fiber";
import { ACESFilmicToneMapping, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import CameraRig from "@/components/home/blueprints/teardowns/engine/camera-rig";
import ExplodedAssembly from "@/components/home/blueprints/teardowns/engine/exploded-assembly";
import type { ExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import HoverCursor from "@/components/home/blueprints/teardowns/engine/hover-cursor";

export { parseTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
export type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";

export interface BlueprintCanvasProps {
  readonly store: ExplosionStore;
  readonly loadedAssembly: LoadedTeardownAssembly;
  readonly stiffnessPerSecond: number;
  readonly onRendererFailed: (message: string) => void;
}

const OBSIDIAN = "#08090A";
const ENVIRONMENT_INTENSITY = 0.9;

export function BlueprintCanvas({
  store,
  loadedAssembly,
  stiffnessPerSecond,
  onRendererFailed,
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
        alpha: false,
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
      className="size-full"
    >
      <color attach="background" args={[OBSIDIAN]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 6]} intensity={1.4} />
      <directionalLight position={[-6, 3, -4]} intensity={0.45} color="#9DB4FF" />
      {/*
        NOT RAYCASTABLE. three's `Raycaster.params.Line.threshold` defaults to ONE METRE, and this
        scene is centimetres across, so every ray toward a callout pin would "hit" a grid line first
        and drei's occlusion test would hide every pin. The grid is decoration; nothing points at it.
      */}
      <gridHelper
        args={[radius * 6, 24, "#1F232B", "#14171C"]}
        position={[0, loadedAssembly.boundingBox.min.y - radius * 0.02, 0]}
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
    </Canvas>
  );
}
