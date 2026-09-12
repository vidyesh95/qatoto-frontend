// TRANSPORT: client-query — the writer's side of case studies, against the Express backend: sending
// one for review, and listing the writer's own.
//
// ⚠️ SEPARATE FROM `case-study-moderation.api.ts`, and that separation is a security boundary rather
// than tidiness: the moderator read carries a company name its writer withheld from readers, and
// nothing under `components/home` or `components/studio` may import that file.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC AND NOTHING POLLS. A sent case study is `pending_review`; a moderator
// decides, and the writer sees the decision the next time My Case Studies loads. A spinner
// re-reading the queue would imply somebody is working on it this minute.
//
// ⚠️ AND THE RECEIPT IS THREE SCALARS ON PURPOSE. `idempotency` on the backend stores whole 2xx
// bodies for replay, so a route that echoed the submission back would put a company name into a
// cache keyed by a header the client chose. Do not widen it.

import { z } from "zod";

import {
  CaseStudySubmissionReceiptSchema,
  CaseStudySubmissionSchema,
  type CaseStudySubmissionDraft,
  type CaseStudySubmissionReceipt,
} from "@/lib/blueprints/case-study-authoring.schemas";
import { cursorPageOf } from "@/lib/store/shared.schemas";
import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `POST /blueprints/case-studies` — send a case study for review. Answers 202 with a receipt.
 *
 * ⚠️ A 202 IS NOT A RESULT. The case study lands `pending_review`, appears in no index, and has no
 * public address until a moderator publishes it — which is why the receipt carries no slug.
 *
 * ⚠️ `idempotencyKey` IS THE CALLER'S, minted once per attempt and kept across a retry of that
 * attempt. The server fingerprints the body, so the same key with an edited draft is a 409 — which
 * is why the composer rotates it on any edit.
 *
 * THE REFUSALS WORTH KNOWING, each already shaped by the server: **409 with `errors.title`** when
 * another case study teaches the same lesson (the server names the field and deliberately not the
 * clashing row, so a probe cannot enumerate the queue); **422 with `errors.relatedLessonSlugs`**
 * when a linked lesson is not one a reader can reach; and **422** keyed to any field the write gate
 * refuses — including one rule the form does not have, that a withheld company's name may not appear
 * in the prose a reader can see.
 */
export function submitCaseStudyForReview(
  submissionRequest: {
    readonly draft: CaseStudySubmissionDraft;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudySubmissionReceipt>> {
  return sendJson(
    "/blueprints/case-studies",
    "POST",
    submissionRequest.draft,
    CaseStudySubmissionReceiptSchema,
    {
      ...options,
      headers: { ...options?.headers, "Idempotency-Key": submissionRequest.idempotencyKey },
    },
  );
}

/**
 * The writer's own case studies, newest first, in every state.
 *
 * KEYSET-PAGED, where the mock this replaced answered a flat array. The backend pages it because a
 * prolific writer's list is unbounded, and `cursorPageOf` is the shared footer every other paged
 * read on this surface uses — the page control is shareable only because nothing redefines it.
 */
export const MyCaseStudyPageSchema = cursorPageOf(CaseStudySubmissionSchema);
export type MyCaseStudyPage = z.infer<typeof MyCaseStudyPageSchema>;

/**
 * `GET /blueprints/case-studies/mine` — the writer's own case studies.
 *
 * ⚠️ IT CARRIES NO COMPANIES, and that is not an omission. The row renders a title, an action line,
 * a discipline, a state, a slug and the moderator's note; returning companies would make this a
 * second route able to serve a real name, for no consumer. The name reaches exactly one route.
 */
export function listMyCaseStudySubmissions(
  options?: RequestOptions,
): Promise<ActionResponse<MyCaseStudyPage>> {
  return getJson("/blueprints/case-studies/mine", MyCaseStudyPageSchema, options);
}
