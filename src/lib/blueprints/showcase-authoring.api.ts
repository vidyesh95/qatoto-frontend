// TRANSPORT: mock — no network call is made. There is no showcase table on the Express backend and
// no route to post a launch or its heading image to, so nothing here persists and nothing here
// pretends to.
//
// ⚠️ THE HONESTY RULE OF `authoring.api.ts` APPLIES HERE UNCHANGED: EVERYTHING EXCEPT PERSISTENCE IS
// REAL. The payload is validated against the real write contract, the idempotency key travels, the
// result is a tagged `ActionResponse` and the receipt has the shape a 202 would answer with. What does
// not happen is storage, and the receipt says so once.
//
// ⚠️ DO NOT ADD A POLL AGAINST THIS FILE, for the reason the teardown mock gives: there is no queue,
// and a spinner re-reading the same fixture forever would imply a moderator is working.
//
// WHEN THE BACKEND ARRIVES: `submitShowcaseForReview` becomes one multipart POST (the draft as JSON
// plus the heading image file) and `listMyShowcaseSubmissions` one `getJson`, against the same
// schemas. Every caller above is unchanged, which is the reason this indirection exists.

import {
  ShowcaseSubmissionSchema,
  type ShowcaseSubmission,
  type ShowcaseSubmissionDraft,
  type ShowcaseSubmissionReceipt,
} from "@/lib/blueprints/showcase-authoring.schemas";
import type { ActionResponse } from "@/lib/http";
import { MOCK_BLUEPRINTS } from "@/mocks/blueprints-mocks";
import { MOCK_MY_SHOWCASE_SUBMISSIONS } from "@/mocks/blueprints-showcase-authoring-mocks";

/** How long the mock takes to "answer", so the posting state is visible rather than theoretical. */
const MOCK_SUBMIT_LATENCY_MS = 600;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/** Trimmed, inner whitespace collapsed, lower-cased: "Forty  moisture meters " is the same name. */
function normalizeLaunchTitle(launchTitle: string): string {
  return launchTitle.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The title of an existing launch with the same name, or `null`.
 *
 * ⚠️ THE ONE REAL RULE THIS MOCK ENFORCES, and it earns its place the way the teardown mock's
 * duplicate-unit rule does: two launches with one name are indistinguishable in the feed, the backend
 * would refuse it anyway, and without it the composer's failure branch (`MutationErrorNotice`) could
 * never render, which is unverified code.
 */
function findConflictingLaunchTitle(launchTitle: string): string | null {
  const normalizedLaunchTitle = normalizeLaunchTitle(launchTitle);
  if (normalizedLaunchTitle === "") return null;

  const conflictingLaunch = MOCK_BLUEPRINTS.find(
    (blueprint) =>
      blueprint.category === "showcase" &&
      normalizeLaunchTitle(blueprint.title) === normalizedLaunchTitle,
  );

  return conflictingLaunch?.title ?? null;
}

/**
 * `POST /blueprints/showcase` (multipart) — post a launch for review.
 *
 * ⚠️ A 202 IS NOT A RESULT. The launch lands `pending_review`, appears in no feed, and a moderator
 * decides. Nothing that renders this may name an outcome, and the receipt carries no public slug.
 *
 * ⚠️ `headingImageFile` IS ACCEPTED AND NOT READ. It is part of the signature from the start so the
 * call site is already correct on the day this sends a real multipart body; the mock never looks at
 * it, and the image never leaves the browser. `idempotencyKey` is minted once per attempt by the
 * caller and survives a retry of that attempt.
 */
export async function submitShowcaseForReview(submissionRequest: {
  readonly draft: ShowcaseSubmissionDraft;
  readonly headingImageFile: File;
  readonly idempotencyKey: string;
}): Promise<ActionResponse<ShowcaseSubmissionReceipt>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  const conflictingLaunchTitle = findConflictingLaunchTitle(submissionRequest.draft.title);
  if (conflictingLaunchTitle !== null) {
    // THE BACKEND'S OWN SHAPE, and the message names the existing launch rather than saying
    // "conflict". A 409 a maker cannot act on is a 409 they will retry unchanged.
    return {
      success: false,
      error: {
        code: "409",
        message: `A launch with this name is already on Qatoto: "${conflictingLaunchTitle}". Give yours a name that says what is different about it.`,
      },
    };
  }

  return {
    success: true,
    data: {
      // Derived from the attempt key, so a retry of the same attempt is visibly the same launch.
      submissionId: `launch-${submissionRequest.idempotencyKey.slice(0, 8)}`,
      moderationState: "pending_review",
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * `GET /blueprints/showcase/mine` — the maker's own launches.
 *
 * ⚠️ IT DOES NOT SEE ANYTHING POSTED THIS SESSION, and the receipt is where that is disclosed.
 * `submitShowcaseForReview` stores nothing, so these fixture rows are a fixed set, one per state.
 * Joining the two would need fake persistence that loses work on reload, or a second `localStorage`
 * key, which CLAUDE.md forbids.
 */
export async function listMyShowcaseSubmissions(): Promise<ActionResponse<ShowcaseSubmission[]>> {
  await wait(MOCK_SUBMIT_LATENCY_MS);

  return {
    success: true,
    data: MOCK_MY_SHOWCASE_SUBMISSIONS.map((candidate) =>
      ShowcaseSubmissionSchema.parse(candidate),
    ),
  };
}
