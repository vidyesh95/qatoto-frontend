// TRANSPORT: props-only — the viewer's root. The assembly contract arrives from the server
// component; the engine chunk and the `.glb` file(s) are fetched on the client, in parallel, once
// the section scrolls near the screen. This is the ONLY file that names the engine chunk, and it
// does so through `await import()` inside an effect — the `three-dimensional-model-viewer.tsx`
// precedent — so a chunk that fails to load is an `error` VALUE rendered in place, not a boundary
// throw, and nothing three-shaped reaches this route's initial JavaScript.
//
// IT OWNS THE STORE because more than the canvas needs it: the tab bar drives the explosion, the
// part browser drives isolation, and the step list drives selection, and all three live outside
// the `<Canvas>`. Creating it here is what lets a click in the DOM move the model.
//
// THE PLACEHOLDER IS SERVER HTML. Unlike the store's viewer sheet, this island renders on the
// server, so nothing here may read `window` in a state initialiser; the reduced-motion and WebGL
// probes run inside the effect.

"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import type {
  FetchedModelFile,
  LoadedTeardownAssembly,
} from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import { createExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import AssemblyStepList from "@/components/home/blueprints/teardowns/sections/assembly-step-list";
import ExplosionSlider from "@/components/home/blueprints/teardowns/viewer/explosion-slider";
import PartBrowserRail from "@/components/home/blueprints/teardowns/viewer/part-browser-rail";
import TeardownStage from "@/components/home/blueprints/teardowns/viewer/teardown-stage";
import TeardownViewerTabs from "@/components/home/blueprints/teardowns/viewer/teardown-viewer-tabs";
import { useIsNearViewport } from "@/hooks/use-is-near-viewport";
import {
  EXPLOSION_STIFFNESS_PER_SECOND,
  REDUCED_MOTION_STIFFNESS_PER_SECOND,
} from "@/lib/blueprints/explosion";
import { formatFileSizeFromBytes } from "@/lib/blueprints/format";
import type { TeardownAssembly, TeardownAssemblyStep } from "@/lib/blueprints/schemas";
import {
  DEFAULT_TEARDOWN_VIEWER_TAB,
  TEARDOWN_VIEWER_TAB_LABELS,
  type TeardownViewerTab,
} from "@/lib/blueprints/viewer-tabs";
import { formatCountLabel } from "@/lib/store/format";

/** Type-level only; erased at build time, so it pulls nothing into this chunk. */
type TeardownEngineModule =
  typeof import("@/components/home/blueprints/teardowns/engine/blueprint-canvas");

type TeardownViewerState =
  | { readonly status: "idle" }
  | { readonly status: "loading-engine" }
  | { readonly status: "loading-model" }
  | {
      readonly status: "ready";
      readonly engine: TeardownEngineModule;
      readonly loadedAssembly: LoadedTeardownAssembly;
    }
  | { readonly status: "error"; readonly message: string };

export interface TeardownExplorerProps {
  readonly assembly: TeardownAssembly;
  readonly assemblySteps: readonly TeardownAssemblyStep[];
  readonly title: string;
  /**
   * The Specifications panel, rendered on the SERVER and handed in. The spec list, the
   * repairability index and the fastener table are all props-only server components, and passing
   * them through as a slot keeps them that way instead of dragging three panels into this island.
   */
  readonly specificationsSlot: ReactNode;
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

function StageStatusPill({ label }: { readonly label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="rounded-full border border-black/10 bg-white/85 px-3 py-1.5 font-mono text-[11px] text-foreground backdrop-blur">
        {label}
      </p>
    </div>
  );
}

function StageErrorPanel({ message }: { readonly message: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <p className="max-w-xs rounded-lg border border-black/10 bg-white/85 px-4 py-3 text-center text-xs leading-5 text-foreground backdrop-blur">
        {message}
      </p>
    </div>
  );
}

export default function TeardownExplorer({
  assembly,
  assemblySteps,
  title,
  specificationsSlot,
}: TeardownExplorerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useIsNearViewport(sectionRef, NEAR_VIEWPORT_ROOT_MARGIN_PX);
  const [store] = useState(() => createExplosionStore());
  const [viewerState, setViewerState] = useState<TeardownViewerState>({ status: "idle" });
  const [stiffnessPerSecond, setStiffnessPerSecond] = useState(EXPLOSION_STIFFNESS_PER_SECOND);
  const [activeTab, setActiveTab] = useState<TeardownViewerTab>(DEFAULT_TEARDOWN_VIEWER_TAB);
  /**
   * Empty until the Components tab has been opened AND the bake has run, and the rail renders
   * exactly what it rendered before this feature when it is empty. A bake that fails, is skipped or
   * has not finished degrades to the previous design rather than to a broken one.
   */
  const [thumbnailsByPartId, setThumbnailsByPartId] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  /**
   * STICKY, not `activeTab === "components"`: switching away must not un-request a bake that has
   * already been paid for, and the rail keeps its thumbnails when the reader comes back.
   *
   * SET FROM THE TAB EVENT rather than from the tab effect below, which is where it first sat. A
   * `setState` inside an effect is a second render chasing the first, and `react(set-state-in-effect)`
   * says so. The initialiser covers the case the event cannot: a default tab of "components".
   */
  const [isThumbnailBakeRequested, setIsThumbnailBakeRequested] = useState(
    () => DEFAULT_TEARDOWN_VIEWER_TAB === "components",
  );

  function handleTabChange(tab: TeardownViewerTab): void {
    setActiveTab(tab);
    if (tab === "components") setIsThumbnailBakeRequested(true);
  }

  const modelFiles = listAssemblyModelFiles(assembly);
  const totalModelByteSize = modelFiles.reduce((sum, file) => sum + file.byteSize, 0);
  const hasStressRatings = assembly.parts.some((part) => part.stressRating !== null);
  const isReady = viewerState.status === "ready";

  // Deps are the gate and the contract — NOT `viewerState`, or this cleanup would abort the
  // in-flight download on every transition it causes.
  useEffect(() => {
    if (!isNearViewport) return undefined;
    const abortController = new AbortController();
    let isMounted = true;
    const filesToFetch = listAssemblyModelFiles(assembly);

    async function loadEngineAndModel(): Promise<void> {
      if (!isWebGl2Available()) {
        setViewerState({
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
      setViewerState({ status: "loading-engine" });

      // The model bytes download while the engine chunk does; neither waits for the other.
      const fetchedBytesPromise = Promise.all(
        filesToFetch.map((file) => fetchModelBytes(file.url, abortController.signal)),
      );

      let engine: TeardownEngineModule;
      try {
        engine = await import("@/components/home/blueprints/teardowns/engine/blueprint-canvas");
      } catch {
        if (isMounted) {
          setViewerState({ status: "error", message: "The 3D engine could not be loaded." });
        }
        return;
      }
      if (!isMounted) return;
      setViewerState({ status: "loading-model" });

      const fetchedBytes = await fetchedBytesPromise;
      if (!isMounted) return;
      const files: FetchedModelFile[] = [];
      for (const [index, file] of filesToFetch.entries()) {
        const bytes = fetchedBytes[index];
        if (bytes === null || bytes === undefined) {
          setViewerState({
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
      setViewerState(
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
    if (viewerState.status !== "ready") return undefined;
    const { loadedAssembly } = viewerState;
    return () => loadedAssembly.dispose();
  }, [viewerState]);

  /**
   * THE TAB IS THE VIEWER'S MODE, and this is where it becomes model state. The reference treats
   * its exploded view as a destination rather than a slider position, and that reads better: the
   * assembly opens on arrival and closes on the way out, so the tab label is always true of what
   * is on screen. The slider stays for scrubbing once you are there.
   */
  useEffect(() => {
    store.setTargetFactor(activeTab === "exploded" ? 1 : 0);
    store.setPinsEnabled(activeTab === "exploded");
    store.setIsolationEnabled(activeTab === "components");
    // A selection isolates in one tab and frames the camera in another; carrying it across reads
    // as the viewer having been left switched on.
    store.selectPart(null);
  }, [activeTab, store]);

  function handleRendererFailed(message: string): void {
    setViewerState({ status: "error", message });
  }

  function renderStageBody() {
    switch (viewerState.status) {
      case "idle":
        return null;
      case "loading-engine":
        return <StageStatusPill label="Loading 3D engine…" />;
      case "loading-model":
        return (
          <StageStatusPill
            label={`Loading 3D model (${formatFileSizeFromBytes(totalModelByteSize)})…`}
          />
        );
      case "ready": {
        const { BlueprintCanvas } = viewerState.engine;
        return (
          <BlueprintCanvas
            store={store}
            loadedAssembly={viewerState.loadedAssembly}
            stiffnessPerSecond={stiffnessPerSecond}
            onRendererFailed={handleRendererFailed}
            isThumbnailBakeRequested={isThumbnailBakeRequested}
            onThumbnailsBaked={setThumbnailsByPartId}
          />
        );
      }
      case "error":
        return <StageErrorPanel message={viewerState.message} />;
      default: {
        const exhaustiveCheck: never = viewerState;
        return exhaustiveCheck;
      }
    }
  }

  function renderTabPanel() {
    switch (activeTab) {
      case "design":
        return (
          <p className="text-sm leading-6 text-[#6F7979]">
            {formatCountLabel(assembly.parts.length)} parts modelled ·{" "}
            {formatFileSizeFromBytes(totalModelByteSize)} · drag to orbit, scroll to zoom.
          </p>
        );
      case "exploded":
        return (
          <div className="space-y-4">
            <ExplosionSlider store={store} isInteractive={isReady} initialFactor={1} />
            <AssemblyStepList steps={assemblySteps} store={store} />
          </div>
        );
      case "components":
        return (
          <PartBrowserRail
            store={store}
            parts={assembly.parts}
            isInteractive={isReady}
            thumbnailsByPartId={thumbnailsByPartId}
          />
        );
      case "specifications":
        return specificationsSlot;
      default: {
        const exhaustiveCheck: never = activeTab;
        return exhaustiveCheck;
      }
    }
  }

  const missingNodeNames = isReady ? viewerState.loadedAssembly.missingNodeNames : [];

  return (
    <section ref={sectionRef} aria-label={`${title}, 3D viewer`} className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">3D viewer</h2>
        <TeardownViewerTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          availableTabs={["design", "exploded", "components", "specifications"]}
        />
      </div>

      <div className="mt-2">
        <TeardownStage
          store={store}
          stageRef={stageRef}
          isInteractive={isReady}
          hasStressRatings={hasStressRatings}
        >
          {renderStageBody()}
        </TeardownStage>
      </div>

      {missingNodeNames.length === 0 ? null : (
        <p className="mt-2 text-[11px] text-[#B45309]">
          Not found in the model: {missingNodeNames.join(", ")}
        </p>
      )}

      <div
        role="tabpanel"
        id={`teardown-viewer-panel-${activeTab}`}
        aria-labelledby={`teardown-viewer-tab-${activeTab}`}
        aria-label={TEARDOWN_VIEWER_TAB_LABELS[activeTab]}
        className="mt-4"
      >
        {renderTabPanel()}
      </div>
    </section>
  );
}
