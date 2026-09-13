// CONTRACT: the viewer-side writes on `/blueprints` — the view beacon, the like/upvote/save
// toggles, and the batched viewer state.
//
// ⚠️ THE ARM IS PART OF THE PATH, NOT PART OF A BODY. Each transport below takes an arm and builds
// its own URL, because the server routes each arm to its own tables at route-declaration time. A
// `targetKind` field on the wire would be a client-supplied value deciding which table a write
// lands in.

import { z } from "zod";

/** The three arms, in the URL spelling the router uses. */
export const BLUEPRINT_ARM_SEGMENTS = {
  teardown: "teardowns",
  showcase: "showcases",
  case_study: "case-studies",
} as const;

export type BlueprintArm = keyof typeof BLUEPRINT_ARM_SEGMENTS;

/**
 * What a toggle answers with.
 *
 * ⚠️ THE COUNT IS THE SERVER'S. The optimistic update flips a local number so the control responds
 * to a tap, and then SETTLES ON THIS — a client that kept its own guess would drift from every
 * other reader's view of the same row.
 */
export const BlueprintToggleResultSchema = z
  .object({
    isSet: z.boolean(),
    count: z.number().int().nonnegative(),
  })
  .strip();
export type BlueprintToggleResult = z.infer<typeof BlueprintToggleResultSchema>;

/**
 * What this viewer has already done to a named set of blueprints.
 *
 * ⚠️ ITS OWN AUTHENTICATED READ, RATHER THAN A FIELD ON THE PUBLIC PAYLOADS. The public reads are
 * BARE — no session, no limiter — and the server's justification for that is precisely that their
 * answer is identical for every visitor. Folding viewer state into them would make every one
 * per-viewer and destroy the cacheability that buys.
 *
 * ⚠️ AND THE ARMS DO NOT CARRY THE SAME FLAGS. A showcase can be upvoted and not saved; a teardown
 * saved and not upvoted; a case study neither. The shapes differ because the counters differ, and
 * three schema comments on the server state that as contract.
 */
export const BlueprintViewerStateSchema = z
  .object({
    showcases: z.record(z.string(), z.object({ hasLiked: z.boolean(), hasUpvoted: z.boolean() })),
    teardowns: z.record(z.string(), z.object({ hasLiked: z.boolean(), hasSaved: z.boolean() })),
    caseStudies: z.record(z.string(), z.object({ hasLiked: z.boolean() })),
  })
  .strip();
export type BlueprintViewerState = z.infer<typeof BlueprintViewerStateSchema>;

/** The verbs, and which arm offers which. Mirrors `VERBS_BY_ARM` on the server. */
export const BLUEPRINT_TOGGLE_VERBS_BY_ARM = {
  showcase: ["like", "upvote"],
  teardown: ["like", "save"],
  case_study: ["like"],
} as const satisfies Record<BlueprintArm, readonly string[]>;

export type BlueprintToggleVerb = "like" | "upvote" | "save";
