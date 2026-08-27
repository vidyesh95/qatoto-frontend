"use client";

// TRANSPORT: client-query — React Query over `@/lib/users/user-reports.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  decideUserReport,
  listMyProfileReports,
  listUserReports,
  reportUser,
  restoreUserProfileText,
} from "@/lib/users/user-reports.api";
import type {
  CreateUserReportInput,
  CreatedUserReport,
  DecideUserReportInput,
  ListUserReportsFilter,
  MyProfileReport,
  RestoreProfileTextInput,
  UserReportQueueItem,
} from "@/lib/users/user-reports.schemas";

export const userReportKeys = {
  all: ["user-reports"] as const,
  queueRoot: () => ["user-reports", "queue"] as const,
  queue: (filterKey: string) => ["user-reports", "queue", filterKey] as const,
  /** The caller's own reports — what `/report-history` reads. */
  mine: () => ["user-reports", "mine"] as const,
};

/**
 * Files a report.
 *
 * IT INVALIDATES THE REPORTER'S OWN LIST AND NOTHING ELSE. The profile they reported does not change
 * until a moderator decides, so touching anything else would be inventing a verdict. This hook used
 * to invalidate nothing at all, because the reporter had no list to look at — that was the gap
 * `listMyProfileReports` closed.
 */
export function useReportUserMutation(): UseMutationResult<
  ActionResponse<CreatedUserReport>,
  Error,
  { readonly reportedUserId: string; readonly input: CreateUserReportInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportedUserId, input }) => reportUser(reportedUserId, input),
    retry: false,
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: userReportKeys.mine() });
    },
  });
}

/** The caller's own profile reports. `retry: false` — a 401 is an answer, not a flake. */
export function useMyProfileReportsQuery() {
  return useQuery<ActionResponse<MyProfileReport[]>>({
    queryKey: userReportKeys.mine(),
    queryFn: () => listMyProfileReports(),
    retry: false,
  });
}

/**
 * The moderator queue.
 *
 * `isEnabled` IS A PARAMETER RATHER THAN AN ASSUMPTION. A disabled query sits in `pending` forever,
 * so a page that renders a spinner on `isPending` would spin permanently for anyone without the
 * capability — which is why the caller checks "restricted" before "loading" and passes the answer
 * down here. `video-report-queue-page.tsx` established that ordering.
 */
export function useUserReportQueueQuery(filter: ListUserReportsFilter = {}, isEnabled = true) {
  return useQuery<ActionResponse<{ rows: UserReportQueueItem[]; nextCursor: string | null }>>({
    queryKey: userReportKeys.queue(JSON.stringify(filter)),
    queryFn: () => listUserReports(filter),
    enabled: isEnabled,
  });
}

/**
 * Upholds or dismisses one report.
 *
 * Invalidates the whole queue PREFIX, not one filter: upholding closes every open report about that
 * person, so a row can leave the `open` list without having been the row that was clicked.
 */
export function useDecideUserReportMutation(): UseMutationResult<
  ActionResponse<CreatedUserReport>,
  Error,
  {
    readonly reportId: string;
    readonly input: DecideUserReportInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, input, idempotencyKey }) =>
      decideUserReport(reportId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    retry: false,
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: userReportKeys.queueRoot() });
    },
  });
}

export function useRestoreProfileTextMutation(): UseMutationResult<
  ActionResponse<{ reportedUserId: string }>,
  Error,
  { readonly input: RestoreProfileTextInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      restoreUserProfileText(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    retry: false,
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: userReportKeys.queueRoot() });
    },
  });
}
