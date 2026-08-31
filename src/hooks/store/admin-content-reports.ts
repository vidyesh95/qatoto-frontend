"use client";

// TRANSPORT: client-query — the staff commerce-moderation console: two keyset reads and two writes.
//
// ⚠️ **`useKeysetList` HAS NO `enabled`, SO THE CAPABILITY GATE IS "DO NOT MOUNT".** The component
// renders the tab subtree only once `moderate_commerce` is confirmed. Passing a `fetchPage` that
// refuses locally would write an INVENTED refusal into the cache — a message no server sent, which
// a later successful check would then have to fight. `admin-certifications.ts` states the same rule
// and this file follows it rather than re-deriving it.
//
// ⚠️ **BOTH WRITES INVALIDATE THE ROOT, NEVER ONE FILTER, AND THAT IS NOT CAUTION — IT IS THE
// CONTRACT.** A decision closes EVERY open report on the target, so rows leave the `open` list and
// arrive in `actioned`/`dismissed` together. Every write also appends to the moderation log, which
// is a different tab reading a different route. The root key covers all of it; anything narrower
// leaves a list on screen that is now a lie.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import type { ActionResponse } from "@/lib/http";
import {
  decideCommerceContentReport,
  listCommerceContentReports,
  listCommerceModerationActions,
  restoreCommerceContent,
} from "@/lib/store/admin-content-reports.api";
import type {
  CommerceContentReport,
  CommerceModerationAction,
  CommerceContentTargetKind,
  CommerceReportStatus,
  DecideCommerceReportInput,
  RestoreCommerceContentInput,
} from "@/lib/store/content-reports.schemas";

/**
 * Prefixed `["store", "admin", …]` so a domain-wide invalidation reaches it, the shape
 * `moderationCertificationKeys` already uses.
 *
 * THE FILTERS ARE IN THE KEY BECAUSE THEY ARE SERVER FILTERS; THE CURSOR IS NOT. The pages of one
 * filtered queue accumulate under a single entry — that is what `useKeysetList` is accumulating —
 * so putting a cursor in the key would make every "load newer" a brand-new list that discards the
 * rows already on screen.
 */
export const commerceModerationKeys = {
  all: ["store", "admin", "commerce-moderation"] as const,
  reportQueue: (status: CommerceReportStatus, targetKind: CommerceContentTargetKind | "all") =>
    ["store", "admin", "commerce-moderation", "reports", status, targetKind] as const,
  actionLog: (targetKind: CommerceContentTargetKind | "all") =>
    ["store", "admin", "commerce-moderation", "actions", targetKind] as const,
};

/**
 * The report queue, OLDEST FIRST, accumulating pages.
 *
 * `initialPage: null` — this console is a client island with no server-rendered first page. Seeding
 * an empty one instead would write a fabricated, authoritative-looking empty queue into the cache
 * that, under `staleTime: Infinity`, would never refetch. That is the bug the hook's own banner is
 * about.
 *
 * The read answers `{ items, page: { nextCursor } }` while the accumulator wants `{ rows, nextToken }`,
 * so the rename happens here in `fetchPage`. Nothing constructs or compares a cursor.
 */
export function useCommerceReportQueue(
  status: CommerceReportStatus,
  targetKind: CommerceContentTargetKind | "all",
): KeysetListResult<CommerceContentReport> {
  return useKeysetList<CommerceContentReport>({
    queryKey: commerceModerationKeys.reportQueue(status, targetKind),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(
        mapItemsToRows(
          await listCommerceContentReports({
            status,
            ...(targetKind === "all" ? {} : { targetKind }),
            ...(typeof token === "string" ? { cursor: token } : {}),
          }),
        ),
      ),
  });
}

/**
 * The moderation-action log.
 *
 * ⚠️ **NO `status` PARAMETER, DELIBERATELY.** The route accepts one — it shares a query schema with
 * the queue above — and then reads only `targetKind` and `cursor`. Threading a status through here
 * would produce a control that changes the key, refetches, and returns identical rows.
 */
export function useCommerceModerationActionLog(
  targetKind: CommerceContentTargetKind | "all",
): KeysetListResult<CommerceModerationAction> {
  return useKeysetList<CommerceModerationAction>({
    queryKey: commerceModerationKeys.actionLog(targetKind),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(
        mapItemsToRows(
          await listCommerceModerationActions({
            ...(targetKind === "all" ? {} : { targetKind }),
            ...(typeof token === "string" ? { cursor: token } : {}),
          }),
        ),
      ),
  });
}

/**
 * `{ items, page }` -> `{ rows, nextCursor }`, the one adaptation both reads need.
 *
 * A local helper rather than two copies: the two routes answer the same envelope and a divergence
 * between the copies would surface as one tab silently stopping at page one.
 */
function mapItemsToRows<TRow>(
  result: ActionResponse<{ items: TRow[]; page: { nextCursor: string | null } }>,
): ActionResponse<{ rows: TRow[]; nextCursor: string | null }> {
  return result.success
    ? { success: true, data: { rows: result.data.items, nextCursor: result.data.page.nextCursor } }
    : result;
}

/**
 * Upholds or dismisses one report.
 *
 * The `idempotencyKey` is a required argument rather than minted here, and that is the point: a key
 * created inside this hook would be shared by every card the hook is mounted for, and the second
 * decision on a page would come back as a REPLAY of the first — same row returned, second report
 * never decided, console showing success. The card owns the key and rotates it only on a confirmed
 * success.
 */
export function useDecideCommerceReportMutation(): UseMutationResult<
  ActionResponse<CommerceContentReport>,
  Error,
  {
    readonly reportId: string;
    readonly input: DecideCommerceReportInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, input, idempotencyKey }) =>
      decideCommerceContentReport(reportId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: commerceModerationKeys.all });
    },
  });
}

/**
 * Puts hidden content back.
 *
 * Invalidates the same root: a restore writes an action row the log tab must show, and it may also
 * be the answer to a report still sitting in the `actioned` list.
 */
export function useRestoreCommerceContentMutation(): UseMutationResult<
  ActionResponse<CommerceModerationAction>,
  Error,
  { readonly input: RestoreCommerceContentInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      restoreCommerceContent(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: commerceModerationKeys.all });
    },
  });
}
