"use client";

// TRANSPORT: client-query — the cofounder profile lifecycle.
//
// The public directory and the profile detail are server fetches and are deliberately not here —
// same call as `hooks/store/providers.ts`, `factories.ts` and `forum.ts`. Everything below is the
// viewer acting on their OWN profile, which is session-scoped by definition: no route on this
// surface takes a `:userId`, and `/mine` is the only addressing an owner gets.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  createCofounderProfile,
  getOwnCofounderProfile,
  submitOwnCofounderProfile,
  updateOwnCofounderEngagementState,
  updateOwnCofounderProfile,
  withdrawOwnCofounderProfile,
} from "@/lib/store/cofounders.api";
import type {
  CofounderProfileStateChange,
  CreateCofounderProfileInput,
  CreatedCofounderProfile,
  OwnCofounderProfile,
  UpdateCofounderEngagementStateInput,
  UpdateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";

export const cofounderKeys = {
  all: ["cofounder-profiles"] as const,
  mine: () => ["cofounder-profiles", "mine"] as const,
};

/**
 * The viewer's own profile, in any state.
 *
 * A 404 HERE IS A NORMAL STATE, not an error: it means this viewer has no profile yet, and the
 * page renders the "create one" path from it. Do not turn it into a sign-in prompt — that is a
 * different failure with a different code.
 */
export function useOwnCofounderProfileQuery(isEnabled = true) {
  return useQuery<ActionResponse<OwnCofounderProfile>>({
    queryKey: cofounderKeys.mine(),
    queryFn: () => getOwnCofounderProfile(),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Creates YOUR OWN profile, as a draft.
 *
 * IT NOW INVALIDATES `/mine`. Before Phase 19 it invalidated nothing, because the create made a
 * `draft` that no read on this frontend could return — §18.3's finding.
 *
 * `input` CARRIES NO CAPITAL OR EQUITY FIELD. The backend's create schema is `.strict()` and
 * answers 422 for one, which fails the whole write rather than dropping the number.
 *
 * The idempotency key is minted by the composer, once per attempt.
 */
export function useCreateCofounderProfile(): UseMutationResult<
  ActionResponse<CreatedCofounderProfile>,
  Error,
  { readonly input: CreateCofounderProfileInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createCofounderProfile(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
    },
  });
}

/**
 * Edits the profile while `draft` or `withdrawn`.
 *
 * REFUSED WHILE `published` OR `pending_review`. Everything here is content a moderator approved,
 * so changing it after approval goes back through submit — the caller must gate the form on state
 * rather than let the server refuse a form the viewer already filled in.
 */
export function useUpdateOwnCofounderProfile(): UseMutationResult<
  ActionResponse<OwnCofounderProfile>,
  Error,
  { readonly input: UpdateCofounderProfileInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input }) => updateOwnCofounderProfile(input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
    },
  });
}

/**
 * `draft` → `pending_review`.
 *
 * SUBMITTING IS NOT PUBLISHING. A moderator decides, and until they do the profile is in no public
 * read, so no copy on this control may say "you are now listed".
 */
export function useSubmitOwnCofounderProfile(): UseMutationResult<
  ActionResponse<CofounderProfileStateChange>,
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitOwnCofounderProfile(),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
    },
  });
}

/**
 * Out of the directory, REVERSIBLY.
 *
 * WITHDRAW IS NOT DELETE, and there is no delete on this surface. The profile returns to a state
 * its owner can edit and submit again, so copy must not offer it as "remove my profile
 * permanently".
 */
export function useWithdrawOwnCofounderProfile(): UseMutationResult<
  ActionResponse<CofounderProfileStateChange>,
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => withdrawOwnCofounderProfile(),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
    },
  });
}

/**
 * The one edit a `published` profile may make without re-entering moderation.
 *
 * MOVING TO `not_looking` DOES NOT HIDE THE PROFILE. It stays in the directory saying so, with no
 * contact affordance — removing it would make somebody mid-conversation look as though they had
 * left the platform. The control's copy has to say that, or people will press it expecting to
 * disappear.
 */
export function useUpdateOwnCofounderEngagementState(): UseMutationResult<
  ActionResponse<CofounderProfileStateChange>,
  Error,
  { readonly input: UpdateCofounderEngagementStateInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input }) => updateOwnCofounderEngagementState(input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: cofounderKeys.all });
    },
  });
}
