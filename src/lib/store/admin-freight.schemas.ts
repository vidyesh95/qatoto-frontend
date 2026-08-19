// TRANSPORT: props-only — schemas and pure predicates for the freight admin console, no network
// of its own.
//
// Client contract for the eight `/commerce/admin/{freight-rate-cards,customs-dwell-estimates}`
// routes (backend STORE_BACKEND_STRUCTURE.md §19.10, operator sequence §19.11). Every one of them
// is behind `moderate_commerce`, checked INSIDE the service rather than by route middleware — so a
// refusal arrives as a normal tagged failure, not as an opaque route-level 403.
//
// THE MODE TUPLE IS IMPORTED, NOT REDECLARED, and the distinction is load-bearing. A rate card's
// `mode` column is `commerce_shipment_leg_mode` — FOUR members. `FREIGHT_TRANSPORT_MODES` in
// `shared.schemas.ts` has FIVE, and its extra member `multimodal` is a journey descriptor that no
// single card can carry. Spelling the tuple again here is how the fifth one eventually leaks into
// a picker and becomes a 422 nobody can explain.

import { z } from "zod";

import { FreightModeSchema, type FreightMode } from "@/lib/store/freight.schemas";
import { cursorPageOf } from "@/lib/store/shared.schemas";

// --- Lifecycle ----------------------------------------------------------------

/**
 * The card lifecycle, verbatim as the backend spells it.
 *
 * `proposed` IS DELIBERATELY ABSENT. A card is authored complete-with-bands in one call and is
 * `active` from birth; "not yet in force" is expressed by a future `validFrom`, not by a state.
 * A card leaves `active` either by an explicit withdraw or SILENTLY, when a successor is created
 * on the same lane five-tuple.
 */
export const FREIGHT_RATE_CARD_STATES = ["active", "superseded", "withdrawn"] as const;
export type FreightRateCardState = (typeof FREIGHT_RATE_CARD_STATES)[number];
export const FreightRateCardStateSchema = z.enum(FREIGHT_RATE_CARD_STATES);

export const FREIGHT_RATE_CARD_STATE_LABELS: Record<FreightRateCardState, string> = {
  active: "Active",
  superseded: "Superseded",
  withdrawn: "Withdrawn",
};

// --- Rate cards ---------------------------------------------------------------

/**
 * One weight/volume band on a card's ladder.
 *
 * `position` IS SERVER-ASSIGNED AND DENSE FROM 0. It is not on any request body — the order of the
 * `breaks` array IS the order — so nothing here may let an operator type one.
 *
 * Both floors are conjunctive at rating time: a consignment must clear `minBillableWeightGrams`
 * AND `minVolumeCubicCm` to qualify for the band, and the highest qualifying band wins.
 */
export const AdminFreightRateBreakSchema = z
  .object({
    id: z.string(),
    position: z.number().int(),
    minBillableWeightGrams: z.number().int(),
    minVolumeCubicCm: z.number().int(),
    unitPriceInCents: z.number().int(),
    minimumChargeInCents: z.number().int(),
    transitDaysMin: z.number().int(),
    transitDaysMax: z.number().int(),
  })
  .strip();
export type AdminFreightRateBreak = z.infer<typeof AdminFreightRateBreakSchema>;

/**
 * One lane rate card, as the admin surface sees it.
 *
 * **`bandsEditable` IS READ, NEVER DERIVED.** It is computed server-side by the SAME predicate the
 * 409 comes from (`state === "active" && validFrom > now`), against one `now` per request.
 * Recomputing it in the browser would put the deciding rule in two codebases and let clock skew
 * disagree with the server about whether a control should exist.
 *
 * `supersededByRateCardId` is past tense — "who replaced me". There is no forward-facing
 * `supersedesRateCardId` anywhere in the product: an operator cannot name, choose or opt out of
 * the card their new one replaces.
 */
export const AdminFreightRateCardSchema = z
  .object({
    id: z.string(),
    providerOrganizationId: z.string(),
    originCountryCode: z.string(),
    destinationCountryCode: z.string(),
    mode: FreightModeSchema,
    currency: z.string(),
    validFrom: z.string(),
    validUntil: z.string().nullable(),
    sourceForwarderName: z.string(),
    volumetricDivisorCm3PerKg: z.number().int(),
    state: FreightRateCardStateSchema,
    supersededByRateCardId: z.string().nullable(),
    bandsEditable: z.boolean(),
    breaks: AdminFreightRateBreakSchema.array(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type AdminFreightRateCard = z.infer<typeof AdminFreightRateCardSchema>;

export const AdminFreightRateCardPageSchema = cursorPageOf(AdminFreightRateCardSchema);
export type AdminFreightRateCardPage = z.infer<typeof AdminFreightRateCardPageSchema>;

/**
 * The create response, which carries the ONLY report a supersession ever gets.
 *
 * `supersededRateCardId` is non-null when this create silently closed an incumbent on the same
 * `(provider, origin, destination, mode, currency)`. It is reported exactly once, here — no later
 * read announces it — so a console that drops it loses the fact permanently.
 */
export const CreateFreightRateCardResultSchema = z
  .object({
    rateCard: AdminFreightRateCardSchema,
    supersededRateCardId: z.string().nullable(),
  })
  .strip();
export type CreateFreightRateCardResult = z.infer<typeof CreateFreightRateCardResultSchema>;

/** The four non-create card writes all answer the same one-key envelope. */
export const FreightRateCardResultSchema = z
  .object({ rateCard: AdminFreightRateCardSchema })
  .strip();
export type FreightRateCardResult = z.infer<typeof FreightRateCardResultSchema>;

// --- Customs dwell estimates ---------------------------------------------------

/**
 * One customs clearance estimate.
 *
 * THERE IS NO STATE COLUMN AND NONE IS PLANNED — the window IS the lifecycle. A `validUntil` of
 * null means the estimate is open; setting it is what "retire" means, and a retired row can never
 * be reopened.
 *
 * `originCountryCode: null` means ANY origin and `commodityScopeCategoryId: null` means ANY
 * commodity. Both are real scope values, not missing data.
 */
export const AdminCustomsDwellEstimateSchema = z
  .object({
    id: z.string(),
    destinationCountryCode: z.string(),
    originCountryCode: z.string().nullable(),
    commodityScopeCategoryId: z.string().nullable(),
    clearanceDaysMin: z.number().int(),
    clearanceDaysMax: z.number().int(),
    source: z.string(),
    validFrom: z.string(),
    validUntil: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type AdminCustomsDwellEstimate = z.infer<typeof AdminCustomsDwellEstimateSchema>;

export const AdminCustomsDwellEstimatePageSchema = cursorPageOf(AdminCustomsDwellEstimateSchema);
export type AdminCustomsDwellEstimatePage = z.infer<typeof AdminCustomsDwellEstimatePageSchema>;

/**
 * The create response. `closedDwellEstimateId` is the mirror of `supersededRateCardId`: creating
 * an estimate on a scope that already has an open-ended row CLOSES that row at the new
 * `validFrom`, and this is the only place that closure is ever reported.
 */
export const CreateCustomsDwellEstimateResultSchema = z
  .object({
    dwellEstimate: AdminCustomsDwellEstimateSchema,
    closedDwellEstimateId: z.string().nullable(),
  })
  .strip();
export type CreateCustomsDwellEstimateResult = z.infer<
  typeof CreateCustomsDwellEstimateResultSchema
>;

export const CustomsDwellEstimateResultSchema = z
  .object({ dwellEstimate: AdminCustomsDwellEstimateSchema })
  .strip();
export type CustomsDwellEstimateResult = z.infer<typeof CustomsDwellEstimateResultSchema>;

// --- List filters --------------------------------------------------------------

/**
 * NOTE WHAT IS NOT HERE, because the console has to work around all of it: there is no `currency`
 * filter, no `sourceForwarderName` search, no date-range filter, and no `bandsEditable` filter —
 * so "which cards can I still edit?", the single most useful operational question, cannot be
 * asked of the server.
 */
export interface ListFreightRateCardsFilter {
  readonly originCountryCode?: string;
  readonly destinationCountryCode?: string;
  readonly mode?: FreightMode;
  readonly providerOrganizationId?: string;
  readonly state?: FreightRateCardState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `originCountryCode` and `commodityScopeCategoryId` take the LITERAL STRING `"any"` here to select
 * rows stored as NULL — while the create body spells the same concept as an explicit `null`. Two
 * spellings for one idea, both required by the backend. Do not normalize either.
 *
 * `openOnly` only ever NARROWS: `false` is identical to omitting it, so there is no way to list
 * retired estimates alone.
 */
export interface ListCustomsDwellEstimatesFilter {
  readonly destinationCountryCode?: string;
  readonly originCountryCode?: string;
  readonly commodityScopeCategoryId?: string;
  readonly openOnly?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

/** The sentinel the LIST filters use for "the rows scoped to anything". */
export const ANY_SCOPE_FILTER = "any";

// --- Write bodies ---------------------------------------------------------------

/**
 * A band as sent. No `id`, no `position` — the array order is the ladder.
 *
 * `unitPriceInCents` has a floor of 1 on the backend: a zero-priced band is refused rather than
 * treated as free carriage.
 */
export interface FreightRateBreakInput {
  readonly minBillableWeightGrams: number;
  readonly minVolumeCubicCm: number;
  readonly unitPriceInCents: number;
  readonly minimumChargeInCents: number;
  readonly transitDaysMin: number;
  readonly transitDaysMax: number;
}

/**
 * A new card, authored complete.
 *
 * **`validFrom` IS OPTIONAL ON THE WIRE AND THAT IS THE TRAP.** Omitting it makes the backend
 * default to `new Date()`, which means the card is in force at the instant it exists and its bands
 * are frozen FOREVER — `validFrom` is in no PATCH schema, so there is no correction, only withdraw
 * and re-author. It is therefore REQUIRED here, and the composer refuses a non-future value.
 *
 * `breaks` is required 1..20 in the same call. A two-call create would leave a window where the
 * incumbent is already superseded and the successor prices nothing.
 */
export interface CreateFreightRateCardInput {
  readonly providerOrganizationId: string;
  readonly originCountryCode: string;
  readonly destinationCountryCode: string;
  readonly mode: FreightMode;
  readonly currency: string;
  readonly validFrom: string;
  readonly validUntil?: string;
  readonly sourceForwarderName: string;
  readonly volumetricDivisorCm3PerKg: number;
  readonly breaks: readonly FreightRateBreakInput[];
}

/**
 * The only two edits a card admits, as a discriminated union exactly as the backend declares it.
 *
 * Everything else — lane, mode, currency, `validFrom`, forwarder name, divisor — is immutable, and
 * because the backend schema is `.strict()` sending one is a hard 422 rather than an ignored key.
 */
export type UpdateFreightRateCardInput =
  | { readonly intent: "shorten_window"; readonly validUntil: string }
  | { readonly intent: "withdraw"; readonly reasonNote: string };

/**
 * A new dwell estimate.
 *
 * `originCountryCode` and `commodityScopeCategoryId` are REQUIRED KEYS that may be null. Omitting
 * one is a 422, not a default — the backend refuses to guess whether an absent scope meant "any"
 * or was forgotten.
 */
export interface CreateCustomsDwellEstimateInput {
  readonly destinationCountryCode: string;
  readonly originCountryCode: string | null;
  readonly commodityScopeCategoryId: string | null;
  readonly clearanceDaysMin: number;
  readonly clearanceDaysMax: number;
  readonly source: string;
  readonly validFrom?: string;
  readonly validUntil?: string;
}

// --- Derived signals ------------------------------------------------------------

/**
 * Whether a card's ladder has a band every consignment can reach.
 *
 * DERIVED IN THE BROWSER, and labelled that way wherever it renders, because there is no
 * server-side coverage read. It is safe to compute here only because `breaks[]` is nested in every
 * card projection — this is arithmetic over data already on screen, not a second source of truth.
 *
 * WHY IT MATTERS: rating picks the highest band a consignment clears. With no band at
 * `minBillableWeightGrams: 0`, everything lighter than the smallest floor answers
 * `below_smallest_break`, which reaches the buyer as an EMPTY OPTIONS LIST — indistinguishable
 * from a lane that has no rate card at all. The lane looks unserved rather than mispriced, which
 * is the failure mode nobody reports because nobody sees it.
 */
export function hasZeroWeightFloorBand(breaks: readonly AdminFreightRateBreak[]): boolean {
  return breaks.some((rateBreak) => rateBreak.minBillableWeightGrams === 0);
}

/** The lightest consignment the ladder prices at all, or null when it prices everything. */
export function smallestWeightFloorGrams(breaks: readonly AdminFreightRateBreak[]): number | null {
  if (breaks.length === 0) return null;
  const floors = breaks.map((rateBreak) => rateBreak.minBillableWeightGrams);
  const smallest = Math.min(...floors);
  return smallest === 0 ? null : smallest;
}
