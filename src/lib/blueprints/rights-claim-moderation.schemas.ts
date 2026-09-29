// CONTRACT: the moderator's rights-claim queue.
//
// ⚠️ THE ONLY SCHEMA IN THE APP THAT CARRIES A RIGHTS CLAIMANT'S NAME AND EMAIL. The teardown's
// publisher is never shown who claimed or what they wrote, and that guarantee is this file's import
// graph: nothing under `src/components/home` or `src/components/studio` may import it or its
// transport. Check: `rg "rights-claim-moderation" src/components/home src/components/studio` prints
// nothing.

import { z } from "zod";

import { RIGHTS_CLAIM_KINDS } from "@/lib/blueprints/rights-claim.schemas";

export const RIGHTS_CLAIM_STATUSES = ["open", "actioned", "dismissed"] as const;
export type RightsClaimStatus = (typeof RIGHTS_CLAIM_STATUSES)[number];

export const RIGHTS_CLAIM_TARGET_KINDS = [
  "whole_teardown",
  "document",
  "manufacturing_file",
  "part",
] as const;
export type RightsClaimTargetKind = (typeof RIGHTS_CLAIM_TARGET_KINDS)[number];

export const RIGHTS_CLAIM_TARGET_KIND_LABELS: Readonly<Record<RightsClaimTargetKind, string>> = {
  whole_teardown: "The whole teardown",
  document: "Document",
  manufacturing_file: "Fabrication file",
  part: "Part",
};

/** What every claim carries, purged or not. */
const RightsClaimQueueItemBaseSchema = z.object({
  claimId: z.string(),
  status: z.enum(RIGHTS_CLAIM_STATUSES),
  claimKind: z.enum(RIGHTS_CLAIM_KINDS),
  targetKind: z.enum(RIGHTS_CLAIM_TARGET_KINDS),
  targetId: z.string().nullable(),
  targetTitleSnapshot: z.string(),
  teardownId: z.string(),
  teardownSlug: z.string(),
  teardownTitle: z.string(),
  /** So a moderator can see whether somebody has already acted on this teardown. */
  teardownModerationState: z.string(),
  claimantHandle: z.string().nullable(),
  swornAt: z.string(),
  resolvedAt: z.string().nullable(),
  /** ⚠️ CONTEXT, NEVER A THRESHOLD — the report queue's rule. */
  openClaimCountOnTeardown: z.number().int().nonnegative(),
  createdAt: z.string(),
});

/**
 * ⚠️ TWO SHAPES, DISCRIMINATED BY `claimantDetailsPurgedAt`. Six years after a claim is resolved
 * the backend's retention sweep nulls the claimant's details and the resolution note, and stamps
 * the instant. A row with details present and a purge instant, or neither, is refused here, which
 * mirrors `blueprint_rights_claim_purge_ck`.
 */
const RightsClaimWithClaimantSchema = RightsClaimQueueItemBaseSchema.extend({
  claimantDetailsPurgedAt: z.null(),
  claimantFullName: z.string(),
  claimantOrganizationName: z.string().nullable(),
  claimantEmail: z.string(),
  relationshipToRightsHolder: z.string(),
  claimSubstance: z.string(),
  resolutionNote: z.string().nullable(),
});

const RightsClaimPurgedSchema = RightsClaimQueueItemBaseSchema.extend({
  claimantDetailsPurgedAt: z.string(),
  claimantFullName: z.null(),
  claimantOrganizationName: z.null(),
  claimantEmail: z.null(),
  relationshipToRightsHolder: z.null(),
  claimSubstance: z.null(),
  resolutionNote: z.null(),
});

export const RightsClaimQueueItemSchema = z.union([
  RightsClaimWithClaimantSchema,
  RightsClaimPurgedSchema,
]);
export type RightsClaimQueueItem = z.infer<typeof RightsClaimQueueItemSchema>;

export const RightsClaimQueuePageSchema = z.object({
  items: RightsClaimQueueItemSchema.array(),
  page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
});
export type RightsClaimQueuePage = z.infer<typeof RightsClaimQueuePageSchema>;

export const DismissedRightsClaimSchema = z.object({ claimId: z.string() });
export type DismissedRightsClaim = z.infer<typeof DismissedRightsClaimSchema>;
