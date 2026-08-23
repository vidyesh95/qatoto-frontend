"use client";

// TRANSPORT: client-query — both halves of video content reporting, reporter and staff.
//
// ONE FILE, TWO AUDIENCES, and the api layer is split where this one is not: the reporter's
// two calls and the moderator's three are different FILES under `src/lib/videos/` so nobody
// imports a moderation route into a viewer surface by autocomplete. Hooks carry no such
// hazard — a hook is named for what it does and is not reachable by guessing a path — and
// splitting them would mean two query-key factories for one domain.
//
// NOTHING IS OPTIMISTIC. A report is a claim about someone else and a decision is a statement
// the platform makes about a creator's work; both are the wrong place for a rollback.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap, type ApiRequestError } from "@/lib/http";
import {
  decideVideoReport,
  listVideoReportQueue,
  restoreVideo,
  type ListVideoReportsFilter,
  type VideoReportQueueRow,
} from "@/lib/videos/admin-content-reports.api";
import {
  listMyVideoReports,
  reportVideo,
  type MyVideoReport,
  type ReportVideoInput,
} from "@/lib/videos/content-reports.api";

export const videoReportKeys = {
  all: ["video-reports"] as const,
  /** The reporter's own list. No user id in the key — the cookie decides who "me" is. */
  mine: () => ["video-reports", "mine"] as const,
  queueRoot: () => ["video-reports", "queue"] as const,
  // The status filter is a SERVER filter, so it belongs in the key; `cursor` does not — the
  // pages of one filtered queue accumulate under one entry.
  queue: (filter: ListVideoReportsFilter) => ["video-reports", "queue", filter.status] as const,
};

/**
 * Files a report.
 *
 * NO CACHE WRITE ON SUCCESS beyond the reporter's own list. The video the report is about is
 * unchanged — a 201 is not a verdict, nothing hides automatically here — so invalidating the
 * feed would refetch a page whose contents cannot have moved.
 */
export function useReportVideoMutation(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportVideoInput) => unwrap(await reportVideo(videoId, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: videoReportKeys.mine() });
    },
  });
}

/** The reporter's own history — `/report-history`. 401 when signed out, which is a real answer. */
export function useMyVideoReportsQuery() {
  return useQuery<readonly MyVideoReport[], ApiRequestError>({
    queryKey: videoReportKeys.mine(),
    queryFn: async () => unwrap(await listMyVideoReports()),
    // A 403/401 is an answer, not a flake — retrying it three times just delays the message.
    retry: false,
  });
}

/**
 * The staff queue.
 *
 * `isEnabled` IS THREADED FROM THE CAPABILITY CHECK, not defaulted to true, so a viewer
 * without `moderate_content` never fires a speculative request that can only 403. The page
 * turns the same boolean into a `restricted` view state — and checks it BEFORE `isPending`,
 * because a disabled React Query sits in `pending` forever and would otherwise render a
 * spinner that never resolves for anyone without the capability.
 */
export function useVideoReportQueueQuery(filter: ListVideoReportsFilter, isEnabled: boolean) {
  return useQuery<{ data: VideoReportQueueRow[]; nextCursor: string | null }, ApiRequestError>({
    queryKey: videoReportKeys.queue(filter),
    queryFn: async () => unwrap(await listVideoReportQueue(filter)),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Hides a video, or dismisses the report.
 *
 * RE-READING THE QUEUE IS THIS HOOK'S JOB, and it is the whole reason the api function
 * answers one row rather than a page — `admin-community.api.ts` carries the bug note about a
 * console that parsed a page from a write and showed an error on every successful decision.
 */
export function useDecideVideoReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly reportId: string;
      readonly decision: "actioned" | "dismissed";
      readonly note?: string;
    }) =>
      unwrap(
        await decideVideoReport(variables.reportId, {
          decision: variables.decision,
          ...(variables.note === undefined ? {} : { note: variables.note }),
        }),
      ),
    onSuccess: () => {
      // The ROOT, not one filter: actioning closes every open report on that video, so rows
      // move out of `open` and into `actioned` together and both lists are now wrong.
      void queryClient.invalidateQueries({ queryKey: videoReportKeys.queueRoot() });
    },
  });
}

/** Puts a hidden video back. Separate from a dismissal — see the api file. */
export function useRestoreVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly reasonNote: string }) =>
      unwrap(await restoreVideo(variables)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: videoReportKeys.queueRoot() });
    },
  });
}
