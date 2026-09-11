// TRANSPORT: props-only — a class map, no data.

import type { BlueprintModerationState } from "@/lib/blueprints/schemas";

/**
 * Chip chrome per moderation state, shared by My Teardowns and My Launches.
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
