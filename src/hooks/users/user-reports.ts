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
  listUserReports,
  reportUser,
  restoreUserProfileText,
} from "@/lib/users/user-reports.api";
import type {
  CreateUserReportInput,
  CreatedUserReport,
  DecideUserReportInput,
  ListUserReportsFilter,
  RestoreProfileTextInput,
  UserReportQueueItem,
} from "@/lib/users/user-reports.schemas";

export const userReportKeys = {
  all: ["user-reports"] as const,
  queueRoot: () => ["user-reports", "queue"] as const,
  queue: (filterKey: string) => ["user-reports", "queue", filterKey] as const,
};

/**
 * Files a report.
 *
 * NOTHING IS INVALIDATED. The reporter sees no list of their own profile reports — there is no such
 * read — and the profile they reported does not change until a moderator decides. Inventing a cache
 * update here would be inventing a verdict.
 */
export function useReportUserMutation(): UseMutationResult<
  ActionResponse<CreatedUserReport>,
  Error,
  { readonly reportedUserId: string; readonly input: CreateUserReportInput }
> {
  return useMutation({
    mutationFn: ({ reportedUserId, input }) => reportUser(reportedUserId, input),
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
