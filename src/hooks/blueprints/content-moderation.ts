"use client";

// TRANSPORT: client-query — the blueprint report queue and the four verbs, over
// `@/lib/blueprints/admin-reports.api`.
//
// ⚠️ NOTHING IS OPTIMISTIC, AND THAT IS THE RULE FOR EVERY VERB HERE. Each one is a statement the
// platform makes about somebody's work. A 409 means another moderator decided first; the card
// renders the server's own message and refetches rather than guessing at a new state.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  dismissBlueprintReport,
  listBlueprintReportQueue,
  setBlueprintModerationState,
} from "@/lib/blueprints/admin-reports.api";
import type {
  BlueprintModerationResult,
  BlueprintModerationVerb,
  BlueprintReportArmFilter,
  BlueprintReportQueueItem,
  BlueprintReportStatus,
} from "@/lib/blueprints/admin-reports.schemas";
import type { ActionResponse } from "@/lib/http";

/**
 * ⚠️ `status` IS IN THE QUERY KEY AND THE CURSOR IS NOT. The status is a SERVER filter — it changes
 * which rows come back — while the cursor pages within one filter, which `useKeysetList` already
 * holds under a single key.
 *
 * No `enabled`: the page mounts this only once `moderate_content` is confirmed, which is the same
 * "do not mount" gate the three review queues use.
 */
export function useBlueprintReportQueue(
  status: BlueprintReportStatus,
): KeysetListResult<BlueprintReportQueueItem> {
  return useKeysetList<BlueprintReportQueueItem>({
    queryKey: blueprintKeys.reportQueue(status),
    // No server-rendered first page; seeding an empty one would fake an empty queue.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listBlueprintReportQueue({
        status,
        ...(typeof token === "string" ? { cursor: token } : {}),
      });
      return toCursorKeysetPage(
        result.success
          ? {
              success: true,
              data: { rows: result.data.items, nextCursor: result.data.page.nextCursor },
            }
          : result,
      );
    },
  });
}

export function useRefreshBlueprintReportQueue(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: blueprintKeys.all });
  };
}

/** Flag, quarantine or restore one published blueprint. */
export function useBlueprintModerationMutation(status: BlueprintReportStatus): UseMutationResult<
  ActionResponse<BlueprintModerationResult>,
  Error,
  {
    readonly targetKind: BlueprintReportArmFilter;
    readonly targetId: string;
    readonly verb: BlueprintModerationVerb;
    readonly reasonNote: string;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => setBlueprintModerationState(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      /*
       * ⚠️ THE WHOLE QUEUE, NOT THE ONE ROW. A verb changes the TARGET'S state, and every other
       * open report about that same target now describes a state that no longer holds — so their
       * `targetModerationState` is stale too. Patching one row would leave the rest lying.
       */
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.reportQueue(status) });
    },
  });
}

/** Dismiss one report. ⚠️ This restores nothing — see the transport's docblock. */
export function useDismissBlueprintReportMutation(
  status: BlueprintReportStatus,
): UseMutationResult<
  ActionResponse<{ readonly reportId: string }>,
  Error,
  { readonly reportId: string; readonly resolutionNote: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => dismissBlueprintReport(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.reportQueue(status) });
    },
  });
}
