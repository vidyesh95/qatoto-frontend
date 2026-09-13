// TRANSPORT: client-query — the reader-report intake and the reporter's own list.
//
// ⚠️ SEPARATE FROM `admin-reports.api.ts`, so a moderator call and a queue row never land in a
// public bundle by autocomplete. Same split `showcase-moderation.api.ts` states.

import {
  CreatedBlueprintReportSchema,
  MyBlueprintReportSchema,
  type BlueprintReportArm,
  type BlueprintReportReason,
  type CreatedBlueprintReport,
  type MyBlueprintReport,
} from "@/lib/blueprints/reports.schemas";
import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

const REPORT_ARM_SEGMENTS = {
  teardown: "teardowns",
  case_study: "case-studies",
} as const satisfies Record<BlueprintReportArm, string>;

/**
 * `POST /blueprints/<arm>/:slug/reports`.
 *
 * ⚠️ NO IDEMPOTENCY KEY, and it would be redundant: the server's partial unique index — one report
 * per person per target — already makes a double-submit a 409 rather than a second row.
 *
 * ⚠️ A QUARANTINED TEARDOWN STILL ACCEPTS ONE. A second rights holder may have an entirely
 * different objection from the first, and refusing would use one quarantine to blunt the control
 * that produced it.
 */
export function reportBlueprint(
  input: {
    readonly arm: BlueprintReportArm;
    readonly slug: string;
    readonly reason: BlueprintReportReason;
    readonly detailText: string | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<CreatedBlueprintReport>> {
  return sendJson(
    `/blueprints/${REPORT_ARM_SEGMENTS[input.arm]}/${encodeURIComponent(input.slug)}/reports`,
    "POST",
    { reason: input.reason, detailText: input.detailText },
    CreatedBlueprintReportSchema,
    options,
  );
}

/**
 * `GET /blueprints/reports/mine`.
 *
 * ⚠️ IT EXISTS BECAUSE "a report that vanishes is indistinguishable from one nobody read."
 * Deliberately narrow: no moderator identity (naming them makes a takedown personal), no
 * resolution note, and no count of who else reported the same target (that makes brigading
 * measurable). What it carries is the status.
 */
export function listMyBlueprintReports(
  options?: RequestOptions,
): Promise<ActionResponse<readonly MyBlueprintReport[]>> {
  return getJson("/blueprints/reports/mine", MyBlueprintReportSchema.array(), options);
}
