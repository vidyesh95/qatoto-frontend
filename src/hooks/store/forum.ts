"use client";

// TRANSPORT: client-query — the one mutation on the forum surface.
//
// The thread list and thread detail are public server fetches and are deliberately not here — same
// call as `hooks/store/providers.ts` and `hooks/store/factories.ts`.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { createForumThread } from "@/lib/store/forum.api";
import type { CreatedForumThread, CreateForumThreadInput } from "@/lib/store/forum.schemas";

/**
 * Queues a new thread for moderation.
 *
 * IT INVALIDATES NOTHING, and that follows from the state the row comes back in. A
 * `pending_review` thread appears in no public read, so the thread list this frontend caches is
 * still correct after a successful submit — refetching it would show the author exactly what they
 * saw before and imply their post had failed.
 *
 * The idempotency key is minted by the composer, once per attempt.
 */
export function useCreateForumThread(): UseMutationResult<
  ActionResponse<CreatedForumThread>,
  Error,
  { readonly input: CreateForumThreadInput; readonly idempotencyKey: string }
> {
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createForumThread(input, { headers: { "Idempotency-Key": idempotencyKey } }),
  });
}
