"use client";

// TRANSPORT: client-query — React Query over `@/lib/rnd/import-intelligence.api`.
//
// ⚠️ THE MUTATION HERE IS NOT OPTIMISTIC AND CANNOT BE. It asks a language model what a
// factory costs. There is no plausible local answer to show while the server thinks, and
// inventing one would put a capital figure in front of somebody that nobody has produced —
// the same rule `compensation.ts` states for a countersignature, applied to a number a
// founder might borrow against.
//
// ⚠️ IT ANSWERS 202, AND A 202 IS NOT A RESULT. Success means a job is queued. The detail then
// POLLS the commodity read until `narrativeStatus` leaves `pending`, and gives up after a
// bounded number of attempts rather than spinning forever — a worker that is not running is a
// real state and the panel has to be able to say so.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import { getImportCommodity, requestPathwayNarrative } from "@/lib/rnd/import-intelligence.api";

/**
 * How long the detail keeps asking whether the narrative has been written.
 *
 * ⚠️ BOUNDED ON PURPOSE. The job runs in a separate worker process; if that worker is not
 * running, `pending` never changes and an unbounded poll is a spinner forever plus a request
 * every three seconds for as long as the tab is open. Twenty attempts at three seconds is a
 * minute — comfortably past a Gemini call, and short enough that "this is not being picked up"
 * gets said rather than implied.
 */
const NARRATIVE_POLL_INTERVAL_MS = 3000;

/** How long the panel waits before saying nothing has picked the job up. */
export const NARRATIVE_POLL_GIVE_UP_MS = 60_000;

/**
 * One commodity's detail, polled while its narrative is still being written.
 *
 * `enabled` is false with no HS code, so selecting nothing fetches nothing.
 */
export function useImportCommodityQuery(
  hsCode: string | undefined,
  reporterCountryCode: string | undefined,
  /**
   * When to stop polling, as an epoch millisecond, or null to never start.
   *
   * ⚠️ THE CALLER OWNS THIS DEADLINE so the hook and the panel cannot disagree about whether
   * the wait is over. Both compare it against the same `dataUpdatedAt`, which is a number
   * React Query already holds — no second clock, and nothing calls `Date.now()` during a
   * render.
   */
  giveUpAtMs: number | null = null,
) {
  return useQuery({
    queryKey: rndKeys.importCommodity(hsCode ?? "none", reporterCountryCode),
    queryFn: async () => {
      if (hsCode === undefined) throw new Error("Missing HS code");
      return unwrap(await getImportCommodity(hsCode, reporterCountryCode));
    },
    enabled: hsCode !== undefined,
    refetchInterval: (query) => {
      const detail = query.state.data;
      if (detail === undefined) return false;
      // Stop the moment the row leaves `pending` — `generated`, `failed` and
      // `skipped_unconfigured` are all final answers, and two of them are answers the panel
      // renders differently rather than retries.
      if (detail.assessment?.narrativeStatus !== "pending") return false;
      // The caller's deadline, compared against the same timestamp the panel reads. Nothing
      // polls until somebody has asked for a narrative, so a null deadline means no poll.
      if (giveUpAtMs === null || query.state.dataUpdatedAt > giveUpAtMs) return false;
      return NARRATIVE_POLL_INTERVAL_MS;
    },
  });
}

/**
 * Ask for one assessment's pathway narrative and capital band.
 *
 * ⚠️ NOTHING IS WRITTEN TO THE CACHE ON SUCCESS, because success carries nothing to write. The
 * response is a status and the poll above is what eventually produces content. Invalidating is
 * the only correct reaction: it makes the query re-ask now instead of waiting out an interval.
 */
export function useRequestPathwayNarrativeMutation(
  hsCode: string | undefined,
  reporterCountryCode: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => unwrap(await requestPathwayNarrative(assessmentId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: rndKeys.importCommodity(hsCode ?? "none", reporterCountryCode),
      });
    },
  });
}
