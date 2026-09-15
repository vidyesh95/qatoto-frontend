// TRANSPORT: client-query — React Query hooks over `@/lib/blueprints/drafts.api`.
"use client";

// THE SAVE-AND-COME-BACK STORE for the three authoring wizards. One table, one `arm` column, and a
// document the server deliberately does not parse — a half-answered form is the state this exists
// to hold.
//
// ⚠️ EVERY WRITE INVALIDATES `draftsRoot()`, WHICH COVERS BOTH SHAPES ON PURPOSE. A save changes
// the list the draft belongs to and the draft's own entry, and the two live under one prefix. This
// used to be a hand-written `["blueprints", "drafts"]` literal in all three mutations; it is the
// factory now, so the spelling cannot drift from the queries it clears.
//
// ⚠️ `revision` IS THE WHOLE CONCURRENCY STORY. `replaceDraft` sends back the revision it loaded
// and the UPDATE guards on it, so two tabs editing one draft cannot silently overwrite each other
// — the last writer gets a stale-revision refusal instead. A caller that discards the receipt's
// revision breaks that, so every caller must store what comes back.

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
 *
 * AUTHOR-SCOPED SERVER-SIDE, so there is no user id to pass. Unpaged: the row cap is 25 and the
 * server returns at most that, so there is no cursor to thread.
 */
export function useMyDraftsQuery(arm?: BlueprintDraftArm) {
  return useQuery({
    queryKey: blueprintKeys.myDrafts(arm),
    queryFn: async () => unwrap(await listMyDrafts(arm)),
  });
}

/**
 * Reads a single draft by id. Disabled when `draftId` is null.
 *
 * ⚠️ A DISABLED QUERY SITS IN `isPending` FOREVER. A caller deriving a loading state from this must
 * check `draftId !== null` FIRST, or a page with no draft to load spins permanently.
 */
export function useMyDraftQuery(draftId: string | null) {
  return useQuery({
    queryKey: draftId === null ? blueprintKeys.draftPlaceholder() : blueprintKeys.draft(draftId),
    queryFn: async () => {
      // Unreachable while `enabled` is false; asserted rather than assumed so a future caller that
      // flips `enabled` cannot make this fetch `/drafts/null`.
      if (draftId === null) throw new Error("A draft id is required to read a draft.");
      return unwrap(await getMyDraft(draftId));
    },
    enabled: draftId !== null,
  });
}

/**
 * Creates a new draft.
 *
 * ⚠️ A 409 HERE IS THE 25-DRAFT CAP, NOT A RETRY. `MAX_BLUEPRINT_DRAFTS_PER_AUTHOR` bounds the
 * store per account; the answer is to delete one, which is why the studio list ships a delete
 * control beside every row rather than only a resume link.
 */
export function useCreateDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlueprintDraftInput) => unwrap(await createDraft(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.draftsRoot() });
    },
  });
}

/**
 * Replaces an existing draft, guarded on the revision the caller loaded.
 */
export function useReplaceDraftMutation(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReplaceBlueprintDraftInput) =>
      unwrap(await replaceDraft(draftId, input)),
    onSuccess: (receipt) => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.draftsRoot() });
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
 *
 * IRREVERSIBLE AND UNDO-LESS, which is why its control is a two-step confirm rather than a button.
 */
export function useDeleteDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => unwrap(await deleteDraft(draftId)),
    onSuccess: (_data, draftId) => {
      queryClient.removeQueries({ queryKey: blueprintKeys.draft(draftId) });
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.draftsRoot() });
    },
  });
}
