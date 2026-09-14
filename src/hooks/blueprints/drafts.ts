// TRANSPORT: client-query — React Query hooks over `@/lib/blueprints/drafts.api`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import {
  createDraft,
  deleteDraft,
  getMyDraft,
  listMyDrafts,
  replaceDraft,
} from "@/lib/blueprints/drafts.api";
import type {
  BlueprintDraftArm,
  CreateBlueprintDraftInput,
  ReplaceBlueprintDraftInput,
} from "@/lib/blueprints/drafts.schemas";
import { unwrap } from "@/lib/http";

/**
 * Lists the caller's drafts, optionally filtered by arm.
 */
export function useMyDraftsQuery(arm?: BlueprintDraftArm) {
  return useQuery({
    queryKey: blueprintKeys.myDrafts(arm),
    queryFn: async () => unwrap(await listMyDrafts(arm)),
  });
}

/**
 * Reads a single draft by ID. Disabled if draftId is null.
 */
export function useMyDraftQuery(draftId: string | null) {
  return useQuery({
    queryKey: draftId ? blueprintKeys.draft(draftId) : ["blueprints", "drafts", "null"],
    queryFn: async () => {
      if (!draftId) throw new Error("Draft ID is required");
      return unwrap(await getMyDraft(draftId));
    },
    enabled: draftId !== null,
  });
}

/**
 * Creates a new draft. Invalidates draft lists on success.
 */
export function useCreateDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlueprintDraftInput) => unwrap(await createDraft(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blueprints", "drafts"] });
    },
  });
}

/**
 * Replaces an existing draft with optimistic concurrency check.
 */
export function useReplaceDraftMutation(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReplaceBlueprintDraftInput) =>
      unwrap(await replaceDraft(draftId, input)),
    onSuccess: (receipt) => {
      void queryClient.invalidateQueries({ queryKey: ["blueprints", "drafts"] });
      queryClient.setQueryData(blueprintKeys.draft(draftId), (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          revision: receipt.revision,
          updatedAt: receipt.updatedAt,
        };
      });
    },
  });
}

/**
 * Deletes a draft.
 */
export function useDeleteDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => unwrap(await deleteDraft(draftId)),
    onSuccess: (_data, draftId) => {
      queryClient.removeQueries({ queryKey: blueprintKeys.draft(draftId) });
      void queryClient.invalidateQueries({ queryKey: ["blueprints", "drafts"] });
    },
  });
}
