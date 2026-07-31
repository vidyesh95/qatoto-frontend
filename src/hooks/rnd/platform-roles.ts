// TRANSPORT: client-query — React Query over `@/lib/rnd/platform-roles.api`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  cancelPlatformRoleProposal,
  countersignPlatformRoleChange,
  getOwnStaffContext,
  listPlatformRoleProposals,
  lookupUserForRoleGrant,
  proposePlatformRoleChange,
} from "@/lib/rnd/platform-roles.api";
import type { PlatformRole } from "@/lib/rnd/platform-roles.schemas";

/**
 * The caller's own role and capabilities.
 *
 * THE ANSWER, NOT A PROXY. Every staff affordance in the console asks this instead of firing
 * a staff route and reading the status code, so a page can check the capability it actually
 * needs rather than one that happens to travel with it.
 *
 * `retry: false` because a `401` is an answer, not a flake.
 */
export function useOwnStaffContextQuery() {
  return useQuery({
    queryKey: rndKeys.ownStaffContext(),
    queryFn: async () => unwrap(await getOwnStaffContext()),
    retry: false,
  });
}

/**
 * One account by exact email, fetched only once an address is submitted.
 *
 * `enabled` on a non-empty email so opening the page fires nothing: this route requires
 * `manage_platform_roles`, and a speculative call would burn a 403 for every non-admin who
 * lands here.
 */
export function usePlatformRoleSubjectQuery(email: string) {
  return useQuery({
    queryKey: rndKeys.platformRoleSubject(email),
    queryFn: async () => unwrap(await lookupUserForRoleGrant(email)),
    enabled: email.trim().length > 0,
    retry: false,
  });
}

/** Every role change waiting for a second signature. */
export function usePlatformRoleProposalsQuery() {
  return useQuery({
    queryKey: rndKeys.platformRoleProposals(),
    queryFn: async () => unwrap(await listPlatformRoleProposals()),
    retry: false,
  });
}

/**
 * Proposes a role change. **Nothing is granted here.**
 *
 * Invalidates only the proposal queue and the looked-up subject — deliberately NOT the audit
 * trail, because no role moved and nothing was written to the chain. A proposal is a request
 * for a second signature, not a decision.
 */
export function useProposePlatformRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: PlatformRole | null; note?: string }) =>
      unwrap(await proposePlatformRoleChange(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.platformRoleProposals() });
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-role-subject"] });
    },
  });
}

/**
 * Countersigns — the call that actually moves the role.
 *
 * Invalidates the caller's own context too: an admin's capability set decides whether this
 * screen keeps working at all, and a stale copy is the one thing that could leave a revoked
 * operator holding live controls.
 */
export function useCountersignPlatformRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proposalId: string; note?: string }) =>
      unwrap(
        await countersignPlatformRoleChange(
          input.proposalId,
          input.note === undefined ? {} : { note: input.note },
        ),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.platformRoleProposals() });
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-role-subject"] });
      void queryClient.invalidateQueries({ queryKey: rndKeys.ownStaffContext() });
      // This one DID write to the chain, so the decision log on /admin/categories is stale.
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-audit"] });
    },
  });
}

/** Withdraws a live proposal. */
export function useCancelPlatformRoleProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => unwrap(await cancelPlatformRoleProposal(proposalId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.platformRoleProposals() });
    },
  });
}
