"use client";

// TRANSPORT: client-query — React Query over `@/lib/platform/admin-feedback.api`, the staff half.
//
// SAME KEY FACTORY AS THE MEMBER HOOK, different keys inside it. One factory per domain is what
// lets a triage decision invalidate the queue AND the submitter's own list without either
// spelling being restated here.

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import { feedbackKeys } from "@/hooks/platform/feedback-keys";
import { unwrap, type ApiRequestError } from "@/lib/http";
import {
  decidePlatformFeedback,
  listPlatformFeedbackQueue,
} from "@/lib/platform/admin-feedback.api";
import type {
  OwnPlatformFeedback,
  PlatformFeedbackDecision,
  PlatformFeedbackStatus,
  StaffPlatformFeedback,
} from "@/lib/platform/feedback.schemas";

interface StaffFeedbackPage {
  readonly rows: StaffPlatformFeedback[];
  readonly nextCursor: string | null;
}

/**
 * The queue.
 *
 * `isEnabled` IS THREADED FROM THE CAPABILITY CHECK so a viewer without `moderate_content`
 * never fires a speculative request that can only 403.
 *
 * ⚠️ `useInfiniteQuery`, WHERE THE SUPPORT QUEUE USES A PLAIN `useQuery`. That one accepts a
 * cursor, receives a `nextCursor` and drops it on the floor, so it shows exactly one server
 * page and a moderator cannot reach row 21. Copying the structure was right; copying that was
 * not.
 */
export function usePlatformFeedbackQueueQuery(
  statusFilter: PlatformFeedbackStatus | undefined,
  isEnabled: boolean,
) {
  return useInfiniteQuery<
    StaffFeedbackPage,
    ApiRequestError,
    InfiniteData<StaffFeedbackPage, string | null>,
    ReturnType<typeof feedbackKeys.queue>,
    string | null
  >({
    queryKey: feedbackKeys.queue(statusFilter),
    queryFn: async ({ pageParam }) =>
      unwrap(
        await listPlatformFeedbackQueue({
          ...(statusFilter === undefined ? {} : { status: statusFilter }),
          ...(pageParam === null ? {} : { cursor: pageParam }),
        }),
      ),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Mark a note read, or close it.
 *
 * INVALIDATES BOTH ROOTS, not one filter. Triage moves the row between filtered queue lists, so
 * every one of them is now wrong; and it changes the word the SUBMITTER reads on their own
 * page, which is a different cache entry in a different part of the app that would otherwise
 * sit stale until something else happened to refetch it.
 *
 * NOTHING OPTIMISTIC AND NO IDEMPOTENCY KEY — see `admin-feedback.api.ts` for why the key that
 * every other decision write in this app carries is absent here.
 */
export function useDecidePlatformFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    OwnPlatformFeedback,
    ApiRequestError,
    { readonly feedbackId: string; readonly decision: PlatformFeedbackDecision }
  >({
    mutationFn: async (variables) =>
      unwrap(await decidePlatformFeedback(variables.feedbackId, { decision: variables.decision })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.queueRoot() });
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.mineRoot() });
    },
  });
}
