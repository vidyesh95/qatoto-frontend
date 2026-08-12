"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/messages.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  appendThreadMessage,
  createOrGetProductInquiry,
  listThreadMessages,
  listThreads,
} from "@/lib/store/messages.api";
import type {
  ListThreadsFilter,
  ProductInquiry,
  ThreadMessage,
} from "@/lib/store/messages.schemas";

export function useThreadInboxQuery(filter: ListThreadsFilter = {}) {
  return useQuery({
    queryKey: storeKeys.threadInbox(filter.resourceKind),
    queryFn: () => listThreads(filter),
    retry: false,
  });
}

/**
 * One thread's messages.
 *
 * `enabled` on a non-null id, because a sheet opens before its thread exists — the inquiry write is
 * what mints one, and a speculative read with no id would 404 for every buyer who has not asked
 * anything yet.
 */
export function useThreadMessagesQuery(threadId: string | null) {
  return useQuery({
    queryKey: storeKeys.threadMessages(threadId ?? "none"),
    queryFn: () => {
      if (threadId === null) throw new Error("Missing thread id");
      return listThreadMessages(threadId, { limit: 50 });
    },
    enabled: threadId !== null,
    retry: false,
  });
}

/**
 * Opens or returns the conversation about a product.
 *
 * SAFE TO PRESS TWICE — the route is `createOrGet`, so a second press returns the same thread
 * rather than a second one. Nothing here needs to check first.
 */
export function useCreateProductInquiry(): UseMutationResult<
  ActionResponse<ProductInquiry>,
  Error,
  { readonly productId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, idempotencyKey }) =>
      createOrGetProductInquiry(productId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.threadInboxRoot() });
    },
  });
}

/**
 * Posts a message.
 *
 * INVALIDATES RATHER THAN APPENDING. The write answers the ONE message, and splicing it onto the
 * cached page would put the client in charge of an order the server owns — a concurrent message
 * from the other side would then sit in the wrong place, or vanish. A refetch of a 50-message page
 * is cheap and cannot be wrong.
 *
 * The inbox is invalidated too: a new message moves the thread's preview and its position.
 */
export function useAppendThreadMessage(): UseMutationResult<
  ActionResponse<ThreadMessage>,
  Error,
  { readonly threadId: string; readonly bodyText: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, bodyText, idempotencyKey }) =>
      appendThreadMessage(
        threadId,
        { bodyText },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (result, { threadId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.threadMessages(threadId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.threadInboxRoot() });
    },
  });
}
