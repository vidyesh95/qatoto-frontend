"use client";

// TRANSPORT: client-query — the reader-report intake, over `@/lib/blueprints/reports.api`.
//
// ⚠️ PENDING, AND IT WRITES NOTHING TO THE CACHE. A 201 is a receipt, not a verdict: nothing on
// this surface hides automatically, so there is no list to invalidate and nothing on the page
// changes. `useReportVideoMutation` states the same rule.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { reportBlueprint } from "@/lib/blueprints/reports.api";
import type {
  BlueprintReportArm,
  BlueprintReportReason,
  CreatedBlueprintReport,
} from "@/lib/blueprints/reports.schemas";
import type { ActionResponse } from "@/lib/http";

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
  return useMutation({
    mutationFn: (variables: ReportBlueprintVariables) => reportBlueprint(variables),
  });
}
