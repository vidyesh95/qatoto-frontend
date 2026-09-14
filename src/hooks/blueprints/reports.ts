"use client";

// TRANSPORT: client-query — the reader-report intake and reporter history, over `@/lib/blueprints/reports.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { listMyBlueprintReports, reportBlueprint } from "@/lib/blueprints/reports.api";
import type {
  BlueprintReportArm,
  BlueprintReportReason,
  CreatedBlueprintReport,
  MyBlueprintReport,
} from "@/lib/blueprints/reports.schemas";
import { unwrap, type ActionResponse, type ApiRequestError } from "@/lib/http";

export interface ReportBlueprintVariables {
  readonly arm: BlueprintReportArm;
  readonly slug: string;
  readonly reason: BlueprintReportReason;
  readonly detailText: string | null;
}

/**
 * ⚠️ RETURNS THE `ActionResponse` RATHER THAN THROWING. The sheet branches on a 409 ("you have
 * already reported this") and a 403 ("you cannot report your own work") and renders the server's
 * own sentence for both — neither is an exception, and neither is anything to roll back.
 */
export function useReportBlueprintMutation(): UseMutationResult<
  ActionResponse<CreatedBlueprintReport>,
  Error,
  ReportBlueprintVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: ReportBlueprintVariables) => reportBlueprint(variables),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.myReports() });
    },
  });
}

/** The reporter's own history of blueprint reports. */
export function useMyBlueprintReportsQuery() {
  return useQuery<readonly MyBlueprintReport[], ApiRequestError>({
    queryKey: blueprintKeys.myReports(),
    queryFn: async () => unwrap(await listMyBlueprintReports()),
    retry: false,
  });
}
