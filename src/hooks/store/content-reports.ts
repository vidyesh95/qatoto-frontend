"use client";

// TRANSPORT: client-query — the reporter's single write, `POST /commerce/reports`.
//
// ONE MUTATION AND NO QUERY-KEY FACTORY, which is why this is a file rather than a section of
// `admin-content-reports.ts`. There is no reporter-side read on this surface at all — no route
// lists the reports a person filed — so there is nothing to key, nothing to invalidate and nothing
// to seed. The staff half's keys live with the staff half.
//
// NOTHING IS INVALIDATED ON SUCCESS, and that is deliberate rather than unfinished. A 201 changes
// nothing the reporter can see: the listing, the review, the question and the answer all render
// exactly as before, because a report is not a verdict. The one case where the page DOES change —
// three distinct reporters tripping the automatic hide on a review, question or answer — is a
// change to what OTHER people see, and re-reading the product page to watch your own report take
// something down would be teaching the reporter they have a delete button. They do not.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { createCommerceContentReport } from "@/lib/store/content-reports.api";
import type {
  CommerceContentReport,
  CreateCommerceReportInput,
} from "@/lib/store/content-reports.schemas";

/**
 * Files one report.
 *
 * RETURNS THE TAGGED `ActionResponse` RATHER THAN UNWRAPPING IT, which is the store domain's
 * convention (`MutationNotice` renders `error.message` and `error.fieldErrors` directly) and is
 * load-bearing here specifically: the sheet has to branch on `error.code === "409"` to reach its
 * terminal `alreadyReported` state. `unwrap` would throw that code away into an exception whose
 * message the sheet would then have to string-match — and matching on a human sentence is how a
 * backend copy edit silently breaks a state machine.
 *
 * The `Idempotency-Key` is passed by the CALLER, minted once per attempt, because only the
 * component knows when an attempt began. See the api file for why it is sent on a route that does
 * not demand one.
 */
export function useReportCommerceContentMutation(): UseMutationResult<
  ActionResponse<CommerceContentReport>,
  Error,
  { readonly input: CreateCommerceReportInput; readonly idempotencyKey: string }
> {
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createCommerceContentReport(input, { headers: { "Idempotency-Key": idempotencyKey } }),
  });
}
