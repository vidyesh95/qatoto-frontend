// TRANSPORT: client-query — the showcase launch review queue and its decision, against the Express
// backend. Both routes check `moderate_content` server-side before reading any id.
//
// ⚠️ SEPARATE FROM `showcase-authoring.api.ts`, so moderator calls and review rows never land in a
// studio or public bundle.
//
// ⚠️ NOTHING IS OPTIMISTIC. A 409 means another moderator decided first; a 403 on a decision can mean
// this moderator posted the launch. The card renders the server's own message for both.

import {
  ShowcaseModerationResultSchema,
  ShowcaseReviewQueuePageSchema,
  type ShowcaseModerationDecision,
  type ShowcaseModerationResult,
  type ShowcaseReviewQueuePage,
} from "@/lib/blueprints/showcase-moderation.schemas";
import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `GET /blueprints/admin/showcases/review-queue` — launches waiting for a decision, oldest first.
 * The cursor is opaque; a malformed one is a 422 from the server, never a silent first page.
 */
export function listShowcaseReviewQueue(
  filter: { readonly cursor?: string },
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseReviewQueuePage>> {
  const queryString =
    filter.cursor === undefined ? "" : `?cursor=${encodeURIComponent(filter.cursor)}`;
  return getJson(
    `/blueprints/admin/showcases/review-queue${queryString}`,
    ShowcaseReviewQueuePageSchema,
    options,
  );
}

/** `POST /blueprints/admin/showcases/:submissionId/moderate` — publish or send back. */
export function moderateShowcaseSubmission(
  moderationRequest: {
    readonly submissionId: string;
    readonly decision: ShowcaseModerationDecision;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseModerationResult>> {
  return sendJson(
    `/blueprints/admin/showcases/${encodeURIComponent(moderationRequest.submissionId)}/moderate`,
    "POST",
    moderationRequest.decision,
    ShowcaseModerationResultSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": moderationRequest.idempotencyKey },
    },
  );
}
