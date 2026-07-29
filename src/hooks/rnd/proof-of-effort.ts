"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/proof-of-effort.api`.
// These are the domain's FIRST writes. Mirrors `src/hooks/products.ts`: `unwrap` inside
// `mutationFn` so a tagged failure becomes the `ApiRequestError` React Query needs, and
// `invalidateQueries` in `onSuccess` keyed off `rndKeys` so no two call sites can spell a
// key differently.
//
// THE POLLING RULE. Four of these answer `202` and produce nothing to render: the claim
// exists, the verdict does not. Those hooks invalidate the claim's detail key and the
// component polls that read — `useEffortClaimQuery` takes a `shouldPoll` flag for exactly
// this. Nothing here returns an optimistic verdict, because on this surface an optimistic
// verdict is an optimistic equity split.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys, type ClaimListFilter } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  acceptFairMarketRate,
  acceptOptimizationSuggestion,
  bakePie,
  buildIntegrationAuthorizeUrl,
  castDisputeVote,
  deletePhysicalReceipt,
  dismissOptimizationSuggestion,
  getEffortClaim,
  listDisputes,
  listEffortClaims,
  lockFairMarketRate,
  listMemberFairMarketRates,
  overrideVerificationStep,
  proposeFairMarketRate,
  raiseDispute,
  resolveDispute,
  reverifyEffortClaim,
  revokeIntegrationGrant,
  submitEffortClaim,
  uploadPhysicalReceipt,
  withdrawDispute,
  type BakePieInput,
  type ProposeRateInput,
  type ResolveDisputeInput,
  type SubmitClaimInput,
} from "@/lib/rnd/proof-of-effort.api";
import type {
  DisputeStatus,
  DisputeVotePosition,
  IntegrationProvider,
  ListClaimsFilter,
  PhysicalReceiptKind,
  VerificationStepStatus,
} from "@/lib/rnd/proof-of-effort.schemas";

/**
 * How often a `202` flow re-reads the claim.
 *
 * The pipeline is four Gemini-backed steps, so a verdict lands in seconds rather than
 * milliseconds. Two seconds is frequent enough to feel live and slow enough not to hammer
 * a route that fans out to runs, steps and evidence on every call.
 */
const VERDICT_POLL_INTERVAL_MS = 2_000;

// --- Queries ------------------------------------------------------------------

/**
 * The verification index.
 *
 * The filter is the API's own `ListClaimsFilter` rather than the key factory's looser
 * `ClaimListFilter`, so `status` stays the six-value enum all the way to the request. A
 * cast at this boundary would let a typo reach a `.strict()` query schema as a 422.
 */
export function useEffortClaimsQuery(projectSlug: string, filter: ListClaimsFilter = {}) {
  const claimListFilter: ClaimListFilter = {
    status: filter.status,
    memberUserId: filter.memberUserId,
    page: filter.page,
  };
  return useQuery({
    queryKey: rndKeys.claims(projectSlug, claimListFilter),
    queryFn: async () => unwrap(await listEffortClaims(projectSlug, filter)),
  });
}

/** The two statuses whose verdict has not landed. Everything else is terminal. */
const IN_FLIGHT_VERIFICATION_STATUSES: readonly string[] = ["queued", "running"];

/**
 * One claim, self-polling while its verdict is outstanding.
 *
 * THIS IS WHAT TURNS A `202` INTO A RENDERED VERDICT, and the decision to keep polling is
 * made from the FETCHED claim rather than from a caller-supplied flag: the caller only
 * knows the status the page was rendered with, so a flag would stop polling a claim that
 * settled after load and keep polling one that settled before it. Reading
 * `query.state.data` each tick is the only version that terminates exactly when the
 * pipeline does.
 */
export function useEffortClaimQuery(projectSlug: string, claimId: string | undefined) {
  return useQuery({
    queryKey: rndKeys.claim(projectSlug, claimId ?? "none"),
    queryFn: async () => {
      if (!claimId) throw new Error("Missing claim id");
      return unwrap(await getEffortClaim(projectSlug, claimId));
    },
    enabled: Boolean(claimId),
    refetchInterval: (query) => {
      const verificationStatus = query.state.data?.verificationStatus;
      if (verificationStatus === undefined) return false;
      return IN_FLIGHT_VERIFICATION_STATUSES.includes(verificationStatus)
        ? VERDICT_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function useDisputesQuery(projectSlug: string, status?: DisputeStatus) {
  return useQuery({
    queryKey: rndKeys.disputes(projectSlug, status),
    queryFn: async () => unwrap(await listDisputes(projectSlug, { status })),
  });
}

export function useMemberFairMarketRatesQuery(
  projectSlug: string,
  memberUserId: string | undefined,
) {
  return useQuery({
    queryKey: rndKeys.memberRate(projectSlug, memberUserId ?? "none"),
    queryFn: async () => {
      if (!memberUserId) throw new Error("Missing member user id");
      return unwrap(await listMemberFairMarketRates(projectSlug, memberUserId));
    },
    enabled: Boolean(memberUserId),
  });
}

// --- Rate lifecycle -----------------------------------------------------------
//
// Three steps, and all three are load-bearing: the founder PROPOSES, the member ACCEPTS,
// and only then can anyone LOCK. Skipping the accept would let the founder both set and
// ratify the number.

export function useProposeFairMarketRateMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberUserId: string; input: ProposeRateInput }) =>
      unwrap(await proposeFairMarketRate(projectSlug, variables.memberUserId, variables.input)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.memberRate(projectSlug, variables.memberUserId),
      });
    },
  });
}

export function useAcceptFairMarketRateMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberUserId: string; rateId: string }) =>
      unwrap(await acceptFairMarketRate(projectSlug, variables.memberUserId, variables.rateId)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.memberRate(projectSlug, variables.memberUserId),
      });
    },
  });
}

/**
 * Lock. Immutable after — `409 RATE_ALREADY_LOCKED` on a second attempt, and the trigger
 * refuses an UPDATE even if a route tried.
 *
 * Invalidates the whole PoE subtree rather than one rate key: locking is what makes claims
 * fileable at all, so the claim list, the ledger and the equity panel all change meaning.
 */
export function useLockFairMarketRateMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      memberUserId: string;
      rateId: string;
      acknowledgement: string;
    }) =>
      unwrap(
        await lockFairMarketRate(projectSlug, {
          rateId: variables.rateId,
          acknowledgement: variables.acknowledgement,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

// --- Claims -------------------------------------------------------------------

/** `202`. The returned claim carries no verdict yet — poll its detail read. */
export function useSubmitEffortClaimMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitClaimInput) =>
      unwrap(await submitEffortClaim(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

/** `202`, and it produces attempt 2 — never a replacement for attempt 1. */
export function useReverifyEffortClaimMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { claimId: string; reason: string }) =>
      unwrap(
        await reverifyEffortClaim(projectSlug, variables.claimId, { reason: variables.reason }),
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.claim(projectSlug, variables.claimId),
      });
    },
  });
}

/**
 * The human-oversight control (EU AI Act Art. 14).
 *
 * It overrides a STEP STATUS and nothing else; the formula recomputes the minutes. There
 * is no minutes field on this mutation and there must never be one — a human typing an
 * outcome is founder fiat with extra steps.
 */
export function useOverrideVerificationStepMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      claimId: string;
      stepId: string;
      overriddenStatus: VerificationStepStatus;
      overrideReason: string;
    }) =>
      unwrap(
        await overrideVerificationStep(projectSlug, variables.claimId, variables.stepId, {
          overriddenStatus: variables.overriddenStatus,
          overrideReason: variables.overrideReason,
        }),
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.claim(projectSlug, variables.claimId),
      });
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

// --- Physical receipts --------------------------------------------------------

/** `202`, multipart. Every measurement is taken server-side from the bytes. */
export function useUploadPhysicalReceiptMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      receiptFile: File;
      receiptKind: PhysicalReceiptKind;
      idempotencyKey: string;
    }) =>
      unwrap(
        await uploadPhysicalReceipt(projectSlug, variables.receiptFile, {
          receiptKind: variables.receiptKind,
          idempotencyKey: variables.idempotencyKey,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.receipts(projectSlug) });
    },
  });
}

/** Refused once cited by a claim — `409 RECEIPT_CITED`, because the bytes are evidence. */
export function useDeletePhysicalReceiptMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string) =>
      unwrap(await deletePhysicalReceipt(projectSlug, receiptId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.receipts(projectSlug) });
    },
  });
}

// --- Disputes — the GDPR Art. 22 contestability path --------------------------

export function useRaiseDisputeMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      proposalId: string;
      disputeNote: string;
      idempotencyKey: string;
    }) =>
      unwrap(
        await raiseDispute(projectSlug, variables.proposalId, {
          disputeNote: variables.disputeNote,
          idempotencyKey: variables.idempotencyKey,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

export function useCastDisputeVoteMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      disputeId: string;
      position: DisputeVotePosition;
      note?: string;
    }) =>
      unwrap(
        await castDisputeVote(projectSlug, variables.disputeId, {
          position: variables.position,
          note: variables.note,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

export function useWithdrawDisputeMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (disputeId: string) => unwrap(await withdrawDispute(projectSlug, disputeId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

/**
 * Resolve. `upheld` / `voided` settle synchronously; **`re_verified` answers `202`** and
 * settles at whatever the scoped re-run derives.
 *
 * There is no adjusted-minutes field in `ResolveDisputeInput`, deliberately.
 */
export function useResolveDisputeMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { disputeId: string; input: ResolveDisputeInput }) =>
      unwrap(await resolveDispute(projectSlug, variables.disputeId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}

// --- Integration consent ------------------------------------------------------

/**
 * Begins the OAuth round trip. The caller navigates to `authorizeUrl` itself — the state
 * is single-use and expires in ten minutes, so it must not be prefetched or stored.
 */
export function useIntegrationAuthorizeUrlMutation(projectSlug: string) {
  return useMutation({
    mutationFn: async (variables: {
      provider: IntegrationProvider;
      requestedResourceIds: readonly string[];
    }) =>
      unwrap(
        await buildIntegrationAuthorizeUrl(projectSlug, variables.provider, {
          requestedResourceIds: variables.requestedResourceIds,
        }),
      ),
  });
}

/** Self-only. Destroys the token and purges the payloads it fetched; hashes survive. */
export function useRevokeIntegrationGrantMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: IntegrationProvider) =>
      unwrap(await revokeIntegrationGrant(projectSlug, provider)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.integrations(projectSlug) });
    },
  });
}

// --- Optimization suggestions -------------------------------------------------

export function useDecideOptimizationSuggestionMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      suggestionId: string;
      decision: "accept" | "dismiss";
      note?: string;
    }) =>
      variables.decision === "accept"
        ? unwrap(
            await acceptOptimizationSuggestion(projectSlug, variables.suggestionId, {
              note: variables.note,
            }),
          )
        : unwrap(
            await dismissOptimizationSuggestion(projectSlug, variables.suggestionId, {
              note: variables.note,
            }),
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.optimizationSuggestions(projectSlug),
      });
    },
  });
}

// --- The bake -----------------------------------------------------------------

/**
 * IRREVERSIBLE, ONCE PER PROJECT, EVER. There is no unbake mutation here because there is
 * no unbake endpoint anywhere, and recovery is a manual audited operation.
 *
 * `expectedSnapshotId` is what makes `409 SNAPSHOT_STALE` reachable: without it a bake
 * races the nightly recompute and freezes a cap table nobody reviewed.
 */
export function useBakePieMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BakePieInput) => unwrap(await bakePie(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.proofOfEffort(projectSlug) });
    },
  });
}
