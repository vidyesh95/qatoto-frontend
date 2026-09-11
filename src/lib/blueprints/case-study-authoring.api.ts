// TRANSPORT: mock — no network call is made. There is no case-study table on the Express backend and
// no route to send one to, so nothing here persists and nothing here pretends to.
//
// ⚠️ THE HONESTY RULE OF `showcase-authoring.api.ts` APPLIES UNCHANGED: EVERYTHING EXCEPT PERSISTENCE
// IS REAL. The payload is validated against the real write contract before it gets here, the
// idempotency key travels, the result is a tagged `ActionResponse` and the receipt has the shape a 202
// would answer with. What does not happen is storage, and the receipt says so once.
//
// ⚠️ DO NOT ADD A POLL AGAINST THIS FILE. There is no queue, and a spinner re-reading the same fixture
// forever would imply a moderator is working.
//
// WHEN THE BACKEND ARRIVES: `submitCaseStudyForReview` becomes one JSON POST and
// `listMyCaseStudySubmissions` one `getJson`, against the same schemas. No caller changes.

import {
  CaseStudySubmissionSchema,
  type CaseStudySubmission,
  type CaseStudySubmissionDraft,
  type CaseStudySubmissionReceipt,
} from "@/lib/blueprints/case-study-authoring.schemas";
import type { ActionResponse } from "@/lib/http";
import { MOCK_BLUEPRINTS } from "@/mocks/blueprints-mocks";
import { MOCK_MY_CASE_STUDY_SUBMISSIONS } from "@/mocks/blueprints-case-study-authoring-mocks";

/** How long the mock takes to "answer", so the sending state is visible rather than theoretical. */
const MOCK_SUBMIT_LATENCY_MS = 600;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/** Trimmed, inner whitespace collapsed, lower-cased, so a stray space is not a different lesson. */
function normalizeLessonTitle(lessonTitle: string): string {
  return lessonTitle.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The title of an existing case study with the same lesson, or `null`.
 *
 * ⚠️ THE ONE REAL RULE THIS MOCK ENFORCES, for the launch mock's reason: two case studies with one
 * title are indistinguishable in the list, and without it the composer's failure branch
 * (`MutationErrorNotice`) could never render.
 */
function findConflictingLessonTitle(lessonTitle: string): string | null {
  const normalizedLessonTitle = normalizeLessonTitle(lessonTitle);
  if (normalizedLessonTitle === "") return null;

  const conflictingCaseStudy = MOCK_BLUEPRINTS.find(
    (blueprint) =>
      blueprint.category === "case_study" &&
      normalizeLessonTitle(blueprint.title) === normalizedLessonTitle,
  );

  return conflictingCaseStudy?.title ?? null;
}

/**
 * `POST /blueprints/case-studies` — send a case study for review.
 *
 * ⚠️ A 202 IS NOT A RESULT. The case study lands `pending_review`, appears in no list, and a moderator
 * decides. The receipt carries no public slug. `idempotencyKey` is minted once per attempt by the
 * caller and survives a retry of that attempt.
 */
export async function submitCaseStudyForReview(submissionRequest: {
  readonly draft: CaseStudySubmissionDraft;
  readonly idempotencyKey: string;
}): Promise<ActionResponse<CaseStudySubmissionReceipt>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  const conflictingLessonTitle = findConflictingLessonTitle(submissionRequest.draft.title);
  if (conflictingLessonTitle !== null) {
    // Names the existing case study, so the writer can see what to change rather than retry.
    return {
      success: false,
      error: {
        code: "409",
        message: `A case study with this lesson is already on Qatoto: "${conflictingLessonTitle}". Write yours as the lesson your story teaches that this one does not.`,
      },
    };
  }

  return {
    success: true,
    data: {
      // Derived from the attempt key, so a retry of the same attempt is visibly the same case study.
      submissionId: `case-study-${submissionRequest.idempotencyKey.slice(0, 8)}`,
      moderationState: "pending_review",
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * `GET /blueprints/case-studies/mine` — the writer's own case studies.
 *
 * ⚠️ IT DOES NOT SEE ANYTHING SENT THIS SESSION, and the receipt is where that is disclosed. These
 * fixture rows are a fixed set, one per state, for the launch list's reason.
 */
export async function listMyCaseStudySubmissions(): Promise<ActionResponse<CaseStudySubmission[]>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  return {
    success: true,
    data: MOCK_MY_CASE_STUDY_SUBMISSIONS.map((candidate) =>
      CaseStudySubmissionSchema.parse(candidate),
    ),
  };
}
