// TRANSPORT: server-fetch — `POST /blueprints/teardowns` and `GET /blueprints/teardowns/mine`.
//
// ⚠️ DO NOT ADD A POLL AGAINST THIS FILE. The R&D surfaces poll a 202 to a verdict
// (`useImportCommodityQuery`, `refetchInterval` as a function of `query.state.data`), and copying
// that here would put a spinner in front of an author implying somebody is reading their survey
// this minute. A moderator reads it when they read it; the receipt says so and My teardowns is
// where the answer appears.
//
// THIS FILE WAS A MOCK until the backend's write path landed. What the mock did NOT do was persist,
// and it said so on the receipt; everything else — the write contract, the idempotency key, the
// tagged result, the 202 shape — was already real, which is why the swap is one `sendJson` and one
// `getJson` and no caller above it moved.

import { z } from "zod";

import {
  TeardownSubmissionReceiptSchema,
  TeardownSubmissionSchema,
  type TeardownSubmission,
  type TeardownSubmissionDraft,
  type TeardownSubmissionReceipt,
} from "@/lib/blueprints/authoring.schemas";
import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `POST /blueprints/teardowns` — send a survey for review. Answers 202 with a receipt.
 *
 * ⚠️ A 202 IS NOT A RESULT. The teardown lands `pending_review`, creates no public row, and has no
 * address until a moderator publishes it — which is why the receipt carries no slug and why
 * offering one would invite the author to check a page that answers 404.
 *
 * ⚠️ `idempotencyKey` IS THE CALLER'S, minted once per attempt and kept across a retry of that
 * attempt. The server fingerprints the body, so the same key with an edited draft is a 409 — which
 * is why the wizard rotates it on any edit.
 *
 * THE REFUSALS WORTH KNOWING, each already shaped by the server: **409 with
 * `errors["provenance.subjectProductName"]`** when a live survey of the same unit already exists —
 * and it names that survey's title only when the survey is already public or is the caller's own,
 * so a probe cannot enumerate the queue by guessing product names; and **422** keyed to any field
 * the write gate refuses, including the array caps and the survey date.
 */
export function submitTeardownForReview(
  submissionRequest: {
    readonly draft: TeardownSubmissionDraft;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<TeardownSubmissionReceipt>> {
  return sendJson(
    "/blueprints/teardowns",
    "POST",
    submissionRequest.draft,
    TeardownSubmissionReceiptSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": submissionRequest.idempotencyKey },
    },
  );
}

/**
 * `GET /blueprints/teardowns/mine` — the author's own submissions, in every state.
 *
 * ⚠️ A FLAT ARRAY, NOT A CURSOR PAGE, and that is the server's shape rather than an omission. It
 * caps the list at 200 and mints no cursor: a teardown is a multi-hour instrumented survey behind a
 * five-per-fifteen-minutes limiter, so the cap is roughly a decade of honest work. The case-study
 * arm pages because a writer accumulates case studies cheaply; the showcase arm does not, and this
 * follows the showcase.
 */
export function listMyTeardownSubmissions(
  options?: RequestOptions,
): Promise<ActionResponse<TeardownSubmission[]>> {
  return getJson("/blueprints/teardowns/mine", z.array(TeardownSubmissionSchema), options);
}
