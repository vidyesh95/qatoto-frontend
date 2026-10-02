// TRANSPORT: props-only — reads one browser preference.
"use client";

// THE ONLY THING AI ASSIST MODE COSTS A VISITOR WHO LEFT IT OFF IS THIS FILE.
//
// `isAiAssistModeOn` lives in the one browser-preferences blob, so the server render always sees
// the default (`false`) and renders nothing, and the hydration render agrees with it — the
// provider's `useSyncExternalStore` guarantees that. The stored value is adopted on the render
// after, and only then does `React.lazy` request the assistant chunk, which in turn requests the
// Pixi chunk from inside an effect. Off means zero bytes of either, and switching Off unmounts the
// root, whose cleanup destroys the WebGL context.

import { lazy, Suspense } from "react";

import { useBrowserPreferences } from "@/state/browser-preferences-context";

const AssistantRoot = lazy(() => import("@/components/assistant/assistant-root"));

export default function AssistantGate() {
  const { preferences } = useBrowserPreferences();
  if (!preferences.isAiAssistModeOn) return null;
  return (
    <Suspense fallback={null}>
      <AssistantRoot />
    </Suspense>
  );
}
