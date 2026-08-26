"use client";

// TRANSPORT: client-query — React Query over `@/lib/series/api`.
//
// EVERY MUTATION HERE ANSWERS THE WHOLE SERIES TREE, so `onSuccess` writes it straight into the
// detail cache with `setQueryData` instead of invalidating and refetching. The server just told
// us the complete new state; asking again would be a round trip to learn what we already hold.
//
// The LIST is still invalidated, because a season added to one series changes that series'
// `seasonCount` on the list row, which the tree does not contain.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEpisode,
  createSeason,
  createSeries,
  deleteEpisode,
  deleteSeason,
  deleteSeries,
  getSeries,
  listMySeries,
  removeSeriesPoster,
  replaceSeriesPoster,
  updateEpisode,
  updateSeason,
  updateSeries,
} from "@/lib/series/api";
import type {
  CreateEpisodeInput,
  CreateSeasonInput,
  CreateSeriesInput,
  ListMySeriesFilter,
  PublicSeries,
  UpdateEpisodeInput,
  UpdateSeasonInput,
  UpdateSeriesInput,
} from "@/lib/series/schemas";
import { unwrap } from "@/lib/http";

export const seriesKeys = {
  all: ["series"] as const,
  listRoot: () => ["series", "list"] as const,
  list: (filter: ListMySeriesFilter) => ["series", "list", filter.page, filter.limit] as const,
  detail: (seriesId: string) => ["series", "detail", seriesId] as const,
};

export function useMySeriesQuery(filter: ListMySeriesFilter = {}) {
  return useQuery({
    queryKey: seriesKeys.list(filter),
    queryFn: async () => unwrap(await listMySeries(filter)),
  });
}

export function useSeriesQuery(seriesId: string, isEnabled = true) {
  return useQuery({
    queryKey: seriesKeys.detail(seriesId),
    queryFn: async () => unwrap(await getSeries(seriesId)),
    enabled: isEnabled && seriesId !== "",
    retry: false,
  });
}

/**
 * Adopts a returned tree as the cached detail, and marks the list stale.
 *
 * The tree is authoritative and complete — that is the shape of this API — so adopting it is
 * strictly better than a refetch, and it means an episode edit updates the season grid in the
 * same tick the request resolves.
 */
function useSeriesTreeAdoption() {
  const queryClient = useQueryClient();
  return (series: PublicSeries): void => {
    queryClient.setQueryData(seriesKeys.detail(series.id), series);
    void queryClient.invalidateQueries({ queryKey: seriesKeys.listRoot() });
  };
}

export function useCreateSeriesMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (input: CreateSeriesInput) => unwrap(await createSeries(input)),
    onSuccess: adoptTree,
  });
}

export function useUpdateSeriesMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly input: UpdateSeriesInput;
    }) => unwrap(await updateSeries(variables.seriesId, variables.input)),
    onSuccess: adoptTree,
  });
}

/**
 * The poster pair. Both answer the refreshed series, so both adopt the tree exactly as the
 * metadata mutations do — an upload that returned only a URL would leave the cached series
 * showing the old poster until something else invalidated it.
 *
 * SEPARATE FROM `useUpdateSeriesMutation` on purpose, even though `PATCH /series/:id` also
 * accepts a `posterUrl`. That field takes a URL STRING and cannot be nulled; these two own the
 * bytes this platform stores. Routing an upload through the patch would mean the client
 * inventing a URL it does not control.
 */
export function useReplaceSeriesPosterMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: { readonly seriesId: string; readonly imageFile: File }) =>
      unwrap(await replaceSeriesPoster(variables.seriesId, variables.imageFile)),
    onSuccess: adoptTree,
  });
}

export function useRemoveSeriesPosterMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (seriesId: string) => unwrap(await removeSeriesPoster(seriesId)),
    onSuccess: adoptTree,
  });
}

/** The one mutation with no tree to adopt — the series is gone. */
export function useDeleteSeriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seriesId: string) => unwrap(await deleteSeries(seriesId)),
    onSuccess: (_data, seriesId) => {
      queryClient.removeQueries({ queryKey: seriesKeys.detail(seriesId) });
      void queryClient.invalidateQueries({ queryKey: seriesKeys.listRoot() });
    },
  });
}

export function useCreateSeasonMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly input: CreateSeasonInput;
    }) => unwrap(await createSeason(variables.seriesId, variables.input)),
    onSuccess: adoptTree,
  });
}

export function useUpdateSeasonMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly seasonId: string;
      readonly input: UpdateSeasonInput;
    }) => unwrap(await updateSeason(variables.seriesId, variables.seasonId, variables.input)),
    onSuccess: adoptTree,
  });
}

export function useDeleteSeasonMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: { readonly seriesId: string; readonly seasonId: string }) =>
      unwrap(await deleteSeason(variables.seriesId, variables.seasonId)),
    onSuccess: adoptTree,
  });
}

export function useCreateEpisodeMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly seasonId: string;
      readonly input: CreateEpisodeInput;
    }) => unwrap(await createEpisode(variables.seriesId, variables.seasonId, variables.input)),
    onSuccess: adoptTree,
  });
}

export function useUpdateEpisodeMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly seasonId: string;
      readonly episodeId: string;
      readonly input: UpdateEpisodeInput;
    }) =>
      unwrap(
        await updateEpisode(
          variables.seriesId,
          variables.seasonId,
          variables.episodeId,
          variables.input,
        ),
      ),
    onSuccess: adoptTree,
  });
}

export function useDeleteEpisodeMutation() {
  const adoptTree = useSeriesTreeAdoption();
  return useMutation({
    mutationFn: async (variables: {
      readonly seriesId: string;
      readonly seasonId: string;
      readonly episodeId: string;
    }) => unwrap(await deleteEpisode(variables.seriesId, variables.seasonId, variables.episodeId)),
    onSuccess: adoptTree,
  });
}
