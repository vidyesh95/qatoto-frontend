// The gesture policy the teardown viewer shares between the two halves that need to agree on it:
// the engine, which ACTS on a gesture, and the stage overlay, which explains the one that was
// refused.
//
// IT LIVES IN `lib` RATHER THAN IN `engine/` ON PURPOSE. `viewport-gesture-hint.tsx` renders in the
// eager chunk, and anything it imported out of `engine/` would drag `three` and the whole renderer
// in with it — which is the single thing that directory exists to keep out of the page.

/** The two fields of a `WheelEvent` this decision reads. */
export interface ZoomModifierKeys {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/**
 * WHICH WHEELS ZOOM — and by omission, which ones the document gets to keep.
 *
 * The stage is `min(68vh, 720px)` of a scrollable article, and camera-controls claims the wheel
 * unconditionally: its handler calls `preventDefault()` on every wheel over its element. So a
 * reader scrolling down a teardown hit the viewer and the model dollied instead of the page
 * moving, with no way past it but the margins. A plain wheel is now the document's.
 *
 * Ctrl is the Windows and Linux convention for "zoom this thing, not the page" and ⌘ the macOS
 * one, and a trackpad pinch arrives as a wheel with `ctrlKey` ALREADY SET by the OS — so one
 * predicate routes all three, and the pinch that already worked keeps working unchanged.
 */
export function isZoomModifierHeld(event: ZoomModifierKeys): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * How many fingers a viewer gesture takes. Below this the viewer keeps its hands off entirely and
 * the document scrolls — the touch half of the same rule: one finger is how you read a page.
 */
export const VIEWER_GESTURE_TOUCH_COUNT = 2;
