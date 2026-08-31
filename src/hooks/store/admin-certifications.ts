"use client";

// TRANSPORT: client-query — the staff certification queue.
//
// `isEnabled` IS THREADED FROM THE CAPABILITY CHECK, as in `admin-site-audits.ts`, so a viewer
// without `moderate_commerce` never fires a speculative request that comes back a refusal. And
// `retry: false`: a refusal is an answer, not a flake.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useKeysetList } from "@/hooks/keyset-list";

import type { ActionResponse } from "@/lib/http";
import {
  decideOrganizationCertification,
  downloadCertificationEvidence,
  listCertificationsForModeration,
} from "@/lib/store/admin-certifications.api";
import type {
  CertificationDecisionInput,
  ModerationCertification,
  ModerationCertificationState,
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

/**
 * The queue, oldest first, ACCUMULATING PAGES.
 *
 * `useKeysetList` is the app's one keyset accumulator; this read answers
 * `{ items, page: { nextCursor } }` rather than the `{ rows, nextCursor }` shape
 * `toCursorKeysetPage` adapts, so the mapping happens in `fetchPage` — `items` become rows and
 * the server's cursor becomes the token. Nothing here constructs or compares a cursor: a
 * fabricated one is a 422.
 *
 * `initialPage: null` because this console is a client island with no server-rendered first
 * page. Seeding an empty page instead would write a fabricated, authoritative-looking empty list
 * into the cache — the bug that hook's own banner is about.
 *
 * DISABLED UNTIL THE CAPABILITY CHECK ANSWERS. `useKeysetList` has no `enabled`, so the caller
 * gates by not mounting the read: passing a `fetchPage` that refuses locally would put an
 * invented refusal in the cache. See the component.
 */
export function useCertificationsForModerationList(state: ModerationCertificationState) {
  return useKeysetList<ModerationCertification>({
    queryKey: moderationCertificationKeys.forState(state),
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listCertificationsForModeration({
        state,
        // The token is the server's own opaque cursor, echoed back untouched.
        ...(typeof token === "string" ? { cursor: token } : {}),
      });
      return result.success
        ? {
            success: true,
            data: { rows: result.data.items, nextToken: result.data.page.nextCursor },
          }
        : result;
    },
  });
}

/**
 * One certificate's bytes, fetched ON DEMAND.
 *
 * A MUTATION RATHER THAN A QUERY, deliberately, and the reason is what the call does rather than
 * what it returns: every staff read writes `document_downloaded` to the seller's audit chain. A
 * query would refetch on invalidation, on remount, on whatever React Query decides — each one
 * another entry in somebody's permanent record for a read no human asked for. A mutation fires
 * exactly when a button is pressed.
 *
 * The blob is handed straight back. The caller makes the object URL and the caller revokes it.
 */
export function useCertificationEvidenceMutation(): UseMutationResult<
  ActionResponse<{ blob: Blob; mediaType: string; fileName: string | null }>,
  Error,
  { readonly organizationId: string; readonly certificationId: string }
> {
  return useMutation({
    mutationFn: ({ organizationId, certificationId }) =>
      downloadCertificationEvidence(organizationId, certificationId),
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
