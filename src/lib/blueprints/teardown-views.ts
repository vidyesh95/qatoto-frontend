// TRANSPORT: props-only — pure contract and label records, no network.
//
// THE DENSITY SWITCH. One teardown, three readers, and `docs/PRODUCT.md` is explicit that they may
// not be averaged: "Legibility for the founder, density for the engineer, precision for the
// manufacturer. Layer it." A single page pitched between the three serves none of them — the
// founder meets a fastener table before they know what the thing costs, and the manufacturer
// scrolls past two paragraphs of prose to reach the only four facts they can quote from.
//
// ⚠️ IT IS A QUERY PARAM, NOT CLIENT STATE, and that is the load-bearing decision. `?view=factory`
// is a URL a founder can send to the shop that is going to make the thing, and it lands them in
// the reading they need with no click. Client state would also mean this page shipped JavaScript
// to answer a question the server already knows the answer to — the hub ships none of its own and
// this surface keeps that property.
//
// THE THREE VIEWS REORDER AND RE-EMPHASIZE THE SAME SECTIONS. None of them hides a fact the others
// show, and none of them is a different page: a view that withheld something would turn a reading
// preference into an access control, and a reader who switched would have to wonder what they had
// been missing.

import type { TeardownViewerTab } from "@/lib/blueprints/viewer-tabs";

/**
 * Who is reading. `business` is the default because it is the persona the pipeline exists for —
 * a founder deciding whether a known product is worth building with the capital they actually have.
 */
export const TEARDOWN_VIEWS = ["business", "engineering", "factory"] as const;
export type TeardownView = (typeof TEARDOWN_VIEWS)[number];

export const DEFAULT_TEARDOWN_VIEW: TeardownView = "business";

/** The query key. camelCase per the wire-casing rule; the values are snake-free single words. */
export const TEARDOWN_VIEW_QUERY_KEY = "view";

export const TEARDOWN_VIEW_LABELS: Record<TeardownView, string> = {
  business: "Business",
  engineering: "Engineering",
  factory: "Factory",
};

/**
 * The question each view answers, rendered under the switch.
 *
 * ONE LINE, AND IT CHANGES WITH THE VIEW. It is the same device the hub's lanes use
 * (`BLUEPRINT_CATEGORY_QUESTIONS`): a reader arrives with a question, and the control that would
 * answer it should say so rather than making them try all three.
 */
export const TEARDOWN_VIEW_QUESTIONS: Record<TeardownView, string> = {
  business: "Is this worth building, and what does one unit cost in parts?",
  engineering: "How is it put together, and what is it made of?",
  factory: "What can I quote from, and what is still missing?",
};

/**
 * WHETHER THE COMPOSITION AND FASTENER DISCLOSURES START OPEN.
 *
 * A `Record` rather than `view !== "business"`, so a fourth view is a compile error here rather
 * than a silent inheritance of whatever the boolean happened to say — the house pattern that
 * `SHOWCASE_SORT_COMPARATORS` and `TEARDOWN_MEDIA_PREDICATES` already follow.
 */
export const TEARDOWN_VIEW_OPENS_DETAIL_TABLES: Record<TeardownView, boolean> = {
  business: false,
  engineering: true,
  factory: true,
};

/**
 * Which viewer tab the 3D stage lands on.
 *
 * A founder wants the product shot, an engineer wants the parts, a factory wants the numbers.
 * `viewer-tabs.ts` is pure data with no React and no engine import, so typing these against it
 * costs nothing and makes a renamed tab a compile error here.
 */
export const TEARDOWN_VIEW_INITIAL_VIEWER_TAB: Record<TeardownView, TeardownViewerTab> = {
  business: "design",
  engineering: "components",
  factory: "specifications",
};
