"use client";

// TRANSPORT: client-query — the rights-claim intake, over `@/lib/blueprints/rights-claim.api`.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { submitRightsClaim } from "@/lib/blueprints/rights-claim.api";
import type { RightsClaimDraft, RightsClaimReceipt } from "@/lib/blueprints/rights-claim.schemas";
import type { ActionResponse } from "@/lib/http";

export interface SubmitRightsClaimVariables {
  readonly teardownSlug: string;
  readonly draft: RightsClaimDraft;
  readonly idempotencyKey: string;
}

/**
 * ⚠️ RETURNS THE `ActionResponse` RATHER THAN THROWING, like `useReportBlueprintMutation`. Every
 * refusal is a state the composer renders — several of them with the emailed notice attached — and
 * none is an exception.
 *
 * ⚠️ NOTHING IS INVALIDATED AND NOTHING IS OPTIMISTIC. Filing a claim changes nothing on the
 * teardown, so there is no cached read that became stale.
 */
export function useSubmitRightsClaimMutation(): UseMutationResult<
  ActionResponse<RightsClaimReceipt>,
  Error,
  SubmitRightsClaimVariables
> {
  return useMutation({
    mutationFn: (variables: SubmitRightsClaimVariables) =>
      submitRightsClaim({
        teardownSlug: variables.teardownSlug,
        draft: variables.draft,
        idempotencyKey: variables.idempotencyKey,
      }),
  });
}
