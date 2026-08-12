"use client";

// TRANSPORT: client-query — the staff site-audit console.
//
// `isEnabled` IS THREADED FROM THE CAPABILITY CHECK on every query here, the same way
// `admin-categories.ts` does it, so a viewer without `moderate_commerce` never fires a speculative
// request that comes back 403. And `retry: false` everywhere: a 403 is an answer, not a flake.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  listOrganizationSiteAudits,
  recordOrganizationSiteAudit,
  withdrawOrganizationSiteAudit,
} from "@/lib/store/admin-site-audits.api";
import type {
  FactorySiteAudit,
  RecordSiteAuditInput,
  WithdrawSiteAuditInput,
} from "@/lib/store/factories.schemas";

export const siteAuditKeys = {
  all: ["site-audits"] as const,
  forOrganization: (organizationId: string) => ["site-audits", organizationId] as const,
};

/** Every audit on one organization, withdrawn ones included. */
export function useOrganizationSiteAuditsQuery(organizationId: string, isEnabled: boolean) {
  return useQuery<ActionResponse<{ siteAudits: FactorySiteAudit[] }>>({
    queryKey: siteAuditKeys.forOrganization(organizationId),
    queryFn: () => listOrganizationSiteAudits(organizationId),
    enabled: isEnabled && organizationId.length > 0,
    retry: false,
  });
}

/**
 * Records one audit.
 *
 * Carries an idempotency key, minted once per attempt. A retry without one records the same visit
 * twice, and two rows for one audit make the public `lastAuditedAt` look like a cadence nobody
 * kept.
 */
export function useRecordSiteAuditMutation(): UseMutationResult<
  ActionResponse<FactorySiteAudit>,
  Error,
  {
    readonly organizationId: string;
    readonly input: RecordSiteAuditInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input, idempotencyKey }) =>
      recordOrganizationSiteAudit(organizationId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: siteAuditKeys.all });
    },
  });
}

/**
 * Retracts one, WITH A REQUIRED REASON.
 *
 * Withdrawing removes a platform claim a buyer may have relied on when they chose this factory, so
 * a retraction nobody has to justify is one nobody can review.
 */
export function useWithdrawSiteAuditMutation(): UseMutationResult<
  ActionResponse<FactorySiteAudit>,
  Error,
  { readonly auditId: string; readonly input: WithdrawSiteAuditInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auditId, input }) => withdrawOrganizationSiteAudit(auditId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: siteAuditKeys.all });
    },
  });
}
