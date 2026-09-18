// TRANSPORT: client-query — every call here is made from the forwarder's rate-card composer island.
//
// The five `/commerce/provider/freight-rate-cards` routes (§19.12). Guarded by
// `requireActiveProviderCommerceOrganization` on the route, then TWO assertions inside the service:
// the caller's organization holds a `verified` provider kind link of `freight_forwarder` or
// `logistics_operator`, and the card it names is its own. Both run BEFORE any id or filter value is
// read, so a refusal is a tagged result the UI renders rather than an oracle for a rival's lanes.
//
// ⚠️ TWO FIELDS ARE REFUSED IN A BODY RATHER THAN IGNORED. `providerOrganizationId` and
// `sourceForwarderName` are derived from the session; the server's schema is `.strict()`, so
// sending either is a 422 on the WHOLE submission. Nothing in this module may add them, and the
// composer must not render inputs for them.
//
// ALL FOUR WRITES REQUIRE AN `Idempotency-Key` HEADER, scoped to the ACTIVE ORGANIZATION rather
// than the user — the opposite of the staff surface, and for the mirror of its reason. A moderator
// acts for the platform and may belong to no commerce organization; a forwarder always acts as one,
// so two operators at the same company retrying one submission must collide rather than publish the
// lane twice. Missing, or shorter than 8 / longer than 200 characters, is a 400 before the handler.
//
// THREE RESPONSE SHAPES. The create answers two keys — the row plus whatever it silently closed.
// The three other writes answer one key. The list answers `{ items, page }`.
//
// ⚠️ A 404 HERE ALSO MEANS "NOT YOURS". The service predicates its lookup on ownership rather than
// comparing after the load, so another provider's card is byte-identical to a garbage id. Do not
// word a 404 as deletion.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreateProviderFreightRateCardResultSchema,
  ProviderFreightRateCardPageSchema,
  ProviderFreightRateCardResultSchema,
  type CreateProviderFreightRateCardInput,
  type CreateProviderFreightRateCardResult,
  type FreightRateBreakInput,
  type ListProviderFreightRateCardsFilter,
  type ProviderFreightRateCardPage,
  type ProviderFreightRateCardResult,
  type UpdateProviderFreightRateCardInput,
} from "@/lib/store/provider-freight.schemas";

const RATE_CARDS_PATH = "/commerce/provider/freight-rate-cards";

/**
 * `GET /commerce/provider/freight-rate-cards` — the caller's OWN cards, newest-starting first.
 *
 * Ordered `(validFrom DESC, id ASC)` and not sortable: a card's subject is the day its prices start
 * applying, so one keyed in on Friday for next quarter belongs where its author looks for next
 * quarter. The cursor is opaque and forward-only; there is no total and no previous cursor.
 *
 * ⚠️ No `providerOrganizationId` filter exists, and the query schema is `.strict()`, so passing one
 * is a 422 rather than an ignored parameter.
 */
export function listProviderFreightRateCards(
  filter: ListProviderFreightRateCardsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProviderFreightRateCardPage>> {
  const path = `${RATE_CARDS_PATH}${buildQueryString({ ...filter })}`;
  return getJson(path, ProviderFreightRateCardPageSchema, options);
}

/**
 * `POST /commerce/provider/freight-rate-cards` — a card and its whole ladder, in one call.
 *
 * ⚠️ **THIS CAN SILENTLY CLOSE ONE OF THE CALLER'S OWN CARDS.** If they already have an active card
 * on the same `(origin, destination, mode, currency)`, the same transaction closes it, sets its
 * `validUntil` to this card's `validFrom` and points it here — and the ONLY report is
 * `supersededRateCardId` on this result. No later read announces it. The composer's defence is the
 * pre-flight list, and its obligation is to render that id when it comes back.
 *
 * `validFrom` must be FUTURE. A card in force the instant it exists can never have its bands edited
 * and no PATCH can correct it (§19.11 step 1), so the server refuses rather than minting the trap.
 * `breaks` is required 1..20 in the same call, and one of them must start at 0 g.
 */
export function createProviderFreightRateCard(
  input: CreateProviderFreightRateCardInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreateProviderFreightRateCardResult>> {
  return sendJson(
    RATE_CARDS_PATH,
    "POST",
    input,
    CreateProviderFreightRateCardResultSchema,
    options,
  );
}

/**
 * `PATCH /commerce/provider/freight-rate-cards/:rateCardId` — shorten the window, or withdraw.
 *
 * A window may only ever be SHORTENED. Widening one is re-selling an expired list under its old
 * provenance; closing it at or before `validFrom` is a window nobody can price against. Both are
 * 422s.
 */
export function updateProviderFreightRateCard(
  rateCardId: string,
  input: UpdateProviderFreightRateCardInput,
  options?: RequestOptions,
): Promise<ActionResponse<ProviderFreightRateCardResult>> {
  const path = `${RATE_CARDS_PATH}/${encodeURIComponent(rateCardId)}`;
  return sendJson(path, "PATCH", input, ProviderFreightRateCardResultSchema, options);
}

/**
 * `POST .../:rateCardId/breaks` — append ONE band. The body is a BARE band object, not wrapped;
 * position is assigned server-side as highest + 1.
 *
 * Refused with a 409 once the card is in force or has left `active`. Read `bandsEditable` on the
 * card rather than guessing, and note that `IN_FORCE` never becomes retryable — time only moves
 * one way, and the fix is a new card rather than a corrected one.
 */
export function appendProviderFreightRateBreak(
  rateCardId: string,
  input: FreightRateBreakInput,
  options?: RequestOptions,
): Promise<ActionResponse<ProviderFreightRateCardResult>> {
  const path = `${RATE_CARDS_PATH}/${encodeURIComponent(rateCardId)}/breaks`;
  return sendJson(path, "POST", input, ProviderFreightRateCardResultSchema, options);
}

/**
 * `PATCH .../:rateCardId/breaks` — a WHOLE-SET replace, never a per-band edit, because breaks form
 * a ladder and changing one band's floor silently reprices the weights its neighbours covered.
 *
 * ⚠️ IT IS THE ONLY WRITE THAT CAN DELETE THE 0 g FLOOR BAND off a card that had one, which blanks
 * the lane as thoroughly as never authoring it. The server refuses a set without one; so must the
 * composer, before the request.
 */
export function replaceProviderFreightRateBreaks(
  rateCardId: string,
  breaks: readonly FreightRateBreakInput[],
  options?: RequestOptions,
): Promise<ActionResponse<ProviderFreightRateCardResult>> {
  const path = `${RATE_CARDS_PATH}/${encodeURIComponent(rateCardId)}/breaks`;
  return sendJson(path, "PATCH", { breaks }, ProviderFreightRateCardResultSchema, options);
}
