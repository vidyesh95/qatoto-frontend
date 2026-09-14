// TRANSPORT: client-query — the blueprint report queue and the four verbs that answer it.
//
// ⚠️ SEPARATE FROM `reports.api.ts`, so a moderator call and a queue row never land in a public
// bundle by autocomplete. Same split `showcase-moderation.api.ts` states and for the same reason.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC. Every one of these is a statement the platform makes about
// somebody's work; a 409 means another moderator got there first, and the card renders the
// server's own message rather than guessing.

import {
  BlueprintModerationResultSchema,
  BlueprintReportQueuePageSchema,
  type BlueprintModerationResult,
  type BlueprintModerationVerb,
  type BlueprintReportArmFilter,
  type BlueprintReportQueuePage,
  type BlueprintReportStatus,
} from "@/lib/blueprints/admin-reports.schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

/** `GET /blueprints/admin/content-reports` — oldest first, keyset-paged. */
export function listBlueprintReportQueue(
  filter: {
    readonly status: BlueprintReportStatus;
    readonly targetKind?: BlueprintReportArmFilter;
    readonly cursor?: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintReportQueuePage>> {
  const queryString = buildQueryString({
    status: filter.status,
    targetKind: filter.targetKind,
    cursor: filter.cursor,
  });
  return getJson(
    `/blueprints/admin/content-reports${queryString}`,
    BlueprintReportQueuePageSchema,
    options,
  );
}

/**
 * `POST /blueprints/admin/{teardowns,case-studies,showcases}/:id/moderation-state`.
 *
 * ⚠️ ADDRESSED BY THE ROW'S ID, NOT ITS SLUG, which is the opposite of the reader's report route —
 * and both are right. A reader is standing on a public page and the slug is the only handle they
 * have; a moderator is working a queue that hands them an id. It would also be unspellable on the
 * case-study arm, whose `public_slug` is NULL until a moderator mints one.
 *
 * Passing `reportId` automatically moves the answered report from `open` to `actioned`.
 */
export function setBlueprintModerationState(
  input: {
    readonly targetKind: BlueprintReportArmFilter;
    readonly targetId: string;
    readonly verb: BlueprintModerationVerb;
    readonly reasonNote: string;
    readonly idempotencyKey: string;
    readonly reportId?: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintModerationResult>> {
  let segment: string;
  switch (input.targetKind) {
    case "teardown":
      segment = "teardowns";
      break;
    case "case_study":
      segment = "case-studies";
      break;
    case "showcase":
      segment = "showcases";
      break;
    default: {
      const exhaustiveCheck: never = input.targetKind;
      throw new Error(`Unhandled targetKind: ${String(exhaustiveCheck)}`);
    }
  }

  const payload = {
    verb: input.verb,
    reasonNote: input.reasonNote,
    ...(input.reportId ? { reportId: input.reportId } : {}),
  };

  return sendJson(
    `/blueprints/admin/${segment}/${encodeURIComponent(input.targetId)}/moderation-state`,
    "POST",
    payload,
    BlueprintModerationResultSchema,
    { ...options, headers: { "Idempotency-Key": input.idempotencyKey } },
  );
}

/**
 * `POST /blueprints/admin/content-reports/:reportId/dismiss`.
 *
 * ⚠️ DISMISSING RESTORES NOTHING. Nothing flags a row except a moderator deciding to, so a
 * dismissal has nothing to undo — and quietly un-flagging something a DIFFERENT moderator flagged
 * would overturn their decision as a side effect of answering a reader.
 */
export function dismissBlueprintReport(
  input: {
    readonly reportId: string;
    readonly resolutionNote: string;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ readonly reportId: string }>> {
  return sendJson(
    `/blueprints/admin/content-reports/${encodeURIComponent(input.reportId)}/dismiss`,
    "POST",
    { resolutionNote: input.resolutionNote },
    BlueprintReportQueuePageSchema.shape.items.element.pick({ reportId: true }),
    { ...options, headers: { "Idempotency-Key": input.idempotencyKey } },
  );
}
