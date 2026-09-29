// TRANSPORT: client-query — the rights-claim intake, one POST.
//
// ⚠️ SEPARATE FROM `rights-claim-moderation.api.ts`, which carries the claimant's identity back to
// staff. Nothing a reader's page imports can reach that file by autocomplete.

import {
  RightsClaimReceiptSchema,
  type RightsClaimDraft,
  type RightsClaimReceipt,
} from "@/lib/blueprints/rights-claim.schemas";
import { sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `POST /blueprints/teardowns/:teardownSlug/claims` — answers 201 with a receipt.
 *
 * ⚠️ AN IDEMPOTENCY KEY IS REQUIRED, and it is minted once per ATTEMPT by the composer: a retry
 * after a dropped connection carries the same key and gets the same receipt back, and an edit
 * rotates it so a corrected claim is not refused as a replay of the one before.
 *
 * ⚠️ NO TEARDOWN ID, CLAIMANT ID OR TIMESTAMP IN THE BODY. The server takes the teardown from the
 * path, the claimant from the session and the sworn instant from its own clock, and refuses a body
 * that tries to send any of them.
 */
export function submitRightsClaim(
  input: {
    readonly teardownSlug: string;
    readonly draft: RightsClaimDraft;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<RightsClaimReceipt>> {
  return sendJson(
    `/blueprints/teardowns/${encodeURIComponent(input.teardownSlug)}/claims`,
    "POST",
    input.draft,
    RightsClaimReceiptSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": input.idempotencyKey },
    },
  );
}
