// TRANSPORT: props-only — the model URL arrives on the product read; the viewer library is fetched
// on mount, and this component mounts only after the buyer opens the sheet.
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ModelViewerElement } from "@google/model-viewer";

/**
 * The orbit viewer behind "View in 360º" (A47).
 *
 * THIS IS THE ONLY FILE THAT NAMES `@google/model-viewer` AT RUNTIME, AND ONLY INSIDE AN EFFECT.
 * The package is a side-effect module: evaluating it subclasses `HTMLElement` and calls
 * `customElements.define("model-viewer")`, so a top-level import in ANY `"use client"` file still
 * runs during server rendering and throws `HTMLElement is not defined`. `next/dynamic` with
 * `ssr: false` would avoid that too, but it turns a failed chunk load into a throw for an error
 * boundary; here it is an `error` value the overlay renders. Nothing from three.js reaches the
 * product page's bundle: the sheet that renders this exists only after the click, and the import
 * happens after that.
 *
 * DRACO IS AN EXTERNAL AT VIEW TIME. A `.glb` compressed with `KHR_draco_mesh_compression` makes
 * model-viewer fetch its decoder from its default gstatic location. Most seller exports are not
 * Draco-compressed, there is no CSP to block it, and self-hosting means copying three files out of
 * `three/examples/jsm/libs/draco/gltf/` that drift on every `three` upgrade. If a CSP ever lands,
 * `ModelViewerElement.dracoDecoderLocation` is the one assignment to make.
 *
 * EVENTS BY REF, NOT PROPS. React 19 would subscribe an `onLoad` prop to an event literally named
 * `"Load"`. See `src/types/model-viewer.d.ts`, which deliberately declares no `on*` props.
 *
 * NO SERVER HTML EXISTS FOR THIS COMPONENT, which is why `document` may be read in a state
 * initializer below: there is nothing to hydrate against.
 */
type ThreeDimensionalModelViewerState =
  | { readonly status: "loading-library" }
  | { readonly status: "loading-model" }
  | { readonly status: "ready" }
  | { readonly status: "error"; readonly message: string };

/** model-viewer's own default framing, restated so "Reset view" returns to exactly it. */
const DEFAULT_CAMERA_ORBIT = "0deg 75deg 105%";

export default function ThreeDimensionalModelViewer({
  modelUrl,
  posterImageUrl,
  alternateText,
}: {
  readonly modelUrl: string;
  /** The listing's first photo, shown until the mesh is in. Null when the seller has none. */
  readonly posterImageUrl: string | null;
  readonly alternateText: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modelViewerRef = useRef<ModelViewerElement>(null);
  const [viewerState, setViewerState] = useState<ThreeDimensionalModelViewerState>({
    status: "loading-library",
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  // False on iOS Safari, where `requestFullscreen` does not exist on arbitrary elements.
  const [canFullscreen] = useState(() => document.fullscreenEnabled);

  // Fetch the library once the sheet exists. The `isMounted` guard is the `video-player.tsx`
  // shape: a sheet closed before the chunk lands must not set state on an unmounted component.
  useEffect(() => {
    let isMounted = true;
    async function loadViewerLibrary() {
      try {
        await import("@google/model-viewer");
        if (isMounted) setViewerState({ status: "loading-model" });
      } catch {
        if (isMounted) {
          setViewerState({ status: "error", message: "The 3D viewer could not be loaded." });
        }
      }
    }
    void loadViewerLibrary();
    return () => {
      isMounted = false;
    };
  }, []);

  // `load` and `error` by ref, once the element exists — it renders from `loading-model` on.
  // `loaded` is checked first because the element starts fetching the instant it connects, and a
  // cached model can finish before this passive effect runs.
  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (viewerState.status === "loading-library" || !modelViewer) return undefined;
    const handleLoad = () => setViewerState({ status: "ready" });
    const handleError = () =>
      setViewerState({ status: "error", message: "This 3D model could not be displayed." });
    if (modelViewer.loaded) handleLoad();
    modelViewer.addEventListener("load", handleLoad);
    modelViewer.addEventListener("error", handleError);
    return () => {
      modelViewer.removeEventListener("load", handleLoad);
      modelViewer.removeEventListener("error", handleError);
    };
  }, [viewerState.status]);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function handleResetViewClick() {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;
    modelViewer.cameraOrbit = DEFAULT_CAMERA_ORBIT;
    modelViewer.cameraTarget = "auto auto auto";
    modelViewer.fieldOfView = "auto";
    modelViewer.resetTurntableRotation();
  }

  function handleFullscreenToggleClick() {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement === wrapper) {
      void document.exitFullscreen();
      return;
    }
    void wrapper.requestFullscreen();
  }

  const hasModelViewerElement = viewerState.status !== "loading-library";

  return (
    <div ref={wrapperRef} className="relative size-full bg-[#F5F5F5]">
      {/* The poster stands in while the LIBRARY loads; once the element exists it shows the same
          poster itself until the mesh is in. */}
      {!hasModelViewerElement && posterImageUrl !== null && (
        <Image
          src={posterImageUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 56rem, 100vw"
          className="object-contain"
        />
      )}

      {hasModelViewerElement && (
        <model-viewer
          ref={modelViewerRef}
          src={modelUrl}
          alt={alternateText}
          {...(posterImageUrl === null ? {} : { poster: posterImageUrl })}
          camera-controls
          auto-rotate
          interaction-prompt="auto"
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1"
          environment-image="neutral"
          loading="eager"
          className="block size-full"
        />
      )}

      {renderViewerOverlay(viewerState)}

      {hasModelViewerElement && viewerState.status !== "error" && (
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetViewClick}
            aria-label="Reset view"
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
          >
            <Image
              src="/icons/restart_alt_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
          </button>
          {canFullscreen && (
            <button
              type="button"
              onClick={handleFullscreenToggleClick}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
            >
              <Image
                src={
                  isFullscreen
                    ? "/icons/fullscreen_exit_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    : "/icons/fullscreen_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                }
                alt=""
                width={20}
                height={20}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** What sits over the viewer in each state. Exhaustive: a new variant is a compile error here. */
function renderViewerOverlay(viewerState: ThreeDimensionalModelViewerState) {
  switch (viewerState.status) {
    case "loading-library":
    case "loading-model":
      return (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#6F7979] shadow-sm">
            {viewerState.status === "loading-library" ? "Loading viewer…" : "Loading 3D model…"}
          </span>
        </div>
      );
    case "ready":
      return null;
    case "error":
      return (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="rounded-lg bg-white px-4 py-3 text-center text-sm text-[#8C1D18] shadow-sm">
            {viewerState.message}
          </p>
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewerState;
      return exhaustiveCheck;
    }
  }
}
