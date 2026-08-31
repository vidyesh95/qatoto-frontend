"use client";

// TRANSPORT: client-query — authoring a curated product set.
//
// NOTHING HERE IS OPTIMISTIC. A pathway save is a plan a moderator will read and a shopper will be
// shown; a row that flickers into place and then reverts teaches the author their work was saved
// when it was not.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  createPathway,
  listAuthoredPathways,
  replacePathwayImage,
  savePathwayPlan,
  submitPathway,
  updatePathway,
  type PathwayPlanSaveProgress,
} from "@/lib/store/pathway-authoring.api";
import type {
  CreatePathwayInput,
  PathwayAuthoring,
  PathwayAuthoringPage,
  PathwayCandidateInput,
  PathwayImageSlot,
  PathwaySlotInput,
  UpdatePathwayInput,
} from "@/lib/store/pathway-authoring.schemas";

export const pathwayAuthoringKeys = {
  all: ["store", "pathway-authoring"] as const,
  mine: () => ["store", "pathway-authoring", "mine"] as const,
};

/** Every set this caller may author, drafts included. */
export function usePathwaysMineQuery() {
  return useQuery<ActionResponse<PathwayAuthoringPage>>({
    queryKey: pathwayAuthoringKeys.mine(),
    queryFn: () => listAuthoredPathways({}),
    retry: false,
  });
}

export function useCreatePathwayMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  { readonly input: CreatePathwayInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createPathway(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayAuthoringKeys.all });
    },
  });
}

export function useUpdatePathwayMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  {
    readonly pathwayId: string;
    readonly patch: UpdatePathwayInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathwayId, patch, idempotencyKey }) =>
      updatePathway(pathwayId, patch, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayAuthoringKeys.all });
    },
  });
}

export function useReplacePathwayImageMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  {
    readonly pathwayId: string;
    readonly imageSlot: PathwayImageSlot;
    readonly imageFile: File;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathwayId, imageSlot, imageFile, idempotencyKey }) =>
      replacePathwayImage(pathwayId, imageSlot, imageFile, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayAuthoringKeys.all });
    },
  });
}

/**
 * Saves the WHOLE plan — slots and every slot's candidates.
 *
 * ⚠️ **THERE IS DELIBERATELY NO PER-SLOT MUTATION IN THIS FILE.** Saving slots alone
 * cascade-deletes every candidate under the pathway, so a hook that exposed it would be a
 * data-loss primitive sitting in autocomplete next to the safe one. `savePathwayPlan` is the only
 * door.
 *
 * The key FACTORY rather than a single key: the save is `1 + slotCount` separate requests, and
 * replaying one key across all of them would make every candidate write after the first a replay
 * of the slot write.
 */
export function useSavePathwayPlanMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  {
    readonly pathwayId: string;
    readonly slots: readonly {
      readonly slot: PathwaySlotInput;
      readonly candidates: readonly PathwayCandidateInput[];
    }[];
    readonly makeIdempotencyKey: () => string;
    readonly onProgress?: (progress: PathwayPlanSaveProgress) => void;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathwayId, slots, makeIdempotencyKey, onProgress }) =>
      savePathwayPlan(pathwayId, slots, makeIdempotencyKey, onProgress),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayAuthoringKeys.all });
    },
  });
}

export function useSubmitPathwayMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  { readonly pathwayId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathwayId, idempotencyKey }) =>
      submitPathway(pathwayId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayAuthoringKeys.all });
    },
  });
}
