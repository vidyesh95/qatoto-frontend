"use client";

// TRANSPORT: client-query — React Query over `@/lib/account/channel-profile.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/hooks/account/keys";
import { getMyChannelProfile, updateMyChannelProfile } from "@/lib/account/channel-profile.api";
import { unwrap } from "@/lib/http";
import type {
  ChannelProfileDraft,
  UpdateChannelProfileInput,
} from "@/lib/account/channel-profile.schemas";

/** The creator's own description and links, as they may edit them. */
export function useMyChannelProfileQuery() {
  return useQuery<ChannelProfileDraft>({
    queryKey: accountKeys.channelProfile(),
    queryFn: async () => unwrap(await getMyChannelProfile()),
    retry: false,
  });
}

/**
 * Replaces both.
 *
 * `unwrap` so the editor branches on `ApiRequestError` and can render the backend's own message —
 * "Links must start with https://" names the field and the fix, where a generic failure would send
 * somebody hunting.
 *
 * IT WRITES THE RESPONSE STRAIGHT INTO THE CACHE rather than invalidating. The route answers the
 * SAVED state, re-read server-side with the link order it assigned, so the answer is strictly
 * better than anything a refetch would produce and costs one round trip fewer.
 */
export function useUpdateMyChannelProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<ChannelProfileDraft, Error, UpdateChannelProfileInput>({
    mutationFn: async (input) => unwrap(await updateMyChannelProfile(input)),
    retry: false,
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(accountKeys.channelProfile(), savedProfile);
    },
  });
}
