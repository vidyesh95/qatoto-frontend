// TRANSPORT: client-query — React Query hooks over `@/lib/blueprints/case-study-authoring.api`, which is
// itself mock. Written as if the api were real, so this file does not change on the day it is.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import {
  listMyCaseStudySubmissions,
  submitCaseStudyForReview,
} from "@/lib/blueprints/case-study-authoring.api";
import type { CaseStudySubmissionDraft } from "@/lib/blueprints/case-study-authoring.schemas";
import { unwrap } from "@/lib/http";

/** `/studio/case-studies`. Writer-scoped server-side; there is no user id to pass. */
export function useMyCaseStudySubmissionsQuery() {
  return useQuery({
    queryKey: blueprintKeys.myCaseStudySubmissions(),
    queryFn: async () => unwrap(await listMyCaseStudySubmissions()),
  });
}

/**
 * Send a case study for review.
 *
 * ⚠️ NO `refetchInterval` AND NO OPTIMISTIC UPDATE, for the reasons `useSubmitShowcaseMutation` gives.
 * ⚠️ THE IDEMPOTENCY KEY IS THE CALLER'S, so it survives a retry of the same attempt.
 */
export function useSubmitCaseStudyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      readonly draft: CaseStudySubmissionDraft;
      readonly idempotencyKey: string;
    }) => unwrap(await submitCaseStudyForReview(variables)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.myCaseStudySubmissions() });
    },
  });
}
