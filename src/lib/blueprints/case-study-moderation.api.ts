// TRANSPORT: mock — no network call is made. There is no case-study table and no moderation route on
// the Express backend, so nothing here persists and nothing here pretends to.
//
// ⚠️ SEPARATE FROM `case-study-authoring.api.ts`, on the pathways precedent, so moderation calls and
// the moderator rows (which carry withheld company names) never land in a studio or public bundle.
//
// ⚠️ EVERYTHING EXCEPT PERSISTENCE IS REAL, as in the author-side mock: the queue pages with an opaque
// cursor, the decision is parsed against the real contract, the idempotency key travels, a decided
// submission answers 409 and the result has the shape the route would answer with. What does not
// happen is storage, so a decided card returns when the page reloads, and the page header says so once.
//
// ⚠️ A MODERATOR DECIDING THEIR OWN CASE STUDY IS A 403 THE MOCK CANNOT PRODUCE: it has no idea who is
// signed in. The backend enforces it; the card already renders any refusal the route sends.
//
// WHEN THE BACKEND ARRIVES: `listCaseStudyReviewQueue` becomes one `getJson` and
// `moderateCaseStudySubmission` one `sendJson` with the `Idempotency-Key` header, against the same
// schemas, and the header disclosure on the page is deleted.

import {
  CaseStudyModerationDecisionSchema,
  CaseStudyModerationResultSchema,
  CaseStudyReviewItemSchema,
  type CaseStudyModerationDecision,
  type CaseStudyModerationResult,
  type CaseStudyReviewQueuePage,
} from "@/lib/blueprints/case-study-moderation.schemas";
import type { ActionResponse } from "@/lib/http";
import {
  MOCK_ALREADY_DECIDED_CASE_STUDY_SUBMISSION_IDS,
  MOCK_CASE_STUDY_REVIEW_QUEUE,
} from "@/mocks/blueprints-case-study-review-mocks";

/** How long the mock takes to "answer", so loading and deciding states are visible. */
const MOCK_LATENCY_MS = 600;

/** Fixture-sized on purpose, so the four sample rows need a second page. */
const REVIEW_QUEUE_PAGE_LIMIT = 3;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/** The opaque cursor: the last row's id, base64-encoded. Opaque by contract, readable by nobody else. */
function encodeQueueCursor(submissionId: string): string {
  return btoa(submissionId);
}

/** The id a cursor points after, or `null` when it is not one this mock issued. */
function decodeQueueCursor(cursor: string): string | null {
  return BASE64_PATTERN.test(cursor) ? atob(cursor) : null;
}

/** Lower-case words joined by hyphens, as the backend mints a slug from a title on publish. */
function buildSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * `GET /blueprints/admin/case-studies/review-queue` — case studies waiting for a decision, oldest
 * first. An unresolvable cursor serves the first page, the house rule for every keyset list here.
 */
export async function listCaseStudyReviewQueue(filter: {
  readonly cursor?: string;
}): Promise<ActionResponse<CaseStudyReviewQueuePage>> {
  await wait(MOCK_LATENCY_MS);

  const queueRows = MOCK_CASE_STUDY_REVIEW_QUEUE.map((candidate) =>
    CaseStudyReviewItemSchema.parse(candidate),
  );
  const afterSubmissionId = filter.cursor === undefined ? null : decodeQueueCursor(filter.cursor);
  // `findIndex` answers -1 for an id this queue does not hold, and -1 + 1 is the first page.
  const startIndex =
    afterSubmissionId === null
      ? 0
      : queueRows.findIndex((row) => row.submissionId === afterSubmissionId) + 1;
  const pageRows = queueRows.slice(startIndex, startIndex + REVIEW_QUEUE_PAGE_LIMIT);
  const hasMore = startIndex + REVIEW_QUEUE_PAGE_LIMIT < queueRows.length;
  const lastPageRow = pageRows.at(-1);

  return {
    success: true,
    data: {
      items: pageRows,
      page: {
        nextCursor:
          hasMore && lastPageRow !== undefined ? encodeQueueCursor(lastPageRow.submissionId) : null,
        hasMore,
      },
    },
  };
}

/**
 * `POST /blueprints/admin/case-studies/:submissionId/moderate` — publish or send back.
 *
 * ⚠️ NOTHING IS OPTIMISTIC. The card waits for this answer, and a 409 means another moderator got
 * there first, which the card says with a way to refresh rather than a retry.
 */
export async function moderateCaseStudySubmission(moderationRequest: {
  readonly submissionId: string;
  readonly decision: CaseStudyModerationDecision;
  readonly idempotencyKey: string;
}): Promise<ActionResponse<CaseStudyModerationResult>> {
  await wait(MOCK_LATENCY_MS);

  const submission = MOCK_CASE_STUDY_REVIEW_QUEUE.find(
    (row) => row.submissionId === moderationRequest.submissionId,
  );
  if (submission === undefined) {
    return {
      success: false,
      error: { code: "404", message: "This case study is no longer in the queue." },
    };
  }

  // The route parses the body itself; a client-side check is only ever a mirror of this.
  const parsedDecision = CaseStudyModerationDecisionSchema.safeParse(moderationRequest.decision);
  if (!parsedDecision.success) {
    return {
      success: false,
      error: {
        code: "422",
        message: parsedDecision.error.issues[0]?.message ?? "That decision could not be read.",
      },
    };
  }

  if (MOCK_ALREADY_DECIDED_CASE_STUDY_SUBMISSION_IDS.has(submission.submissionId)) {
    return {
      success: false,
      error: {
        code: "409",
        message:
          "Another moderator already decided this case study. Refresh the queue to see what is still waiting.",
      },
    };
  }

  return {
    success: true,
    data: CaseStudyModerationResultSchema.parse({
      submissionId: submission.submissionId,
      moderationState: parsedDecision.data.decision,
      publicSlug:
        parsedDecision.data.decision === "published" ? buildSlugFromTitle(submission.title) : null,
      decidedAt: new Date().toISOString(),
    }),
  };
}
