// TRANSPORT: props-only — the island root. The assembly contract arrives from the server
// component; the engine chunk and the `.glb` file(s) are fetched on the client, in parallel, once
// the section scrolls near the screen. This is the ONLY file that names the engine chunk, and it
// does so through `await import()` inside an effect — the `three-dimensional-model-viewer.tsx`
// precedent — so a chunk that fails to load is an `error` VALUE rendered in place, not a boundary
// throw, and nothing three-shaped is in this route's initial JavaScript.
//
// THE PLACEHOLDER IS SERVER HTML. Unlike the store's viewer sheet, this island renders on the
// server (the `idle` frame and the disabled HUD), so nothing here may read `window` in a state
// initialiser; the reduced-motion and WebGL probes run inside the effect.

"use client";

import { useEffect, useRef, useState } from "react";

import type {
  FetchedModelFile,
  LoadedTeardownAssembly,
} from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import { createExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import ViewportHud, {
  TelemetryStrip,
} from "@/components/home/blueprints/teardowns/engine/viewport-hud";
import { useIsNearViewport } from "@/hooks/use-is-near-viewport";
import {
  EXPLOSION_STIFFNESS_PER_SECOND,
  REDUCED_MOTION_STIFFNESS_PER_SECOND,
} from "@/lib/blueprints/explosion";
import { formatFileSizeFromBytes } from "@/lib/blueprints/format";
import { formatCountLabel } from "@/lib/store/format";
import type { TeardownAssembly, TeardownSimulationTelemetry } from "@/lib/blueprints/schemas";

/** Type-level only; erased at build time, so it pulls nothing into this chunk. */
type TeardownEngineModule =
  typeof import("@/components/home/blueprints/teardowns/engine/blueprint-canvas");

type ExplodedViewportState =
  | { readonly status: "idle" }
  | { readonly status: "loading-engine" }
  | { readonly status: "loading-model" }
  | {
      readonly status: "ready";
      readonly engine: TeardownEngineModule;
      readonly loadedAssembly: LoadedTeardownAssembly;
    }
  | { readonly status: "error"; readonly message: string };

export interface ExplodedViewportProps {
  readonly assembly: TeardownAssembly;
  readonly simulationTelemetry: TeardownSimulationTelemetry | null;
  readonly title: string;
}

/** Start downloading this far before the section is on screen. */
const NEAR_VIEWPORT_ROOT_MARGIN_PX = 600;

interface AssemblyModelFile {
  readonly url: string;
  readonly byteSize: number;
}

function listAssemblyModelFiles(assembly: TeardownAssembly): AssemblyModelFile[] {
  switch (assembly.kind) {
    case "composite":
      return [assembly.model];
    case "individual_parts":
      return assembly.parts.map((part) => part.model);
    default: {
      const exhaustiveCheck: never = assembly;
      return exhaustiveCheck;
    }
  }
}

function isWebGl2Available(): boolean {
  return document.createElement("canvas").getContext("webgl2") !== null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** `null` on any failure, including an abort — the caller knows whether it is still mounted. */
async function fetchModelBytes(url: string, signal: AbortSignal): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, { signal });
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function ViewportStatusPill({ label }: { readonly label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="rounded-full border border-white/10 bg-[#0F1115]/85 px-3 py-1.5 font-mono text-[11px] text-white">
        {label}
      </p>
    </div>
  );
}

function ViewportErrorPanel({ message }: { readonly message: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <p className="max-w-xs rounded-lg border border-white/10 bg-[#0F1115]/85 px-4 py-3 text-center text-xs leading-5 text-white">
        {message}
      </p>
    </div>
  );
}

export default function ExplodedViewport({
  assembly,
  simulationTelemetry,
  title,
}: ExplodedViewportProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isNearViewport = useIsNearViewport(sectionRef, NEAR_VIEWPORT_ROOT_MARGIN_PX);
  const [store] = useState(() => createExplosionStore());
  const [viewportState, setViewportState] = useState<ExplodedViewportState>({ status: "idle" });
  const [stiffnessPerSecond, setStiffnessPerSecond] = useState(EXPLOSION_STIFFNESS_PER_SECOND);

  const modelFiles = listAssemblyModelFiles(assembly);
  const totalModelByteSize = modelFiles.reduce((sum, file) => sum + file.byteSize, 0);

  // Deps are the gate and the contract — NOT `viewportState`, or this cleanup would abort the
  // in-flight download on every transition it causes.
  useEffect(() => {
    if (!isNearViewport) return undefined;
    const abortController = new AbortController();
    let isMounted = true;
    const filesToFetch = listAssemblyModelFiles(assembly);

    async function loadEngineAndModel(): Promise<void> {
      if (!isWebGl2Available()) {
        setViewportState({
          status: "error",
          message: "This browser cannot display 3D models. WebGL 2 is required.",
        });
        return;
      }
      setStiffnessPerSecond(
        prefersReducedMotion()
          ? REDUCED_MOTION_STIFFNESS_PER_SECOND
          : EXPLOSION_STIFFNESS_PER_SECOND,
      );
      setViewportState({ status: "loading-engine" });

      // The model bytes download while the engine chunk does; neither waits for the other.
      const fetchedBytesPromise = Promise.all(
        filesToFetch.map((file) => fetchModelBytes(file.url, abortController.signal)),
      );

      let engine: TeardownEngineModule;
      try {
        engine = await import("@/components/home/blueprints/teardowns/engine/blueprint-canvas");
      } catch {
        if (isMounted) {
          setViewportState({ status: "error", message: "The 3D engine could not be loaded." });
        }
        return;
      }
      if (!isMounted) return;
      setViewportState({ status: "loading-model" });

      const fetchedBytes = await fetchedBytesPromise;
      if (!isMounted) return;
      const files: FetchedModelFile[] = [];
      for (const [index, file] of filesToFetch.entries()) {
        const bytes = fetchedBytes[index];
        if (bytes === null || bytes === undefined) {
          setViewportState({
            status: "error",
            message:
              filesToFetch.length === 1
                ? "This 3D model could not be downloaded."
                : `One of the ${formatCountLabel(filesToFetch.length)} part files could not be downloaded.`,
          });
          return;
        }
        files.push({ url: file.url, bytes });
      }

      const parsed = await engine.parseTeardownAssembly(files, assembly);
      if (!isMounted) {
        if (parsed.success) parsed.loadedAssembly.dispose();
        return;
      }
      setViewportState(
        parsed.success
          ? { status: "ready", engine, loadedAssembly: parsed.loadedAssembly }
          : { status: "error", message: parsed.error.message },
      );
    }

    void loadEngineAndModel();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isNearViewport, assembly]);

  // The island owns disposal; the canvas's primitives carry `dispose={null}`.
  useEffect(() => {
    if (viewportState.status !== "ready") return undefined;
    const { loadedAssembly } = viewportState;
    return () => loadedAssembly.dispose();
  }, [viewportState]);

  function handleRendererFailed(message: string): void {
    setViewportState({ status: "error", message });
  }

  function renderViewportBody() {
    switch (viewportState.status) {
      case "idle":
        return null;
      case "loading-engine":
        return <ViewportStatusPill label="Loading 3D engine…" />;
      case "loading-model":
        return (
          <ViewportStatusPill
            label={`Loading 3D model (${formatFileSizeFromBytes(totalModelByteSize)})…`}
          />
        );
      case "ready": {
        const { BlueprintCanvas } = viewportState.engine;
        return (
          <BlueprintCanvas
            store={store}
            loadedAssembly={viewportState.loadedAssembly}
            stiffnessPerSecond={stiffnessPerSecond}
            onRendererFailed={handleRendererFailed}
          />
        );
      }
      case "error":
        return <ViewportErrorPanel message={viewportState.message} />;
      default: {
        const exhaustiveCheck: never = viewportState;
        return exhaustiveCheck;
      }
    }
  }

  const missingNodeNames =
    viewportState.status === "ready" ? viewportState.loadedAssembly.missingNodeNames : [];

  return (
    <section ref={sectionRef} aria-label={`${title}, exploded view`} className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Exploded view</h2>
      <p className="mt-0.5 text-[11px] text-[#6F7979]">
        {formatCountLabel(assembly.parts.length)} parts modelled ·{" "}
        {formatFileSizeFromBytes(totalModelByteSize)} · drag to orbit, scroll to zoom, click a part
        to frame it
      </p>
      <div className="mt-2 max-w-3xl overflow-hidden rounded-xl border border-black/5">
        <div className="relative isolate aspect-[16/10] w-full bg-[#08090A] lg:aspect-[21/10]">
          {renderViewportBody()}
          <ViewportHud
            store={store}
            assembly={assembly}
            isInteractive={viewportState.status === "ready"}
            missingNodeNames={missingNodeNames}
          />
        </div>
        <TelemetryStrip telemetry={simulationTelemetry} />
      </div>
    </section>
  );
}
