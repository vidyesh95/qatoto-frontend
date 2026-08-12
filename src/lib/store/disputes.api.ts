// TRANSPORT: client-query — a dispute is party-scoped, so it is read from a client island rather
// than a cached server render. `RequestOptions` is threaded so a server read could be added.
//
// WIRED, AND THIS FILE IS NEW BECAUSE THE PAGE IT SERVES WAS APOLOGISING FOR A GAP THAT CLOSED.
// `dispute-detail.tsx` carried a banner reading "there is NO participant-scoped read for a dispute.
// GET /commerce/disputes/:disputeId does not exist" and rendered a panel telling the user so. It
// does exist — A28 shipped it in Phase 15 (`commerce-trust.routes.ts:189`) and A40 added the note
// write in Phase 23. The banner was simply never revisited.
//
// A 404 MEANS "NO SUCH DISPUTE" *OR* "NOT YOURS", with one code on purpose, so the route cannot be
// used to enumerate ids. Render `notFound()`, never a permission hint.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  DisputeDetailSchema,
  DisputeListPageSchema,
  type AddDisputeNoteInput,
  type DisputeDetail,
  type DisputeListPage,
  type ListDisputesFilter,
} from "@/lib/store/disputes.schemas";

/**
 * Every dispute the caller's organization is a party to — `GET /commerce/disputes`.
 *
 * BOTH SIDES, one list. The scope is the ORDER's two organizations, so a seller sees the disputes
 * raised against their orders and a buyer sees the ones they raised.
 */
export function listDisputes(
  filter: ListDisputesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<DisputeListPage>> {
  return getJson(
    `/commerce/disputes${buildQueryString({ ...filter })}`,
    DisputeListPageSchema,
    options,
  );
}

/**
 * One dispute and its timeline — `GET /commerce/disputes/:disputeId`.
 *
 * PARTICIPANT-SCOPED, and `requireActiveCommerceOrganization` sits in front of it: a signed-in user
 * whose workspace is still `pending` gets a 403 here even on their own dispute.
 *
 * DO NOT WIRE THIS TO `dispute.service.ts`. That file has a `DisputeView` with a tempting shape and
 * it belongs to the R&D proof-of-effort dispute domain — a different table, a different meaning, and
 * rendering it here would show one organization another's equity dispute.
 */
export function getDispute(
  disputeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<DisputeDetail>> {
  return getJson(
    `/commerce/disputes/${encodeURIComponent(disputeId)}`,
    DisputeDetailSchema,
    options,
  );
}

/**
 * Adds a note to an open dispute — `POST /commerce/disputes/:disputeId/notes` (A40).
 *
 * EITHER PARTY, WHILE THE DISPUTE IS OPEN. Both can already read the timeline, and a counterparty
 * who cannot respond makes it a one-sided record of a two-sided disagreement.
 *
 * REFUSED ONCE THE DISPUTE IS DECIDED, with a 409 — by then `decideDispute` has restored the
 * order's `priorOrderState` and the table is append-only, so a late note could never be withdrawn.
 * That refusal is a finding, not a retry.
 *
 * IT ANSWERS THE WHOLE TIMELINE, not the one note, so the page after the write and the page after a
 * refresh cannot disagree. Write the response straight into the cache rather than refetching.
 *
 * Requires an `Idempotency-Key`, minted once per attempt by the caller: a retried note posts twice
 * onto an append-only record that nobody can edit afterwards.
 */
export function addDisputeNote(
  disputeId: string,
  input: AddDisputeNoteInput,
  options?: RequestOptions,
): Promise<ActionResponse<DisputeDetail>> {
  return sendJson(
    `/commerce/disputes/${encodeURIComponent(disputeId)}/notes`,
    "POST",
    input,
    DisputeDetailSchema,
    options,
  );
}
