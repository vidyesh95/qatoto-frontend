// TRANSPORT: client-query — the moderator's side of teardowns, against the Express backend:
// reading the review queue and deciding one submission.
//
// ⚠️ SEPARATE FROM `authoring.api.ts`, AND THAT IS A SECURITY BOUNDARY. A pending teardown has no
// public address at all — it is a survey of another company's product that nobody outside this
// queue may read. Nothing under `src/components/home` or `src/components/studio` may import this
// file, and the check is
// `rg "blueprints/teardown-moderation" src/components/home src/components/studio`, which must print
// nothing. The path prefix matters: a bare `teardown-moderation` also matches the public quarantine
// banner, `teardowns/sections/teardown-moderation-notice`.
//
// ⚠️ SO THESE RESPONSES MUST NEVER BE CACHED SHARED. Every other read on this surface is
// caller-independent and deliberately cacheable; these two depend entirely on who is asking.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC. The card waits for the answer, and a 409 means another moderator
// got there first — which the card says with a way to refresh rather than a retry.
//
// A MODERATOR DECIDING THEIR OWN SUBMISSION IS A 403, enforced by the backend.

import {
  TeardownModerationResultSchema,
  TeardownReviewQueuePageSchema,
  type TeardownModerationDecision,
  type TeardownModerationResult,
  type TeardownReviewQueuePage,
} from "@/lib/blueprints/teardown-moderation.schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

/**
 * `GET /blueprints/admin/teardowns/review-queue` — submissions waiting for a decision, oldest first.
 *
 * Oldest first because newest-first starves its own tail, and the submission that has waited longest
 * is the one owed an answer.
 *
 * ⚠️ A MALFORMED CURSOR IS A 422 FROM THE SERVER, NOT A SILENT FIRST PAGE. A queue that quietly
 * restarts shows a moderator submissions they already decided.
 *
 * ⚠️ A ROW MAY ARRIVE WITH A DOCUMENT THE SERVER COULD NOT PARSE, and that is the point of the
 * union on `document` rather than a failure: one submission written against an older shape must not
 * take the whole page down, because this console is the only place any of them can be seen.
 */
export function listTeardownReviewQueue(
  filter: { readonly cursor?: string; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<TeardownReviewQueuePage>> {
  const path = `/blueprints/admin/teardowns/review-queue${buildQueryString({ ...filter })}`;
  return getJson(path, TeardownReviewQueuePageSchema, options);
}

/**
 * `POST /blueprints/admin/teardowns/:submissionId/moderate` — publish or send back.
 *
 * `idempotencyKey` is the caller's, minted once per card and rotated on any decision input and after
 * success. The server fingerprints the body, so the same key with a corrected thumbnail is a replay
 * of the old one.
 *
 * PUBLISHING MINTS THE SLUG SERVER-SIDE and the result carries it; a send-back answers with
 * `publicSlug: null`, because a teardown that was sent back has no public address.
 *
 * ⚠️ ONE REFUSAL HERE HAS NO SIBLING ON THE OTHER ARMS: **422, the stored document no longer
 * parses**. The server will not publish a document it could not read. The card's `unparseable` arm
 * exists so that request is never sent — it hides the publish control rather than offering one whose
 * refusal a moderator cannot act on.
 */
export function moderateTeardownSubmission(
  moderationRequest: {
    readonly submissionId: string;
    readonly decision: TeardownModerationDecision;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<TeardownModerationResult>> {
  return sendJson(
    `/blueprints/admin/teardowns/${encodeURIComponent(moderationRequest.submissionId)}/moderate`,
    "POST",
    moderationRequest.decision,
    TeardownModerationResultSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": moderationRequest.idempotencyKey },
    },
  );
}
