// TRANSPORT: client-query — the rights-claim queue and its dismissal.
//
// ⚠️ SEPARATE FROM `rights-claim.api.ts`, and the import boundary is the point: this file returns
// claimant identities, so nothing a reader's or publisher's page imports may reach it. Acting on a
// claim is NOT here — a flag or quarantine goes through `setBlueprintModerationState` with
// `rightsClaimId`, the same verb the report queue uses, because it moves the teardown, not the claim.

import {
  DismissedRightsClaimSchema,
  RightsClaimQueuePageSchema,
  type DismissedRightsClaim,
  type RightsClaimQueuePage,
  type RightsClaimStatus,
} from "@/lib/blueprints/rights-claim-moderation.schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

/** `GET /blueprints/admin/rights-claims` — oldest first, keyset-paged. */
export function listRightsClaimQueue(
  filter: { readonly status: RightsClaimStatus; readonly cursor?: string },
  options?: RequestOptions,
): Promise<ActionResponse<RightsClaimQueuePage>> {
  const queryString = buildQueryString({ status: filter.status, cursor: filter.cursor });
  return getJson(
    `/blueprints/admin/rights-claims${queryString}`,
    RightsClaimQueuePageSchema,
    options,
  );
}

/**
 * `POST /blueprints/admin/rights-claims/:claimId/dismiss`.
 *
 * ⚠️ DISMISSING RESTORES NOTHING, for the report dismissal's reason: undoing another moderator's
 * flag as a side effect of answering a claimant would overturn their decision without a record.
 */
export function dismissRightsClaim(
  input: {
    readonly claimId: string;
    readonly resolutionNote: string;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<DismissedRightsClaim>> {
  return sendJson(
    `/blueprints/admin/rights-claims/${encodeURIComponent(input.claimId)}/dismiss`,
    "POST",
    { resolutionNote: input.resolutionNote },
    DismissedRightsClaimSchema,
    { ...options, headers: { ...options?.headers, "Idempotency-Key": input.idempotencyKey } },
  );
}
