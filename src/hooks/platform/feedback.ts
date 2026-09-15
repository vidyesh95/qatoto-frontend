"use client";

// TRANSPORT: client-query — React Query over `@/lib/platform/feedback.api`, the submitter's half.
//
// NOTHING IS OPTIMISTIC. A note is somebody's account of what went wrong, and the only thing
// that ever moves on the row afterwards is a staff triage flag. There is nothing here worth
// guessing ahead of the server.

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseMutationResult } from "@tanstack/react-query";

import { feedbackKeys } from "@/hooks/platform/feedback-keys";
import { unwrap, type ActionResponse, type ApiRequestError } from "@/lib/http";
import { listOwnPlatformFeedback, sendPlatformFeedback } from "@/lib/platform/feedback.api";
import type {
  FeedbackReceived,
  OwnPlatformFeedback,
  PlatformFeedbackStatus,
  SendPlatformFeedbackInput,
} from "@/lib/platform/feedback.schemas";

interface OwnFeedbackPage {
  readonly rows: OwnPlatformFeedback[];
  readonly nextCursor: string | null;
}

/**
 * Files one piece of feedback.
 *
 * ⚠️ IT USED TO INVALIDATE NOTHING, AND THE COMMENT SAYING SO WAS RIGHT UNTIL IT WAS NOT.
 * The old note read: "there is no 'my feedback' list and no queue in the viewer's app, so a
 * cache to refresh does not exist yet." There is one now, directly below, and a send that left
 * it stale would show somebody an unchanged list a second after they pressed the button — the
 * most visible possible way to look broken.
 *
 * IT STILL RETURNS THE TAGGED RESULT RATHER THAN THROWING, unlike the reads beside it. The
 * composer branches on `result.success` to tell a 429 from a validation refusal and prints the
 * server's own sentence; `unwrap`ping here would turn both into one thrown error and lose that.
 *
 * `retry: false`, like the report mutations: a refusal here is a 429 or a validation error,
 * and retrying either one just spends the person's remaining budget on the same answer.
 */
export function useSendPlatformFeedbackMutation(): UseMutationResult<
  ActionResponse<FeedbackReceived>,
  Error,
  SendPlatformFeedbackInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => sendPlatformFeedback(input),
    retry: false,
    onSuccess: (result) => {
      // GUARDED ON `result.success`, because this mutation resolves rather than throws: a
      // refused send reaches `onSuccess` too, and invalidating there would refetch a list that
      // gained nothing.
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.mineRoot() });
    },
  });
}

/**
 * The caller's own notes.
 *
 * `isEnabled` IS THREADED FROM THE SESSION SEED, not defaulted to true, so a signed-out viewer
 * never fires a request that can only 401. The page turns the same boolean into a `signedOut`
 * view state and checks it BEFORE `isPending`, because a disabled query sits pending forever
 * and would otherwise spin for everybody who is not signed in.
 */
export function useOwnPlatformFeedbackQuery(
  statusFilter: PlatformFeedbackStatus | undefined,
  isEnabled: boolean,
) {
  return useInfiniteQuery<
    OwnFeedbackPage,
    ApiRequestError,
    InfiniteData<OwnFeedbackPage, string | null>,
    ReturnType<typeof feedbackKeys.mine>,
    string | null
  >({
    queryKey: feedbackKeys.mine(statusFilter),
    queryFn: async ({ pageParam }) =>
      unwrap(
        await listOwnPlatformFeedback({
          ...(statusFilter === undefined ? {} : { status: statusFilter }),
          ...(pageParam === null ? {} : { cursor: pageParam }),
        }),
      ),
    initialPageParam: null,
    // `?? undefined` — React Query reads undefined as "no more pages"; a null would be sent
    // back as a cursor.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    // A 401 is an answer, not a flake — retrying it three times only delays the message.
    retry: false,
  });
}
