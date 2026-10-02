"use client";

// TRANSPORT: client-query — React Query over `@/lib/assistant/cloud-access-admin.api`.
//
// NOTHING OPTIMISTIC. A grant or a revoke changes who may spend Qatoto's Gemini key, so the list
// is refetched from the server after each one rather than patched in place.

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  grantCloudAccess,
  listCloudAccessGrants,
  revokeCloudAccess,
} from "@/lib/assistant/cloud-access-admin.api";
import type { CloudAccessGrant } from "@/lib/assistant/cloud-access-admin.schemas";
import { unwrap, type ApiRequestError } from "@/lib/http";

const cloudAccessKeys = {
  grants: () => ["assistant", "cloud-access", "grants"] as const,
};

interface CloudAccessGrantPage {
  readonly rows: CloudAccessGrant[];
  readonly nextCursor: string | null;
}

/** `isEnabled` is the capability check, so a viewer without it never fires a request that 403s. */
export function useCloudAccessGrantsQuery(isEnabled: boolean) {
  return useInfiniteQuery<
    CloudAccessGrantPage,
    ApiRequestError,
    InfiniteData<CloudAccessGrantPage, string | null>,
    ReturnType<typeof cloudAccessKeys.grants>,
    string | null
  >({
    queryKey: cloudAccessKeys.grants(),
    queryFn: async ({ pageParam }) => unwrap(await listCloudAccessGrants(pageParam)),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    retry: false,
  });
}

export function useGrantCloudAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { userId: string; grantedAt: string },
    ApiRequestError,
    { readonly email: string; readonly note: string | null }
  >({
    mutationFn: async (input) => unwrap(await grantCloudAccess(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cloudAccessKeys.grants() }),
  });
}

export function useRevokeCloudAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ revokedAt: string }, ApiRequestError, { readonly userId: string }>({
    mutationFn: async ({ userId }) => unwrap(await revokeCloudAccess(userId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cloudAccessKeys.grants() }),
  });
}
