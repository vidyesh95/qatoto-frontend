"use client";

// TRANSPORT: client-query — the rights-claim intake, over `@/lib/blueprints/rights-claim.api`.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
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
 */
export function useSubmitRightsClaimMutation(): UseMutationResult<
  ActionResponse<RightsClaimReceipt>,
  Error,
  SubmitRightsClaimVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: SubmitRightsClaimVariables) =>
      submitRightsClaim({
        teardownSlug: variables.teardownSlug,
        draft: variables.draft,
        idempotencyKey: variables.idempotencyKey,
      }),
    onSuccess: async (result) => {
      if (!result.success) return;
      await queryClient.invalidateQueries({ queryKey: blueprintKeys.rightsClaimQueueRoot() });
    },
  });
}
