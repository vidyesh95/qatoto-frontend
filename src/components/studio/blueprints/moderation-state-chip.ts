// TRANSPORT: props-only — a class map, no data.

import {
  BLUEPRINT_MODERATION_STATE_LABELS,
  type BlueprintModerationState,
  type BlueprintSubmissionDisplayState,
} from "@/lib/blueprints/schemas";

/**
 * Chip chrome per moderation state, shared by My Teardowns, My Launches and My Case Studies.
 *
 * MOVED OUT OF `studio-blueprints-page.tsx` when My Launches needed the same chips. Two copies of a
 * status palette drift into two palettes, and a "Not accepted" chip that is red on one studio page
 * and grey on the next reads as two different verdicts.
 *
 * ⚠️ A `Record` OVER THE WHOLE ENUM, so an eighth moderation state is a compile error here rather
 * than an unstyled chip somebody notices in production. It is also why `rejected` was caught
 * everywhere the moment it was added to the tuple.
 *
 * ⚠️ THE PALETTE STAYS INSIDE THE ONE HUE RULE. Four of the seven are neutral, `published` takes the
 * imprint wash and the two adverse states take `Destructive`. No green for published and no amber
 * for pending: `docs/Design.md` §2 allows one hue family plus one blue and one red, and a status
 * list is exactly where a rainbow gets introduced by accident.
 */
export const MODERATION_STATE_CHIP_CLASS: Record<BlueprintModerationState, string> = {
  draft: "border-border bg-card text-muted-foreground",
  pending_review: "border-border bg-card text-foreground",
  published: "border-transparent bg-[#00696E] text-white",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  flagged: "border-destructive/40 bg-destructive/10 text-destructive",
  quarantined: "border-destructive/40 bg-destructive/10 text-destructive",
  removed: "border-border bg-card text-muted-foreground",
};

/**
 * The same chips and labels, plus `unknown`, for the lists whose rows are parsed with `.catch`.
 *
 * A status this build does not recognise wears the quietest chip there is, the draft one, because it
 * is a gap in this app and not a verdict on the row. MOVED HERE from `studio-launches-page.tsx` when
 * My Case Studies needed the same pair. `MODERATION_STATE_CHIP_CLASS` stays keyed by real states only.
 */
export const SUBMISSION_STATE_CHIP_CLASS: Record<BlueprintSubmissionDisplayState, string> = {
  ...MODERATION_STATE_CHIP_CLASS,
  unknown: MODERATION_STATE_CHIP_CLASS.draft,
};
export const SUBMISSION_STATE_LABELS: Record<BlueprintSubmissionDisplayState, string> = {
  ...BLUEPRINT_MODERATION_STATE_LABELS,
  unknown: "Unknown status",
};
