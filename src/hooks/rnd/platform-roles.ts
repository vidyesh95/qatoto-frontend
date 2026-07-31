// TRANSPORT: client-query — React Query over `@/lib/rnd/platform-roles.api`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  getOwnStaffContext,
  lookupUserForRoleGrant,
  setPlatformRole,
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

/**
 * Grants, changes or revokes a role.
 *
 * Invalidates the looked-up subject and the caller's own context — the latter because an
 * admin's capability set is what decides whether this screen keeps working at all, and a
 * stale copy of it is the one thing that could leave a revoked operator holding live
 * controls.
 */
export function useSetPlatformRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: PlatformRole | null }) =>
      unwrap(await setPlatformRole(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-role-subject"] });
      void queryClient.invalidateQueries({ queryKey: rndKeys.ownStaffContext() });
      // A grant is an audit event, so the decision log on /admin/categories is now stale.
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-audit"] });
    },
  });
}
