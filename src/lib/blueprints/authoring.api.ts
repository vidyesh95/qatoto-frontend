// TRANSPORT: mock — no network call is made. There is no `blueprint` table on the Express backend
// and no submission route to POST to, so nothing here persists and nothing here pretends to.
//
// ⚠️ THE HONESTY RULE OF THIS FILE: EVERYTHING EXCEPT PERSISTENCE IS REAL. The payload is validated
// against the real write contract, the idempotency key travels, the result is a tagged
// `ActionResponse` and the receipt has the shape a 202 would answer with. What does NOT happen is
// storage — and the surface says so once, on the receipt, rather than letting an author believe
// their work is somewhere. A submit button whose write has no backing table is the control
// CLAUDE.md bans hardest; a submit button that is honest about being a rehearsal is not that.
//
// ⚠️ DO NOT ADD A POLL AGAINST THIS FILE. The R&D surfaces poll a 202 to a verdict
// (`useImportCommodityQuery`, `refetchInterval` as a function of `query.state.data`), and copying
// that here would produce a spinner that re-reads the same fixture forever while implying a
// moderator is working. There is no queue. The receipt says that instead.
//
// WHEN THE BACKEND ARRIVES: `submitTeardownForReview` becomes one `sendJson(..., "POST", ...)` and
// `listMyTeardownSubmissions` one `getJson`, both against the same schemas. Every caller above is
// unchanged, which is the entire reason this indirection exists.

import {
  TeardownSubmissionSchema,
  type TeardownSubmission,
  type TeardownSubmissionDraft,
  type TeardownSubmissionReceipt,
} from "@/lib/blueprints/authoring.schemas";
import type { ActionResponse } from "@/lib/http";
import { MOCK_BLUEPRINTS } from "@/mocks/blueprints-mocks";
import { MOCK_MY_TEARDOWN_SUBMISSIONS } from "@/mocks/blueprints-authoring-mocks";

/** How long the mock takes to "answer", so the submitting state is visible rather than theoretical. */
const MOCK_SUBMIT_LATENCY_MS = 600;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Whether some teardown already surveys this unit.
 *
 * ⚠️ THIS IS THE ONE REAL RULE THE MOCK ENFORCES, AND IT EARNS ITS PLACE TWICE OVER. It is a rule
 * the backend would enforce anyway — two surveys of the same unit under review at once is a
 * moderation problem, not a feature — and it is the only thing that makes the failure branch of
 * every caller REACHABLE. Without it `MutationErrorNotice` would never render on this surface, which
 * is unverified code by the same standard the uncalled-hook audit applies everywhere else.
 *
 * Compared case-insensitively on the trimmed name, because "400 L off-grid chest freezer control
 * board" and "400 l off-grid chest freezer control board  " are the same unit and a publisher who
 * hit this once should not get past it by changing the capitalisation.
 */
function findConflictingSubjectProductName(subjectProductName: string): string | null {
  const normalizedSubjectProductName = subjectProductName.trim().toLowerCase();
  if (normalizedSubjectProductName === "") return null;

  const conflictingTeardown = MOCK_BLUEPRINTS.find(
    (blueprint) =>
      blueprint.category === "teardown" &&
      blueprint.provenance.subjectProductName.trim().toLowerCase() === normalizedSubjectProductName,
  );

  return conflictingTeardown?.title ?? null;
}

/**
 * `POST /blueprints/teardowns` — submit a survey for review.
 *
 * ⚠️ A 202 IS NOT A RESULT. The row exists and the verdict does not: the submission lands
 * `pending_review`, it appears on no public index, and a moderator decides. Nothing that renders
 * this may name an outcome, and the receipt deliberately carries no public slug because none exists
 * yet (`TeardownSubmissionReceiptSchema`).
 *
 * `idempotencyKey` IS MINTED ONCE PER ATTEMPT in component state and travels unchanged across every
 * retry of that attempt. It is accepted here — unused by the mock, but part of the signature from
 * the start — so that the call site is already correct on the day this reads a real endpoint. A
 * signature that gains an idempotency key later is a signature whose existing callers are all wrong.
 */
export async function submitTeardownForReview(
  draft: TeardownSubmissionDraft,
  idempotencyKey: string,
): Promise<ActionResponse<TeardownSubmissionReceipt>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  const conflictingTeardownTitle = findConflictingSubjectProductName(
    draft.provenance.subjectProductName,
  );

  if (conflictingTeardownTitle !== null) {
    // THE BACKEND'S OWN SHAPE, and the message names the row rather than saying "conflict". A 409 a
    // publisher cannot act on is a 409 they will retry unchanged.
    return {
      success: false,
      error: {
        code: "409",
        message: `A survey of this unit is already on Qatoto: "${conflictingTeardownTitle}". Two surveys of one unit are reviewed together, so add to that one or survey a different unit.`,
      },
    };
  }

  return {
    success: true,
    data: {
      // Derived from the attempt key so a retry of the same attempt is visibly the same submission.
      // A real backend mints this; deriving it is what a mock can honestly do instead of inventing
      // an unrelated identifier that would change on every render.
      submissionId: `sub-${idempotencyKey.slice(0, 8)}`,
      moderationState: "pending_review",
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * `GET /blueprints/teardowns/mine` — the author's own submissions.
 *
 * ⚠️ IT DOES NOT SEE ANYTHING SUBMITTED THIS SESSION, and that is the disconnect the receipt
 * discloses. `submitTeardownForReview` stores nothing, so these six fixture rows are a fixed set
 * covering the six states rather than a growing list. Joining the two would need somewhere to put a
 * row, and the only options were a module-level array that dies on reload — fake persistence, which
 * loses an author's work with no explanation — or a second `localStorage` key, which CLAUDE.md
 * forbids outright because `privacy-policy.tsx` and `data-and-privacy-panel.tsx` both claim there is
 * exactly one.
 *
 * A tagged result even though the mock cannot fail, for the reason the file header gives: the
 * caller's failure branch must already exist on the day this reads a real endpoint.
 */
export async function listMyTeardownSubmissions(): Promise<ActionResponse<TeardownSubmission[]>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  return {
    success: true,
    data: MOCK_MY_TEARDOWN_SUBMISSIONS.map((candidate) =>
      TeardownSubmissionSchema.parse(candidate),
    ),
  };
}
