// TRANSPORT: client-query — the STAFF half of commerce content reporting: the two `/commerce/admin`
// reads, the decision, and the restore. All four gated by `moderate_commerce`.
//
// SEPARATE FILE FROM `content-reports.api.ts` — see that file's header for the reason.
//
// ⚠️ **NO ROUTE HERE CARRIES CAPABILITY MIDDLEWARE AND THAT IS NOT A HOLE — DO NOT "FIX" IT.**
// `moderate_commerce` is demanded inside the service, BEFORE any id is read, so a non-moderator
// gets a 403 naming the capability and never learns whether the id existed. Same posture
// `commerce-seller-profile.routes.ts` established, and it is why the check and the write cannot
// drift apart.
//
// KEYSET, NOT OFFSET. A queue is worked from the front while new reports arrive at the back, and an
// offset silently repeats and skips rows as the list shifts under the reader. The cursor is the
// server's own opaque token: echo it back untouched, never construct, parse, compare or increment
// one — a fabricated cursor is a 422 `"Invalid cursor."`.
//
// ⚠️ **BOTH WRITES ANSWER ONE ROW, NOT A PAGE, AND THEY ANSWER DIFFERENT SHAPES.** A decision
// answers a `CommerceContentReport`; a restore answers a `CommerceModerationAction`. Parsing either
// as a page is the bug `admin-community.api.ts` records in its own header — a moderator pressing a
// button sees an error on a write that already succeeded, which is the worst possible shape for a
// console whose entire job is deciding things. Re-reading the lists is the HOOK's job.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CommerceContentReportPageSchema,
  CommerceContentReportSchema,
  CommerceModerationActionPageSchema,
  CommerceModerationActionSchema,
  type CommerceContentReport,
  type CommerceContentReportPage,
  type CommerceModerationAction,
  type CommerceModerationActionPage,
  type DecideCommerceReportInput,
  type ListCommerceModerationActionsFilter,
  type ListCommerceReportsFilter,
  type RestoreCommerceContentInput,
} from "@/lib/store/content-reports.schemas";

/**
 * One page of the report queue.
 *
 * ⚠️ **OLDEST FIRST.** The route orders `asc(createdAt), asc(id)`, so the control that fetches the
 * next page is walking FORWARD IN TIME and must say "Load newer". Copying
 * `certification-review-page.tsx`'s "Load older" would point the reader backwards — and
 * newest-first is how the oldest unworked report stays unworked forever, which is why the backend
 * chose this order.
 *
 * `getJson` rather than `getEnvelope`: the cursor lives INSIDE `data.page` here, not as a sibling
 * of `data` the way the video queue's does, so `cursorPageOf` covers the whole payload.
 */
export function listCommerceContentReports(
  filter: ListCommerceReportsFilter,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceContentReportPage>> {
  const path = `/commerce/admin/content-reports${buildQueryString({ ...filter })}`;
  return getJson(path, CommerceContentReportPageSchema, options);
}

/**
 * One page of the moderation-action log — every hide, restore and dismissal, in order.
 *
 * ⚠️ **THIS IS THE ONLY SURFACE ANYWHERE THAT SHOWS AN AUTOMATIC HIDE.** Three distinct reporters
 * hide a review, question or answer with no moderator involved, no notification and no audit entry
 * naming a person. Without this read, content taken down by the threshold is invisible to the
 * people who could put it back.
 *
 * ⚠️ **DO NOT PASS `status` HERE EVEN THOUGH THE ROUTE ACCEPTS IT.** The backend shares one query
 * schema between the two reads, but `listModerationActions` reads only `targetKind` and `cursor` —
 * a status would parse, change the query key, refetch, and return byte-identical rows. The filter
 * interface omits it for exactly this reason.
 */
export function listCommerceModerationActions(
  filter: ListCommerceModerationActionsFilter,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceModerationActionPage>> {
  const path = `/commerce/admin/moderation-actions${buildQueryString({ ...filter })}`;
  return getJson(path, CommerceModerationActionPageSchema, options);
}

/**
 * Upholds a report or throws it out. **Requires an `Idempotency-Key` — 400 without one.**
 *
 * ⚠️ **THE KEY MUST BE MINTED PER ATTEMPT, PER CONTROL, AND THIS IS THE MOST DAMAGING MISTAKE
 * AVAILABLE ON THIS SURFACE.** One key shared across a page makes the SECOND decision a replay of
 * the first: the backend returns the first report's row, the second report is never decided, and
 * the console renders a success. Nothing looks wrong and a report stays open forever.
 *
 * ⚠️ **ONE DECISION CLOSES EVERY OPEN REPORT ON THAT TARGET**, not only the row that was clicked —
 * the update predicate is the target plus `status = 'open'`. So rows leave `open` and arrive in
 * `actioned`/`dismissed` together and the action log grows too. Invalidating one filter's key
 * leaves two lists wrong; the hook invalidates the root.
 *
 * ⚠️ **`dismissed` ON A PRODUCT SETS `moderationState = "approved"` OUTRIGHT** — not "back to
 * whatever it was". Throwing out a spam report against a `draft` or `pending_review` listing
 * PUBLISHES it. Nothing on the client can soften that; it is here so nobody discovers it live.
 *
 * A `403 "A member of the reported organization cannot decide this report."` is a per-row refusal,
 * not a page-level one — surface it on the card rather than pre-hiding the control, because the
 * client cannot know the moderator's memberships and a hidden button teaches nothing.
 */
export function decideCommerceContentReport(
  reportId: string,
  input: DecideCommerceReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceContentReport>> {
  const path = `/commerce/admin/content-reports/${encodeURIComponent(reportId)}/decisions`;
  return sendJson(path, "POST", input, CommerceContentReportSchema, options);
}

/**
 * Puts hidden content back. **Requires an `Idempotency-Key`.**
 *
 * ⚠️ **KEYED ON THE TARGET, NOT ON A REPORT**, which is what makes it reachable from an automatic
 * hide that no moderator decided and no report currently owns.
 *
 * ⚠️ **`reasonNote` IS REQUIRED HERE, UNLIKE THE DECISION NOTE.** Restoring reverses a call
 * somebody already made — sometimes the threshold's rather than a person's — and an un-hide nobody
 * had to justify is one nobody can review. The control keeps its button disabled until the box has
 * something in it rather than letting the server refuse an empty one.
 *
 * Restoring something already visible is not an error; it records an action and changes nothing.
 * The console says so rather than trying to derive current visibility, which no read reports.
 */
export function restoreCommerceContent(
  input: RestoreCommerceContentInput,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceModerationAction>> {
  return sendJson(
    "/commerce/admin/content/restore",
    "POST",
    input,
    CommerceModerationActionSchema,
    options,
  );
}
