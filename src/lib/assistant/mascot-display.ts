// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// THE VIEWER'S SIZE AND SPEED CHOICES, AS NUMBERS.
//
// The assistant panel offers three sizes and three speeds (stored as words in the
// browser-preferences blob); this file is the one place those words become scales and multipliers,
// so the controller, the panel's position and the no-WebGL fallback cannot disagree.
//
// SIZE is how much larger than its frame (`MASCOT_FRAME_*_PX`, ~96×116 CSS px) the mascot is drawn.
// Phones get smaller steps so even Large leaves the bottom nav and most of the screen clear. Above
// 1 the art is upscaled (the sheet's figures are ~182 px tall at 1.7 stored px per CSS px), so it
// softens on a 2x screen; a sheet rendered larger fixes that with no code change.
//
// SPEED is one multiplier on how lively it is: how long each pose holds, how fast it travels to a
// perch, how quickly it bobs. It does NOT change how long it points or reacts — those hold a
// message on screen long enough to read. Under prefers-reduced-motion none of it animates anyway.
//
// No directive: the panel (client) and any server code may both read these values.

import { MASCOT_FRAME_HEIGHT_PX } from "@/lib/assistant/mascot-atlas.schemas";
import type { MascotSize, MascotSpeed } from "@/lib/browser-preferences";

export const MASCOT_DISPLAY_SCALE_BY_SIZE: Record<
  MascotSize,
  { readonly desktop: number; readonly mobile: number }
> = {
  small: { desktop: 1, mobile: 0.85 },
  medium: { desktop: 1.5, mobile: 1.1 },
  large: { desktop: 2, mobile: 1.35 },
};

export const MASCOT_SPEED_MULTIPLIER: Record<MascotSpeed, number> = {
  slow: 0.6,
  normal: 1,
  fast: 1.6,
};

export const MASCOT_SIZE_LABELS: Record<MascotSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const MASCOT_SPEED_LABELS: Record<MascotSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
};

/** Below this the bottom nav is on screen and the mobile scale applies. Tailwind's `md`. */
export const MASCOT_MOBILE_BREAKPOINT_PX = 768;
/** Where the docked mascot's feet rest, above the bottom edge. Phones clear the 80px bottom nav. */
export const MASCOT_DOCK_BOTTOM_OFFSET_MOBILE_PX = 96;
export const MASCOT_DOCK_BOTTOM_OFFSET_DESKTOP_PX = 24;

const PANEL_GAP_ABOVE_MASCOT_PX = 12;

/**
 * How far above the bottom edge the panel must sit to clear the docked mascot at this size, on a
 * phone and on desktop. The panel reads these as CSS variables so a size change moves it too.
 */
export function computeAssistantPanelBottomPx(size: MascotSize): {
  readonly mobile: number;
  readonly desktop: number;
} {
  const scale = MASCOT_DISPLAY_SCALE_BY_SIZE[size];
  return {
    mobile: Math.ceil(
      MASCOT_DOCK_BOTTOM_OFFSET_MOBILE_PX +
        MASCOT_FRAME_HEIGHT_PX * scale.mobile +
        PANEL_GAP_ABOVE_MASCOT_PX,
    ),
    desktop: Math.ceil(
      MASCOT_DOCK_BOTTOM_OFFSET_DESKTOP_PX +
        MASCOT_FRAME_HEIGHT_PX * scale.desktop +
        PANEL_GAP_ABOVE_MASCOT_PX,
    ),
  };
}
