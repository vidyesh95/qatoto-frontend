// TRANSPORT: client-query — the moderator's side of case studies, against the Express backend:
// reading the review queue and deciding one case study.
//
// ⚠️ SEPARATE FROM `case-study-authoring.api.ts`, AND THAT IS A SECURITY BOUNDARY. These rows carry
// a company name its writer withheld from READERS, which only a `moderate_content` holder may see.
// Nothing under `src/components/home` or `src/components/studio` may import this file, and the
// check is `rg "case-study-moderation" src/components/home src/components/studio`, which must
// print nothing.
//
// ⚠️ SO THESE RESPONSES MUST NEVER BE CACHED SHARED. Every other read on this surface is
// caller-independent and deliberately cacheable; these two depend entirely on who is asking.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC. The card waits for the answer, and a 409 means another moderator
// got there first — which the card says with a way to refresh rather than a retry.
//
// A MODERATOR DECIDING THEIR OWN CASE STUDY IS A 403, which the backend enforces and the mock this
// replaced could not produce: it had no idea who was signed in.

import {
  CaseStudyModerationResultSchema,
  CaseStudyReviewQueuePageSchema,
  type CaseStudyModerationDecision,
  type CaseStudyModerationResult,
  type CaseStudyReviewQueuePage,
} from "@/lib/blueprints/case-study-moderation.schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

/**
 * `GET /blueprints/admin/case-studies/review-queue` — case studies waiting for a decision, oldest
 * first.
 *
 * Oldest first because newest-first starves its own tail, and the submission that has waited longest
 * is the one owed an answer.
 *
 * ⚠️ A MALFORMED CURSOR IS A 422 FROM THE SERVER, NOT A SILENT FIRST PAGE, which is a change from the
 * mock this replaced (it served the first page, the house rule for a reader-facing keyset list). A
 * queue that quietly restarts shows a moderator case studies they already decided.
 */
export function listCaseStudyReviewQueue(
  filter: { readonly cursor?: string; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudyReviewQueuePage>> {
  const path = `/blueprints/admin/case-studies/review-queue${buildQueryString({ ...filter })}`;
  return getJson(path, CaseStudyReviewQueuePageSchema, options);
}

/**
 * `POST /blueprints/admin/case-studies/:submissionId/moderate` — publish or send back.
 *
 * `idempotencyKey` is the caller's, minted once per card and rotated on a note edit, a changed
 * decision and after success — the fix for the pathway queue's reused key. The server fingerprints
 * the body, so the same key with a different decision is a 409.
 *
 * PUBLISHING MINTS THE SLUG SERVER-SIDE and the result carries it; a send-back answers with
 * `publicSlug: null`, because a case study that was sent back has no public address.
 */
export function moderateCaseStudySubmission(
  moderationRequest: {
    readonly submissionId: string;
    readonly decision: CaseStudyModerationDecision;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudyModerationResult>> {
  return sendJson(
    `/blueprints/admin/case-studies/${encodeURIComponent(moderationRequest.submissionId)}/moderate`,
    "POST",
    moderationRequest.decision,
    CaseStudyModerationResultSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": moderationRequest.idempotencyKey },
    },
  );
}
