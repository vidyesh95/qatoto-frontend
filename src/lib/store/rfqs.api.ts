// TRANSPORT: client-query — RFQs are session-scoped and read from client islands.
//
// WIRED. `src/mocks/store/rfqs-mocks.ts` is deleted.
//
// `state` IS A REAL FILTER NOW. Both list routes took `{ limit, cursor }` only, so the `state` this
// module has always sent was a 422 that killed the whole read; the backend's `ListQuerySchema`
// gained the key rather than the filter being dropped here, because a buyer's RFQ page is organised
// by state and a provider's queue only wants what is still open.
//
// `open` AND `close` REQUIRE AN `Idempotency-Key`, which this module's docstrings did not say.
// LEGACY NOTE — to wire a call, swap `resolveMockRead` for `getJson`, or the
// mock write for the `sendJson` line beside it, and drop the fixture argument.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  RfqDetailSchema,
  RfqListPageSchema,
  type ListRfqsFilter,
  type CreateDraftRfqInput,
  type RfqDetail,
  type RfqListPage,
  InvitedProvidersSchema,
  type InviteProvidersInput,
  type RfqInvitation,
} from "@/lib/store/rfqs.schemas";

/** The buyer's own RFQs, drafts included. */
export function listBuyerRfqs(
  filter: ListRfqsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<RfqListPage>> {
  const path = `/commerce/rfqs/mine${buildQueryString({ ...filter })}`;
  return getJson(path, RfqListPageSchema, options);
}

/**
 * The provider work queue: RFQs the caller was invited to, plus matched ones.
 *
 * A DIFFERENT ENDPOINT, and the difference is not cosmetic — a DRAFT never appears here. A draft is the
 * buyer's private working copy, and a queue that surfaced one would publish a requirement before the
 * buyer chose to. Do not collapse this into the buyer read with a flag.
 */
export function listProviderRfqs(
  filter: ListRfqsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<RfqListPage>> {
  const path = `/commerce/provider/rfqs${buildQueryString({ ...filter })}`;
  return getJson(path, RfqListPageSchema, options);
}

/**
 * One RFQ, with `callerRelation` stated by the server.
 *
 * That field is why this surface needs no organization lookup: the backend says whether the caller is the
 * `buyer`, an `invited_provider` or a `matched_provider`, so the client reads it rather than deriving it
 * from two ids the way the order detail must.
 *
 * An RFQ the caller may not see is a **404**, identical to one that does not exist — so a provider
 * probing ids learns nothing.
 */
export function getRfq(
  rfqId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RfqDetail>> {
  const path = `/commerce/rfqs/${rfqId}`;
  return getJson(path, RfqDetailSchema, options);
}

/**
 * Opens a draft for quotes.
 *
 * A REAL VALIDATION GATE, not a state flip: the server checks the buyer organization's state, the
 * deadline, that at least one line exists, that every attached document is owned by the caller, and that
 * all required service-specific fields are present. So it can fail with field-level findings, and the
 * page must be able to render them rather than assuming success.
 */
export function openRfq(
  rfqId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RfqDetail>> {
  const path = `/commerce/rfqs/${rfqId}/open`;
  // Returns the RFQ unchanged: synthesising `state: "open"` here would claim a transition the server
  // never validated, and the validation IS the operation.
  return sendJson(path, "POST", undefined, RfqDetailSchema, options);
}

/**
 * `POST /commerce/rfqs/:rfqId/invitations` — names providers who may quote.
 *
 * ⚠️ **REQUIRES AN `Idempotency-Key`**, and the guard is the STRICT one:
 * `requireActiveBuyerCommerceOrganization`, not the softer workspace guard that lets a pending
 * organization draft an RFQ. So a buyer who can compose one may still be refused here.
 *
 * ⚠️ **ONLY AN OPEN RFQ CAN INVITE** — a draft is `409 Providers can only be invited to open RFQs.`
 *
 * ⚠️ **A PRODUCT-ONLY RFQ CAN INVITE NOBODY.** Eligibility requires the provider to hold a VERIFIED
 * link for one of the provider kinds the RFQ's SERVICE lines name; with no service lines that set
 * is empty and matches nothing, so every id is refused. The caller gates the control on service
 * lines existing rather than letting a buyer find this out.
 *
 * Answers **201** with only the rows created, not the full set — so the caller refetches the detail
 * rather than painting from this response.
 */
export function inviteRfqProviders(
  rfqId: string,
  input: InviteProvidersInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ invitations: RfqInvitation[] }>> {
  const path = `/commerce/rfqs/${rfqId}/invitations`;
  return sendJson(path, "POST", input, InvitedProvidersSchema, options);
}

/** Closes an open RFQ to new quotes. Existing quotes stay valid until they expire. */
export function closeRfq(
  rfqId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RfqDetail>> {
  const path = `/commerce/rfqs/${rfqId}/close`;
  return sendJson(path, "POST", undefined, RfqDetailSchema, options);
}

/**
 * `POST /commerce/rfqs` — creates a DRAFT and nothing more.
 *
 * IT DOES NOT OPEN THE RFQ AND NOBODY IS NOTIFIED. Opening is a separate call behind its own validation
 * gate, so the composer's success screen must say "saved as a draft" and never "sent to providers".
 *
 * Requires an `Idempotency-Key`, minted once per attempt by the composer — a fresh key on a retry is a
 * second draft RFQ.
 *
 * Refusals worth surfacing verbatim: `DOCUMENT_NOT_OWNED` (an attachment id the buyer's organization does
 * not own), `PRODUCT_NOT_FOUND` / `CATEGORY_NOT_FOUND` (a referenced listing vanished), and a plain 422
 * from the `.strict()` body — which on this surface almost always means a field name, not a value.
 */
export function createDraftRfq(
  input: CreateDraftRfqInput,
  options?: RequestOptions,
): Promise<ActionResponse<RfqDetail>> {
  const path = "/commerce/rfqs";
  // Returns an EXISTING draft fixture. It does NOT echo the input back as a new RFQ: a mock that returned
  // the submitted body would let the composer's success screen show a draft that does not exist, and the
  // first click on it would 404. `rfq_mock_2` is the draft in the fixture set.
  return sendJson(path, "POST", input, RfqDetailSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while reads are mock-backed.
void getJson;
void sendJson;
