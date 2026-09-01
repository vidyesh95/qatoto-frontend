// TRANSPORT: client-query — the OPENER's four `/support` routes.
//
// SEPARATE FILE FROM `admin.api.ts`, the same split `content-reports.api.ts` makes against
// `admin-content-reports.api.ts`: everything here is any signed-in person's own case, and
// everything there refuses a caller without `handle_support_cases`. Keeping them apart means
// nobody imports a staff route into a member surface by autocomplete.
//
// EVERY WRITE SENDS `Idempotency-Key` AS A HEADER. Two spellings of idempotency coexist in
// this app on purpose — the R&D writes carry the key in the BODY, the commerce writes carry
// it in the header — and `/support` is the header form. The backend requires it: there is no
// uniqueness constraint behind these routes, so the header is the only thing between a
// retried submit on a train and a duplicate case in somebody's queue.

import {
  buildQueryString,
  getCursorSiblingList,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  SupportCaseDetailSchema,
  SupportCaseSummarySchema,
  type ListOwnSupportCasesFilter,
  type OpenSupportCaseInput,
  type SupportCaseDetail,
  type SupportCaseSummary,
} from "@/lib/support/schemas";

function withIdempotencyKey(
  idempotencyKey: string,
  options: RequestOptions | undefined,
): RequestOptions {
  return { ...options, headers: { ...options?.headers, "Idempotency-Key": idempotencyKey } };
}

/**
 * `POST /support/cases` — 201, and the 201 is REAL, not a 202.
 *
 * The case exists and staff have been notified. What it is not is an answer: nothing about
 * the outcome is known yet, and copy on this surface must not imply a resolution or promise a
 * response time — nothing measures one.
 *
 * `409` is a finding, not a retry: the person already holds the maximum number of live cases,
 * and the backend's own sentence says so.
 */
export function openSupportCase(
  input: OpenSupportCaseInput,
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<SupportCaseDetail>> {
  return sendJson(
    "/support/cases",
    "POST",
    input,
    SupportCaseDetailSchema,
    withIdempotencyKey(idempotencyKey, options),
  );
}

/**
 * `GET /support/cases` — the caller's own cases, newest first.
 *
 * The cursor is an opaque `<epochMs>_<id>` the server minted. Echo it back exactly; never
 * construct or compare one here, or it is a `422`.
 */
export function listOwnSupportCases(
  filter: ListOwnSupportCasesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: SupportCaseSummary[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/support/cases${buildQueryString({ state: filter.state, cursor: filter.cursor })}`,
    SupportCaseSummarySchema,
    options,
  );
}

/**
 * `GET /support/cases/:caseId` — one case with its whole thread.
 *
 * A 404 COVERS BOTH "no such case" AND "not yours", by design, so the route cannot be used to
 * discover which ids exist. Render one sentence for both and never say "you do not have
 * access", which would undo that in the copy.
 */
export function getOwnSupportCase(
  caseId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SupportCaseDetail>> {
  return getJson(`/support/cases/${encodeURIComponent(caseId)}`, SupportCaseDetailSchema, options);
}

/**
 * `POST /support/cases/:caseId/messages` — the person's reply.
 *
 * ANSWERS THE WHOLE UPDATED CASE, not the one message, so the hook can write the response
 * straight into the cache and the thread cannot disagree with what a refresh would show.
 *
 * Replying to a `resolved` case REOPENS it, inside the backend's window. Past that window it
 * is a 409 telling the person to open a new case — surface the server's sentence.
 */
export function addOwnSupportCaseMessage(
  caseId: string,
  input: { readonly body: string },
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<SupportCaseDetail>> {
  return sendJson(
    `/support/cases/${encodeURIComponent(caseId)}/messages`,
    "POST",
    input,
    SupportCaseDetailSchema,
    withIdempotencyKey(idempotencyKey, options),
  );
}
