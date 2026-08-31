"use client";

// TRANSPORT: client-query — the staff certification queue.
//
// `isEnabled` IS THREADED FROM THE CAPABILITY CHECK, as in `admin-site-audits.ts`, so a viewer
// without `moderate_commerce` never fires a speculative request that comes back a refusal. And
// `retry: false`: a refusal is an answer, not a flake.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  decideOrganizationCertification,
  listCertificationsForModeration,
} from "@/lib/store/admin-certifications.api";
import type {
  CertificationDecisionInput,
  ModerationCertificationPage,
  ModerationCertificationQuery,
} from "@/lib/store/admin-certifications.schemas";
import type { OwnedCertification } from "@/lib/store/organizations.schemas";

export const moderationCertificationKeys = {
  all: ["store", "admin", "certifications"] as const,
  /**
   * Keyed by the state being read, because `pending` and `approved` are two different questions
   * about the same table and must not share a cache entry — deciding a row empties the first list
   * and fills the second.
   */
  forState: (state: string) => ["store", "admin", "certifications", state] as const,
};

/** The queue, oldest first. `state` omitted asks the server for its default, which is `pending`. */
export function useCertificationsForModerationQuery(
  query: ModerationCertificationQuery,
  isEnabled: boolean,
) {
  return useQuery<ActionResponse<ModerationCertificationPage>>({
    queryKey: moderationCertificationKeys.forState(query.state ?? "pending"),
    queryFn: () => listCertificationsForModeration(query),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Approve or reject one claim.
 *
 * NOTHING OPTIMISTIC. An approval publishes a compliance claim to every buyer browsing the
 * directory and a rejection sends the seller a reason they read verbatim; neither may appear
 * before the server has said it happened. On success the whole queue is invalidated rather than
 * the row patched, because a decision moves the row between two lists.
 *
 * A **409** is a finding — the row was already decided, or the moderator submitted it themselves
 * and cannot review their own claim. Surface the backend's sentence; do not retry.
 */
export function useDecideCertificationMutation(): UseMutationResult<
  ActionResponse<OwnedCertification>,
  Error,
  {
    readonly certificationId: string;
    readonly input: CertificationDecisionInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ certificationId, input, idempotencyKey }) =>
      decideOrganizationCertification(certificationId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: moderationCertificationKeys.all });
    },
  });
}
