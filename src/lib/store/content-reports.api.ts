// TRANSPORT: client-query — the REPORTER half of commerce content reporting, `POST /commerce/reports`.
//
// SEPARATE FILE FROM `admin-content-reports.api.ts` BECAUSE THE AUDIENCE IS DIFFERENT, the same
// split `forum.api.ts` makes against `admin-community.api.ts` in this very domain. Everything here
// is any signed-in shopper's and mounts in FOUR public storefront components; everything there
// refuses a non-moderator with a named capability. Keeping them in one file is how
// `restoreCommerceContent` ends up autocompleted into `ratings-and-reviews.tsx` and a moderation
// route reference ships in the public product bundle.
//
// ⚠️ **THERE IS NO REPORTER-SIDE READ, AND THAT IS WHY THIS FILE HAS ONE FUNCTION.** No route lists
// the reports a person has filed on the store. The `409` below is the ONLY way a reporter ever
// learns an earlier report of theirs exists, which is why the sheet treats it as information rather
// than as a failure. Do not link a commerce report to `/report-history` — that page is video
// reports, and a reporter who followed it would find nothing and conclude nothing was filed.

import { sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  CommerceContentReportSchema,
  type CommerceContentReport,
  type CreateCommerceReportInput,
} from "@/lib/store/content-reports.schemas";

/**
 * Files one report. **201**, answering the created row.
 *
 * ⚠️ **`detailText` MUST BE OMITTED WHEN EMPTY, NOT SENT AS `""` OR `null`.** The backend field is
 * `.optional()` with an inner `.min(1)` inside a `.strict()` object, so an empty string is a 422
 * for a box nobody typed in and an explicit null is a 422 for an unrecognised type. The caller
 * passes a trimmed string or nothing; this function does the omitting so four call sites cannot
 * each get it wrong.
 *
 * ⚠️ **AN `Idempotency-Key` IS OPTIONAL ON THIS ROUTE AND SHOULD STILL BE SENT.** The middleware
 * honours one when present. Without it, a retry after a dropped connection files a SECOND report
 * and earns the reporter a `409 "You have already reported this."` for their own retry — and with
 * no reporter-side read they cannot check which of the two is true. The key makes the retry a
 * replay instead.
 *
 * The refusals worth knowing, because two of them are not what they look like:
 * - **409** `"You have already reported this."` — a state, not an error. The sheet stops.
 * - **422** `"You cannot report your own organization's content."` — ⚠️ **422, NOT 403.** It shares
 *   a status with schema failure, so a caller that renders 422 as "check the highlighted fields"
 *   tells a seller their form is broken. Render the backend's sentence.
 * - **404** — the target does not exist, or is one this caller may not see. One code covers both
 *   so a stranger cannot probe which ids are real.
 */
export function createCommerceContentReport(
  input: CreateCommerceReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceContentReport>> {
  return sendJson("/commerce/reports", "POST", input, CommerceContentReportSchema, options);
}
