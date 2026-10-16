// TRANSPORT: props-only — fetches an overlay's code the first time it opens. Fetches no data.
"use client";

// ONE WAY TO KEEP AN OPEN-ON-CLICK SURFACE OUT OF A PAGE'S INITIAL JAVASCRIPT.
//
// A sheet, a menu or a sheet's form that renders only after a click still lands in the route's
// first load when its module is imported statically. `createLazyOverlay` swaps that import for a
// `React.lazy` one at module scope and hands back the component plus a `preload` for the trigger's
// `onPointerEnter` / `onFocus` (a touch fires both before its `click`), so the open does not wait
// on the chunk in the ordinary case.
//
// A FAILED FETCH IS A VALUE, NOT A THROW. `React.lazy` rethrows a rejected import into the nearest
// error boundary, this repo has none, and the static import it replaces could not fail at all — so
// a dropped connection would take the whole page down from a click. The loader resolves to the
// caller's `LoadFailed` stand-in instead. React caches what a lazy component resolved to, so once a
// stand-in renders it stays until a reload, which is why every stand-in offers one. A preload that
// fails before anything rendered clears its cache, and the real open retries.
//
// WORTH IT ONLY ABOVE ABOUT 2k. Each use costs its own chunk request plus this wrapper; the sheets
// left static are the ones the 16.4 Bundle Analyzer measured below that (todo.md §24.3).

import { lazy, Suspense, type ComponentType } from "react";

import ModalSheet from "@/components/home/shared/modal-sheet";

type LazyModule<Props> = { default: ComponentType<Props> };

export const LOAD_FAILED_MESSAGE =
  "This did not load. Check your connection, then reload the page.";

export function ReloadPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:opacity-90"
    >
      Reload
    </button>
  );
}

/** The stand-in's words and its one action, for a surface whose frame is already on screen. */
export function LoadFailedNotice() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <p className="text-sm text-foreground" role="alert">
        {LOAD_FAILED_MESSAGE}
      </p>
      <div>
        <ReloadPageButton />
      </div>
    </div>
  );
}

export function createLazyOverlay<Props extends object>(
  loadModule: () => Promise<LazyModule<Props>>,
  LoadFailed: ComponentType<Props>,
): { LazyOverlay: ComponentType<Props>; preload: () => void } {
  let modulePromise: Promise<LazyModule<Props>> | null = null;

  function loadModuleOrStandIn(): Promise<LazyModule<Props>> {
    modulePromise ??= loadModule().catch(() => {
      modulePromise = null;
      return { default: LoadFailed };
    });
    return modulePromise;
  }

  const LazyComponent = lazy(loadModuleOrStandIn);

  // `fallback={null}`: the chunk is normally in flight from the preload before the click lands,
  // and a skeleton flashed for a few milliseconds is worse than the surface appearing a frame later.
  function LazyOverlay(props: Props) {
    return (
      <Suspense fallback={null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  return {
    LazyOverlay,
    preload: () => {
      void loadModuleOrStandIn();
    },
  };
}

/** A `ModalSheet`-style sheet: the stand-in is a sheet with the same title, so it closes the same way. */
export function createLazySheet<Props extends { onClose: () => void }>(
  loadModule: () => Promise<LazyModule<Props>>,
  title: string,
): { LazyOverlay: ComponentType<Props>; preload: () => void } {
  function SheetLoadFailed({ onClose }: Props) {
    return (
      <ModalSheet title={title} onClose={onClose}>
        <LoadFailedNotice />
      </ModalSheet>
    );
  }
  return createLazyOverlay(loadModule, SheetLoadFailed);
}

/** The body of a sheet whose shell stays static and is already open: the stand-in is the notice alone. */
export function createLazySheetBody<Props extends object>(
  loadModule: () => Promise<LazyModule<Props>>,
): { LazyOverlay: ComponentType<Props>; preload: () => void } {
  return createLazyOverlay(loadModule, LoadFailedNotice);
}
