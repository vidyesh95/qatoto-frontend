"use client";

// TRANSPORT: client-query — React Query over `@/lib/playlists/api`.
//
// EVERY MUTATION IS KEYED BY ID. The context this replaces keyed `updatePlaylist` by the
// playlist's PREVIOUS TITLE, so two playlists renamed to the same string merged into one and
// a rename raced against itself. Ids do not have that failure mode.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listMyPlaylists,
  replacePlaylistVideos,
  updatePlaylist,
} from "@/lib/playlists/api";
import type {
  CreatePlaylistInput,
  ListMyPlaylistsFilter,
  PublicPlaylist,
  UpdatePlaylistInput,
} from "@/lib/playlists/schemas";
import { unwrap } from "@/lib/http";

export const playlistKeys = {
  all: ["playlists"] as const,
  listRoot: () => ["playlists", "list"] as const,
  list: (filter: ListMyPlaylistsFilter) =>
    ["playlists", "list", filter.page, filter.limit] as const,
  detail: (playlistId: string) => ["playlists", "detail", playlistId] as const,
};

export function useMyPlaylistsQuery(filter: ListMyPlaylistsFilter = {}) {
  return useQuery({
    queryKey: playlistKeys.list(filter),
    queryFn: async () => unwrap(await listMyPlaylists(filter)),
  });
}

export function usePlaylistQuery(playlistId: string, isEnabled = true) {
  return useQuery({
    queryKey: playlistKeys.detail(playlistId),
    queryFn: async () => unwrap(await getPlaylist(playlistId)),
    enabled: isEnabled && playlistId !== "",
    retry: false,
  });
}

/**
 * Adopts the returned playlist as the cached detail and marks the list stale.
 *
 * Same reasoning as the series tree: every write answers the complete playlist, including its
 * ordered video list, so refetching would be asking for what we were just handed. The LIST
 * still needs invalidating because `videoCount` lives on the row, not in the detail we adopted.
 */
function usePlaylistAdoption() {
  const queryClient = useQueryClient();
  return (playlist: PublicPlaylist): void => {
    queryClient.setQueryData(playlistKeys.detail(playlist.id), playlist);
    void queryClient.invalidateQueries({ queryKey: playlistKeys.listRoot() });
  };
}

export function useCreatePlaylistMutation() {
  const adoptPlaylist = usePlaylistAdoption();
  return useMutation({
    mutationFn: async (input: CreatePlaylistInput) => unwrap(await createPlaylist(input)),
    onSuccess: adoptPlaylist,
  });
}

export function useUpdatePlaylistMutation() {
  const adoptPlaylist = usePlaylistAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly playlistId: string;
      readonly input: UpdatePlaylistInput;
    }) => unwrap(await updatePlaylist(variables.playlistId, variables.input)),
    onSuccess: adoptPlaylist,
  });
}

export function useDeletePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: string) => unwrap(await deletePlaylist(playlistId)),
    onSuccess: (_data, playlistId) => {
      queryClient.removeQueries({ queryKey: playlistKeys.detail(playlistId) });
      void queryClient.invalidateQueries({ queryKey: playlistKeys.listRoot() });
    },
  });
}

/** The only route that sets playlist ORDER — position comes from the array index. */
export function useReplacePlaylistVideosMutation() {
  const adoptPlaylist = usePlaylistAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly playlistId: string;
      readonly videoIds: readonly string[];
    }) => unwrap(await replacePlaylistVideos(variables.playlistId, variables.videoIds)),
    onSuccess: adoptPlaylist,
  });
}
