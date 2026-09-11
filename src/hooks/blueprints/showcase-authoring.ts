// TRANSPORT: client-query — React Query hooks over `@/lib/blueprints/showcase-authoring.api`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import {
  listMyShowcaseSubmissions,
  submitShowcaseForReview,
  uploadShowcaseWriteUpImage,
} from "@/lib/blueprints/showcase-authoring.api";
import type { ShowcaseSubmissionDraft } from "@/lib/blueprints/showcase-authoring.schemas";
import { unwrap } from "@/lib/http";

/** `/studio/launches`. Maker-scoped server-side; there is no user id to pass. */
export function useMyShowcaseSubmissionsQuery() {
  return useQuery({
    queryKey: blueprintKeys.myShowcaseSubmissions(),
    queryFn: async () => unwrap(await listMyShowcaseSubmissions()),
  });
}

/**
 * Post a launch for review.
 *
 * ⚠️ NO `refetchInterval` AND NO OPTIMISTIC UPDATE. The launch lands `pending_review` and a person
 * decides it; there is nothing to poll to a verdict.
 *
 * ⚠️ THE IDEMPOTENCY KEY IS THE CALLER'S. It must survive a retry of the same attempt, so it belongs
 * to the component that owns the attempt (`useResettableAttemptIdempotencyKey`).
 */
export function useSubmitShowcaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      readonly draft: ShowcaseSubmissionDraft;
      readonly headingImageFile: File;
      readonly idempotencyKey: string;
    }) => unwrap(await submitShowcaseForReview(variables)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.myShowcaseSubmissions() });
    },
  });
}

/**
 * Upload one image for the write-up.
 *
 * Returns the `ActionResponse` rather than throwing, so the write-up field branches on `success` and
 * says why an image was refused beside the field. Nothing to invalidate: an upload changes no list.
 */
export function useUploadShowcaseWriteUpImageMutation() {
  return useMutation({
    mutationFn: (imageFile: File) => uploadShowcaseWriteUpImage(imageFile),
  });
}
