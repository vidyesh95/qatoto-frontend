// TRANSPORT: props-only — pure constants, no network, no browser API.
//
// THE PIN ART, SHARED BY BOTH RENDERERS OF THE PROBLEM MAP.
//
// `problem-map-canvas` draws these over a static SVG and `civic-pulse-vector-map` draws them over
// OpenFreeMap tiles. They live here rather than in either one because a reader flipping the
// `NEXT_PUBLIC_CIVIC_PULSE_MAPLIBRE` flag must see the SAME cluster rendered the same way — two
// copies of a record is how the same row ends up amber on one canvas and teal on the other. It is
// the reason `BlueprintCardBody` was deleted rather than duplicated: "so the rail and the grid
// cannot diverge".

import type { OpportunityBand } from "@/lib/rnd/map-projection";
import type { CategoryPinIconKey } from "@/lib/rnd/shared.schemas";

/**
 * Pin art per category, keyed off the wire's `pinIconKey` enum rather than off a display label.
 * The old map was keyed on English category names, so renaming a category in the CMS silently
 * fell back to the default pin.
 *
 * Six SVGs cover eleven keys: the built-environment keys share the infrastructure pin because no
 * dedicated art exists for them yet.
 */
export const PIN_ICON_SRC_BY_ICON_KEY: Record<CategoryPinIconKey, string> = {
  water: "/dummy/icons/rnd_pin_water.svg",
  agriculture: "/dummy/icons/rnd_pin_agriculture.svg",
  health: "/dummy/icons/rnd_pin_health.svg",
  energy: "/dummy/icons/rnd_pin_energy.svg",
  education: "/dummy/icons/rnd_pin_education.svg",
  housing: "/dummy/icons/rnd_pin_infrastructure.svg",
  transport: "/dummy/icons/rnd_pin_infrastructure.svg",
  waste: "/dummy/icons/rnd_pin_infrastructure.svg",
  connectivity: "/dummy/icons/rnd_pin_infrastructure.svg",
  manufacturing: "/dummy/icons/rnd_pin_infrastructure.svg",
  other: "/dummy/icons/rnd_pin_infrastructure.svg",
};

export const PIN_SIZE_CLASS: Record<OpportunityBand, string> = {
  high: "size-5",
  medium: "size-4",
  low: "size-3",
  unscored: "size-3",
};

/**
 * `unscored` is grey on purpose: a ring colour is a judgement, and there is no judgement to render
 * before the scoring job has run.
 *
 * ⚠️ These three hues predate the One Hue Rule (`docs/Design.md` §2) and are NOT a licence to add
 * a fourth. Size carries the same band — see `PIN_SIZE_CLASS` — so the ring is never the only
 * signal, which is what §8 requires.
 */
export const PIN_RING_CLASS: Record<OpportunityBand, string> = {
  high: "ring-red-500",
  medium: "ring-amber-500",
  low: "ring-[#00696E]",
  unscored: "ring-[#CAC4D0]",
};
