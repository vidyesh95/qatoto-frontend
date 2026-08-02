// TRANSPORT: props-only — pure list building, no network.
//
// The filter row holds TWO KINDS OF THING wearing one shape. `All`, `Trending`, `New to you`,
// `Recently uploaded` and `Watched` set `?mode=`; `Robotics`, `AI`, `Gaming` set `?category=`.
// A flat `string[]` cannot express that, which is CLAUDE.md Pattern 1's illegal-state problem
// in miniature: with one array nothing stops a chip trying to be both, and the click handler
// has to guess from the label which query param it owns.
//
// The union below makes the alternatives explicit, so clicking a chip sets EITHER `mode` OR
// `category` and the compiler enforces which.

import type { ContentCategory, FeedMode } from "@/lib/feed/schemas";

export type FeedChip =
  | { readonly kind: "mode"; readonly mode: FeedMode; readonly label: string }
  | { readonly kind: "topic"; readonly categorySlug: string; readonly label: string };

/**
 * The mode chips, in row order. Labels are display strings and may be reworded freely; the
 * `mode` values are wire enum labels and may not (CLAUDE.md wire-casing).
 *
 * `Live` IS ABSENT AND STAYS ABSENT. There is no stream table, no ingest and no provider —
 * live streaming is explicitly out of scope in STUDIO_BACKEND_STRUCTURE §12 — so the chip
 * would return nothing every single time. A filter that always answers empty does not teach
 * users that nothing is live, it teaches them the filters are broken.
 */
export const MODE_CHIPS: readonly FeedChip[] = [
  { kind: "mode", mode: "all", label: "All" },
  { kind: "mode", mode: "trending", label: "Trending" },
  { kind: "mode", mode: "new_to_you", label: "New to you" },
  { kind: "mode", mode: "recently_uploaded", label: "Recently uploaded" },
  { kind: "mode", mode: "watched", label: "Watched" },
];

/**
 * The mode chips followed by one topic chip per category, which is the row the user already
 * knows.
 *
 * Categories arrive pre-sorted by the backend (`sortOrder ASC, slug ASC`) and are NOT re-sorted
 * here — the display order is a product decision that lives in the `content_category` table, and
 * re-sorting client-side would make that column a lie.
 *
 * An empty or failed category read still yields the five mode chips. That degradation is the
 * point: the modes do not depend on `/feed/categories`, so a failure there must not blank a row
 * that has five working controls in it.
 */
export function buildFeedChips(categories: readonly ContentCategory[]): FeedChip[] {
  return [
    ...MODE_CHIPS,
    ...categories.map(
      (category): FeedChip => ({
        kind: "topic",
        categorySlug: category.slug,
        label: category.label,
      }),
    ),
  ];
}

/**
 * True when this chip is the one the current URL selects.
 *
 * A category filter WINS OVER the mode: `?mode=all&category=robotics` highlights Robotics, not
 * All, because that is what the page is showing. The two are alternatives in the union but the
 * URL is hand-editable and can carry both, so this has to pick one rather than light up two
 * chips at once.
 */
export function isChipSelected(
  chip: FeedChip,
  selection: { readonly mode: FeedMode; readonly categorySlug: string | undefined },
): boolean {
  if (selection.categorySlug !== undefined) {
    return chip.kind === "topic" && chip.categorySlug === selection.categorySlug;
  }
  return chip.kind === "mode" && chip.mode === selection.mode;
}

/**
 * The `buildFilterHref` patch a chip click applies.
 *
 * ALWAYS CLEARS THE OTHER KEY. Selecting a topic drops `mode`, and selecting a mode drops
 * `category` — without that, clicking Robotics then Trending would send
 * `?mode=trending&categorySlug=robotics`, which is a narrower feed than the user asked for and
 * looks like a broken chip.
 *
 * `All` clears both, so the default page has a bare URL and the back button has somewhere to
 * return to.
 */
export function toChipHrefPatch(chip: FeedChip): Record<string, string | undefined> {
  if (chip.kind === "topic") {
    return { category: chip.categorySlug, mode: undefined };
  }
  return { mode: chip.mode === "all" ? undefined : chip.mode, category: undefined };
}
