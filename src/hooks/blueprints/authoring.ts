// TRANSPORT: client-query — React Query hooks over `@/lib/blueprints/authoring.api`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { listMyTeardownSubmissions, submitTeardownForReview } from "@/lib/blueprints/authoring.api";
import type { TeardownSubmissionDraft } from "@/lib/blueprints/authoring.schemas";
import { unwrap } from "@/lib/http";

/** `/studio/blueprints`. Author-scoped server-side; there is no user id to pass. */
export function useMyTeardownSubmissionsQuery() {
  return useQuery({
    queryKey: blueprintKeys.myTeardownSubmissions(),
    queryFn: async () => unwrap(await listMyTeardownSubmissions()),
  });
}

/**
 * Submit a survey for review.
 *
 * ⚠️ NO `refetchInterval` ANYWHERE NEAR THIS, and no optimistic update. The write answers 202 —
 * accepted, not decided — and a moderator reads a queue on their own schedule. Copying the R&D
 * polling pattern here would put a spinner in front of an author implying somebody is reading their
 * survey this minute.
 *
 * ⚠️ THE IDEMPOTENCY KEY IS THE CALLER'S, not this hook's. It has to survive a retry of the same
 * attempt, which means it belongs to the component that owns the attempt — see
 * `useResettableAttemptIdempotencyKey`. A key minted in here would be new on every `mutate`, which
 * is the exact failure the mechanism exists to prevent.
 *
 * `onSuccess` invalidates the author's list, so a submission made this session appears on
 * `/studio/blueprints` without a reload.
 */
export function useSubmitTeardownMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      readonly draft: TeardownSubmissionDraft;
      readonly idempotencyKey: string;
    }) => unwrap(await submitTeardownForReview(variables)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.myTeardownSubmissions() });
    },
  });
}
