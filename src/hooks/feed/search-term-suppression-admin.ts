"use client";

// TRANSPORT: client-query — React Query over `@/lib/feed/search-term-suppression-admin.api`.
//
// NOTHING OPTIMISTIC. Lifting a suppression puts withheld public text back on the watch page, so
// the list is refetched from the server after each one rather than patched in place.

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { feedKeys } from "@/hooks/feed/keys";
import {
  liftSearchTermSuppression,
  listSearchTermSuppressions,
} from "@/lib/feed/search-term-suppression-admin.api";
import type { SuppressedSearchTerm } from "@/lib/feed/search-term-suppression-admin.schemas";
import { unwrap, type ApiRequestError } from "@/lib/http";

const searchTermSuppressionKeys = {
  list: () => ["feed", "admin", "search-term-suppressions"] as const,
};

interface SuppressedSearchTermPage {
  readonly rows: SuppressedSearchTerm[];
  readonly nextCursor: string | null;
}

/** `isEnabled` is the capability check, so a viewer without it never fires a request that 403s. */
export function useSuppressedSearchTermsQuery(isEnabled: boolean) {
  return useInfiniteQuery<
    SuppressedSearchTermPage,
    ApiRequestError,
    InfiniteData<SuppressedSearchTermPage, string | null>,
    ReturnType<typeof searchTermSuppressionKeys.list>,
    string | null
  >({
    queryKey: searchTermSuppressionKeys.list(),
    queryFn: async ({ pageParam }) => unwrap(await listSearchTermSuppressions(pageParam)),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Invalidates on SETTLED, not only success: a 404 means another moderator lifted the term first,
 * and the list should stop offering it either way.
 */
export function useLiftSearchTermSuppressionMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ term: string }, ApiRequestError, { readonly term: string }>({
    mutationFn: async ({ term }) => unwrap(await liftSearchTermSuppression(term)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: searchTermSuppressionKeys.list() });
      void queryClient.invalidateQueries({ queryKey: feedKeys.searchRoot() });
    },
  });
}
