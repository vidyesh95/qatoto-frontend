// TRANSPORT: client-query — every call here is made from the freight admin console island.
//
// The eight `/commerce/admin/{freight-rate-cards,customs-dwell-estimates}` routes. All gated by
// `moderate_commerce`, checked IN-SERVICE rather than by route middleware — deliberately, so that
// the capability is not probeable from the route table and a read is not an existence oracle. A
// refusal is therefore a tagged result the UI renders, the same call the category and site-audit
// consoles made.
//
// THE SIX WRITES ALL REQUIRE AN `Idempotency-Key` HEADER, scoped to the user rather than an
// organization (a moderator may belong to no commerce org). Missing, or shorter than 8 / longer
// than 200 characters, is a 400 before the handler runs. The same key with a different body is a
// 409; the same key with the same body replays the original response verbatim.
//
// THREE RESPONSE SHAPES, AND THEY ARE NOT UNIFORM. The two CREATES answer two keys — the row plus
// the id of whatever the create silently closed. The four other writes answer one key. The two
// lists answer `{ items, page }`. That asymmetry is absorbed here so no component has to know it.
//
// WHAT THE ERRORS CANNOT TELL YOU, which shapes every call site: no response on this surface
// carries a machine-readable error code. The service's error union has `predecessorRateCardId`,
// the blocking `dwellEstimateId`, `state` and `validFrom` on it, and every one of them is stripped
// before the wire, surviving only as English prose inside `message`. A caller can branch on the
// status code and on which key appears in `errors` — nothing finer — and it can never deep-link to
// the row that blocked it.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  AdminCustomsDwellEstimatePageSchema,
  AdminFreightRateCardPageSchema,
  CreateCustomsDwellEstimateResultSchema,
  CreateFreightRateCardResultSchema,
  CustomsDwellEstimateResultSchema,
  FreightRateCardResultSchema,
  type AdminCustomsDwellEstimatePage,
  type AdminFreightRateCardPage,
  type CreateCustomsDwellEstimateInput,
  type CreateCustomsDwellEstimateResult,
  type CreateFreightRateCardInput,
  type CreateFreightRateCardResult,
  type CustomsDwellEstimateResult,
  type FreightRateBreakInput,
  type FreightRateCardResult,
  type ListCustomsDwellEstimatesFilter,
  type ListFreightRateCardsFilter,
  type UpdateFreightRateCardInput,
} from "@/lib/store/admin-freight.schemas";

// --- Reads ---------------------------------------------------------------------

/**
 * `GET /commerce/admin/freight-rate-cards` — one page of lane cards, bands nested.
 *
 * Ordered `(validFrom DESC, id ASC)` and NOT SORTABLE. The cursor is opaque and forward-only:
 * there is no total, no page number and no previous cursor, so a caller can accumulate pages but
 * can never render "showing 21-40 of 137" or jump.
 */
export function listFreightRateCards(
  filter: ListFreightRateCardsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminFreightRateCardPage>> {
  const path = `/commerce/admin/freight-rate-cards${buildQueryString({ ...filter })}`;
  return getJson(path, AdminFreightRateCardPageSchema, options);
}

/**
 * `GET /commerce/admin/customs-dwell-estimates`.
 *
 * Remember the two spellings: `originCountryCode` and `commodityScopeCategoryId` take the literal
 * `"any"` HERE to select NULL-scoped rows, while the create body spells that same idea as an
 * explicit `null`.
 */
export function listCustomsDwellEstimates(
  filter: ListCustomsDwellEstimatesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminCustomsDwellEstimatePage>> {
  const path = `/commerce/admin/customs-dwell-estimates${buildQueryString({ ...filter })}`;
  return getJson(path, AdminCustomsDwellEstimatePageSchema, options);
}

// --- Rate card writes ------------------------------------------------------------

/**
 * `POST /commerce/admin/freight-rate-cards` — a card and its whole ladder, in one call.
 *
 * **THIS CALL CAN SILENTLY RETIRE ANOTHER CARD.** If an active card exists on the same
 * `(providerOrganizationId, originCountryCode, destinationCountryCode, mode, currency)`, the same
 * transaction closes it, sets its `validUntil` to this card's `validFrom` and points it here — and
 * the ONLY report is `supersededRateCardId` on the result. There is no way to ask for this, refuse
 * it, or name the card being replaced; the caller's only defence is to look first.
 *
 * `validFrom` is required by `CreateFreightRateCardInput` even though the wire allows omitting it.
 * See that type — omitting it freezes the bands permanently.
 */
export function createFreightRateCard(
  input: CreateFreightRateCardInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreateFreightRateCardResult>> {
  return sendJson(
    "/commerce/admin/freight-rate-cards",
    "POST",
    input,
    CreateFreightRateCardResultSchema,
    options,
  );
}

/**
 * `PATCH /commerce/admin/freight-rate-cards/:rateCardId` — shorten the window, or withdraw.
 *
 * A window may only ever be SHORTENED. Widening one is a 422, and so is closing it at or before
 * `validFrom`, because an empty window is not a card anybody can price against.
 */
export function updateFreightRateCard(
  rateCardId: string,
  input: UpdateFreightRateCardInput,
  options?: RequestOptions,
): Promise<ActionResponse<FreightRateCardResult>> {
  const path = `/commerce/admin/freight-rate-cards/${encodeURIComponent(rateCardId)}`;
  return sendJson(path, "PATCH", input, FreightRateCardResultSchema, options);
}

/**
 * `POST /commerce/admin/freight-rate-cards/:rateCardId/breaks` — append one band.
 *
 * The body is a BARE band object, not wrapped. Position is assigned server-side as highest + 1.
 *
 * Refused with a 409 once the card is in force or has left `active` — read `bandsEditable` on the
 * card rather than guessing, and note that `IN_FORCE` never becomes retryable.
 */
export function appendFreightRateBreak(
  rateCardId: string,
  input: FreightRateBreakInput,
  options?: RequestOptions,
): Promise<ActionResponse<FreightRateCardResult>> {
  const path = `/commerce/admin/freight-rate-cards/${encodeURIComponent(rateCardId)}/breaks`;
  return sendJson(path, "POST", input, FreightRateCardResultSchema, options);
}

/**
 * `PATCH /commerce/admin/freight-rate-cards/:rateCardId/breaks` — replace the WHOLE ladder.
 *
 * There is no per-band edit and no band delete anywhere on this surface. Removing one band means
 * sending every band you are keeping, and the set may never reach zero (minimum 1, maximum 20).
 */
export function replaceFreightRateBreaks(
  rateCardId: string,
  breaks: readonly FreightRateBreakInput[],
  options?: RequestOptions,
): Promise<ActionResponse<FreightRateCardResult>> {
  const path = `/commerce/admin/freight-rate-cards/${encodeURIComponent(rateCardId)}/breaks`;
  return sendJson(path, "PATCH", { breaks }, FreightRateCardResultSchema, options);
}

// --- Customs dwell writes ---------------------------------------------------------

/**
 * `POST /commerce/admin/customs-dwell-estimates`.
 *
 * **THIS CALL CAN SILENTLY CLOSE ANOTHER ESTIMATE**, the same way creating a card supersedes one:
 * an open-ended row on the identical scope is closed at this row's `validFrom`, reported once as
 * `closedDwellEstimateId`.
 *
 * A domestic lane is refused — `originCountryCode` may not equal `destinationCountryCode`, because
 * a domestic lane has no customs leg at all. That is an absent component, not a zero-day one.
 */
export function createCustomsDwellEstimate(
  input: CreateCustomsDwellEstimateInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreateCustomsDwellEstimateResult>> {
  return sendJson(
    "/commerce/admin/customs-dwell-estimates",
    "POST",
    input,
    CreateCustomsDwellEstimateResultSchema,
    options,
  );
}

/**
 * `PATCH /commerce/admin/customs-dwell-estimates/:dwellEstimateId` — retire one.
 *
 * "Retire" IS setting `validUntil`; there is no delete and no state column. An already-closed row
 * answers 409 and can never be reopened, so this is a one-way door per row.
 */
export function retireCustomsDwellEstimate(
  dwellEstimateId: string,
  validUntil: string,
  options?: RequestOptions,
): Promise<ActionResponse<CustomsDwellEstimateResult>> {
  const path = `/commerce/admin/customs-dwell-estimates/${encodeURIComponent(dwellEstimateId)}`;
  return sendJson(path, "PATCH", { validUntil }, CustomsDwellEstimateResultSchema, options);
}
