"use client";

// TRANSPORT: client-query — React Query over `@/lib/platform/feedback.api`.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  sendPlatformFeedback,
  type FeedbackReceived,
  type SendPlatformFeedbackInput,
} from "@/lib/platform/feedback.api";

/**
 * Files one piece of feedback.
 *
 * IT INVALIDATES NOTHING, because nothing on this surface reads feedback back. There is no
 * "my feedback" list and no queue in the viewer's app, so a cache to refresh does not exist
 * yet — when the staff queue lands it will bring its own key factory rather than borrow one
 * invented here in advance.
 *
 * `retry: false`, like the report mutations: a refusal here is a 429 or a validation error,
 * and retrying either one just spends the person's remaining budget on the same answer.
 */
export function useSendPlatformFeedbackMutation(): UseMutationResult<
  ActionResponse<FeedbackReceived>,
  Error,
  SendPlatformFeedbackInput
> {
  return useMutation({
    mutationFn: (input) => sendPlatformFeedback(input),
    retry: false,
  });
}
