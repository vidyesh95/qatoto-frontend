// TRANSPORT: props-only — schemas for rated freight, no network of their own.
//
// Client contract for §19's rate-card machinery: the lane plan that hangs off the product delivery
// estimate, and the freight half of an order's arrival window. Transcribed from
// `commerce-freight-rating.service.ts` (:39-189) and `commerce-freight-journey.service.ts` (:37-128).
//
// THE RATE TABLES SHIP EMPTY, DELIBERATELY, WITH NO SEED (A36). Today every lane is uncovered, so
// the priced path is the rare one and THE NAMED-ABSENCE PATH IS THE PRODUCT. Everything here that
// looks like error handling — `unavailableReasons`, `unpriceableReasons`, `quotableProviders` — is
// the main case, and a renderer that treats it as a fallback renders a blank panel on every lane
// that exists.
//
// FOUR RULES THIS FILE ENCODES, each one a thing the mock delivery sheet got wrong:
//
//  1. A PRICE RENDERS ONLY THROUGH `providerQuote`. Qatoto sells no freight (§0), so `FreightOption`
//     carries no price of its own — the money sits inside the object that names its author, beside
//     `sourceForwarderName`, `validUntil` and `subjectToRemeasurement`. THE NESTING IS THE MECHANISM
//     (§19.9b): a sibling `sourceForwarderName` is a field a renderer can ignore, and a price
//     reachable only through the forwarder who quoted it is not. Do not flatten this.
//  2. THE CLIENT NEVER SUMS. Leg prices, transit days and currencies are all composed by the server
//     into `journeys[]`, which carries `totalInCents` already computed. The mock summed `priceUsd`
//     floats across two legs, which is both a float total and a currency baked into a field name.
//  3. LOCALITIES ARE LABELS. `originLocality` and `destinationLocality` render and select nothing —
//     rate cards are keyed by COUNTRY PAIR, and no rate table is keyed by a locality. Treating one
//     as a lane key would look like it worked until it silently priced the wrong lane.
//  4. CHARGEABLE WEIGHT IS PER CARD, NOT PER CONSIGNMENT. The volumetric divisor belongs to the
//     forwarder, so an ocean card (1000) and an inland card (3000) rating the SAME boxes legitimately
//     bill two different weights on one journey. That is why the basis travels beside every price:
//     a buyer whose 20 kg bills as 3,000 kg reads a correct volumetric charge as an error otherwise.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * FOUR MEMBERS, NOT FIVE, AND THIS IS THE TRAP ON THIS SURFACE.
 *
 * `FREIGHT_TRANSPORT_MODES` in `shared.schemas.ts` has five and includes `multimodal`; that is
 * `freight_transport_mode`, the enum a provider's OFFERING is tagged with. A rate card's `mode`
 * column is `commerce_shipment_leg_mode`, which has four. Reusing the five-member tuple here would
 * accept a `multimodal` no rate card can carry, and a mode picker built from it would offer the
 * buyer a choice the rater cannot answer.
 *
 * `FREIGHT_TRANSPORT_MODE_LABELS` and `_ICONS` in `labels.ts` are keyed by the five-member superset,
 * so they index this subset cleanly — reuse them rather than spelling mode names again.
 */
export const FREIGHT_MODES = ["air", "sea", "land", "rail"] as const;

export type FreightMode = (typeof FREIGHT_MODES)[number];

export const FreightModeSchema = z.enum(FREIGHT_MODES);

/**
 * Which of the two weights won.
 *
 * A TYPESCRIPT UNION COMPUTED AT READ TIME, not a pgEnum — nothing persists it, so there is no
 * database enum to check this tuple against. Transcribed from the rating service.
 */
export const CHARGEABLE_WEIGHT_BASES = ["actual", "volumetric"] as const;

export type ChargeableWeightBasis = (typeof CHARGEABLE_WEIGHT_BASES)[number];

/**
 * Why a card produced no option. EVERY ONE OF THESE IS REPORTED, NEVER DEFAULTED (§19.6).
 *
 * `below_smallest_break` is the one worth reading twice: a 5 kg parcel against a card whose smallest
 * band floors at 45 kg yields NO OPTION, where Alibaba would apply the band's minimum charge. That
 * is a deliberate divergence, not a gap, and it must read as "this lane is uncovered for this
 * consignment" rather than as an error.
 */
export const FREIGHT_UNAVAILABLE_REASONS = [
  "no_active_rate_card",
  "consignment_not_measurable",
  "volume_not_declared",
  "below_smallest_break",
  "card_has_no_breaks",
] as const;

export type FreightUnavailableReason = (typeof FREIGHT_UNAVAILABLE_REASONS)[number];

/** What this consignment measures, before any forwarder's convention is applied to it. */
export const ConsignmentMeasurementSchema = z
  .object({
    billableWeightGrams: z.number().int().nullable(),
    volumeCubicCm: z.number().int().nullable(),
    packageCount: z.number().int().nullable(),
    /** A seller who never declared package geometry. The buyer should be able to tell. */
    hasIncompletePackageData: z.boolean(),
  })
  .strip();

/**
 * A NAMED FORWARDER'S PRICE, and the only place a freight price exists.
 *
 * `subjectToRemeasurement` is always `true` and is on the wire anyway, so a client cannot claim it
 * was not told: forwarders re-weigh and re-measure at pickup and bill the result, so a rate computed
 * from a seller's declaration is the provider's estimate against that declaration and never a fixed
 * charge. `z.literal(true)` rather than `z.boolean()` — a `false` here would be a contract break, not
 * a value to render differently.
 */
export const ProviderFreightQuoteSchema = z
  .object({
    providerOrganizationId: z.string(),
    sourceForwarderName: z.string(),
    priceInCents: z.number().int(),
    currency: z.string(),
    /** An expired card is not a price (§19.6). Null means no announced end, not "forever verified". */
    validUntil: IsoDateTimeSchema.nullable(),
    subjectToRemeasurement: z.literal(true),
  })
  .strip();

/** One mode a buyer could pick for one leg. THE PRICE IS INSIDE `providerQuote`, never beside it. */
export const FreightOptionSchema = z
  .object({
    mode: FreightModeSchema,
    providerQuote: ProviderFreightQuoteSchema,
    transitDaysMin: z.number().int(),
    transitDaysMax: z.number().int(),
    rateCardId: z.string(),
    rateBreakId: z.string(),
    chargeableWeightGrams: z.number().int(),
    chargeableWeightBasis: z.enum(CHARGEABLE_WEIGHT_BASES),
  })
  .strip();

/**
 * A forwarder who sells this lane and could be asked for a real quote.
 *
 * PRESENT EVEN WHEN NOTHING PRICED, which is the entire point: a lane that cannot be rated used to
 * end in a named absence and nothing else, and telling a buyer no price exists while offering no way
 * forward is a dead end. This is the route into an RFQ.
 */
export const QuotableFreightProviderSchema = z
  .object({
    providerOrganizationId: z.string(),
    sourceForwarderName: z.string(),
    mode: FreightModeSchema,
  })
  .strip();

/**
 * One leg of a journey.
 *
 * AT MOST TWO, and the inland one is on the DESTINATION side. Origin-side drayage already sits
 * inside the international card's own country pair, and an origin-side leg would need a card keyed
 * by the seller's locality — which does not exist, so that leg would be permanently uncovered and,
 * by the "an uncovered leg makes the whole journey unpriceable" rule, would poison every journey
 * forever.
 */
export const FreightLegPlanSchema = z
  .object({
    sequence: z.number().int(),
    kind: z.enum(["international", "inland_destination", "domestic"]),
    originCountryCode: z.string(),
    /** LABEL ONLY — selects no card. */
    originLocality: z.string().nullable(),
    destinationCountryCode: z.string(),
    /** LABEL ONLY — selects no card. */
    destinationLocality: z.string().nullable(),
    options: z.array(FreightOptionSchema),
    unavailableReasons: z.array(z.enum(FREIGHT_UNAVAILABLE_REASONS)),
    quotableProviders: z.array(QuotableFreightProviderSchema),
  })
  .strip();

/**
 * One leg's contribution to a composed journey.
 *
 * CHARGEABLE WEIGHT IS HERE, PER LEG, and not once on the journey. Two legs on one journey
 * legitimately bill different weights because their forwarders use different volumetric divisors;
 * a single journey-level figure would make one of the two leg prices look like an arithmetic error.
 */
export const FreightJourneyLegSelectionSchema = z
  .object({
    legSequence: z.number().int(),
    rateCardId: z.string(),
    mode: FreightModeSchema,
    priceInCents: z.number().int(),
    transitDaysMin: z.number().int(),
    transitDaysMax: z.number().int(),
    sourceForwarderName: z.string(),
    chargeableWeightGrams: z.number().int(),
    chargeableWeightBasis: z.enum(CHARGEABLE_WEIGHT_BASES),
  })
  .strip();

/**
 * A whole journey, priced and timed BY THE SERVER.
 *
 * `totalInCents` and the transit range are why the client never adds anything up. `primaryMode` is
 * the mode the BUYER is choosing between — the international leg's on a cross-border journey, the
 * single leg's on a domestic one — and is deliberately not called `internationalMode`, because a
 * domestic journey still offers land against rail and that name would force it null.
 */
export const FreightJourneyProjectionSchema = z
  .object({
    currency: z.string(),
    primaryMode: FreightModeSchema,
    totalInCents: z.number().int(),
    transitDaysMin: z.number().int(),
    transitDaysMax: z.number().int(),
    /** The earliest expiry across the selections — a journey expires with its first card. */
    validUntil: IsoDateTimeSchema.nullable(),
    legSelections: z.array(FreightJourneyLegSelectionSchema),
  })
  .strip();

/**
 * Why no whole journey could be priced, discriminated on `kind`.
 *
 * `leg_uncovered` is the one that will fire most: an uncovered leg makes the WHOLE journey
 * unpriceable, and on most lanes no forwarder sells a domestic card in the destination country, so a
 * perfectly good ocean rate goes unshown. §19.9 calls this the largest practical divergence from
 * Alibaba and agrees the fix is an Incoterm concept rather than a rate table — so nothing on this
 * client works around it. Faking a port-to-port render would be the client deciding an Incoterm.
 */
export const JourneyUnpriceableReasonSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("leg_uncovered"),
      legSequence: z.number().int(),
      reasons: z.array(z.enum(FREIGHT_UNAVAILABLE_REASONS)),
    })
    .strip(),
  /** A USD ocean card plus a EUR inland card. Both are real prices; neither may be converted. */
  z.object({ kind: z.literal("no_common_currency_across_legs") }).strip(),
  z.object({ kind: z.literal("origin_country_unresolved") }).strip(),
]);

/**
 * Everything known about moving this consignment along this lane.
 *
 * `contracting.party` IS STATED ONCE, at the level the fact belongs to. Who the buyer contracts with
 * is a property of the engagement, not of each row, and a constant repeated on every option is how a
 * field becomes one renderers learn to ignore.
 */
export const FreightLanePlanSchema = z
  .object({
    contracting: z.object({ party: z.literal("provider") }).strip(),
    origin: z.object({ countryCode: z.string(), locality: z.string().nullable() }).strip(),
    destination: z.object({ countryCode: z.string(), locality: z.string().nullable() }).strip(),
    consignment: ConsignmentMeasurementSchema,
    legs: z.array(FreightLegPlanSchema),
    journeys: z.array(FreightJourneyProjectionSchema),
    unpriceableReasons: z.array(JourneyUnpriceableReasonSchema),
    quotableProviders: z.array(QuotableFreightProviderSchema),
  })
  .strip();

export type ConsignmentMeasurement = z.infer<typeof ConsignmentMeasurementSchema>;
export type ProviderFreightQuote = z.infer<typeof ProviderFreightQuoteSchema>;
export type FreightOption = z.infer<typeof FreightOptionSchema>;
export type QuotableFreightProvider = z.infer<typeof QuotableFreightProviderSchema>;
export type FreightLegPlan = z.infer<typeof FreightLegPlanSchema>;
export type FreightJourneyLegSelection = z.infer<typeof FreightJourneyLegSelectionSchema>;
export type FreightJourneyProjection = z.infer<typeof FreightJourneyProjectionSchema>;
export type JourneyUnpriceableReason = z.infer<typeof JourneyUnpriceableReasonSchema>;
export type FreightLanePlan = z.infer<typeof FreightLanePlanSchema>;

// --- Display copy for the named absences ------------------------------------
//
// THESE ARE THE MAIN CASE, NOT ERROR STRINGS. With no rate cards loaded they are the entire content
// of the delivery sheet, so each says what is true and, where there is one, what to do next.

export const FREIGHT_UNAVAILABLE_REASON_LABELS: Record<FreightUnavailableReason, string> = {
  no_active_rate_card: "No forwarder has published a rate for this leg.",
  consignment_not_measurable:
    "This seller hasn't published the package size and weight needed to rate freight.",
  volume_not_declared: "This seller hasn't published package dimensions, so volume is unknown.",
  below_smallest_break:
    "This shipment is lighter than the smallest band any published rate covers for this leg.",
  card_has_no_breaks: "The published rate for this leg has no weight bands.",
};

export const CHARGEABLE_WEIGHT_BASIS_LABELS: Record<ChargeableWeightBasis, string> = {
  actual: "billed on actual weight",
  volumetric: "billed on volumetric weight",
};

/** What each leg is, in the buyer's terms rather than the rater's. */
export const FREIGHT_LEG_KIND_LABELS: Record<FreightLegPlan["kind"], string> = {
  international: "International leg",
  inland_destination: "Inland leg",
  domestic: "Domestic delivery",
};

/**
 * Why nothing could be priced end to end.
 *
 * TAKES THE LEGS SO IT CAN NAME ONE, and that is not a convenience. `legSequence` is ZERO-INDEXED on
 * the wire, so rendering it raw shows a buyer "Leg 0" — an array index, which is a developer's
 * number and not a fact about their shipment. Which leg is uncovered is the whole content of this
 * message: "the international leg has no rate" and "the inland leg has no rate" are very different
 * pieces of news, and only the leg's KIND carries that.
 *
 * Falls back to a one-based ordinal if the sequence matches no leg, because a wrong-looking number
 * is still better than dropping the only locating detail in the sentence.
 */
export function describeUnpriceableReason(
  reason: JourneyUnpriceableReason,
  legs: readonly FreightLegPlan[],
): string {
  switch (reason.kind) {
    case "leg_uncovered": {
      const namedLeg = legs.find((leg) => leg.sequence === reason.legSequence);
      const legLabel =
        namedLeg === undefined
          ? `Leg ${reason.legSequence + 1}`
          : `The ${FREIGHT_LEG_KIND_LABELS[namedLeg.kind].toLowerCase()}`;
      return `${legLabel} has no published rate, so no end-to-end price can be worked out.`;
    }
    case "no_common_currency_across_legs":
      // Never converted, and never silently: converting without an FX quote would invent a rate.
      return "The legs of this route are priced in different currencies, and Qatoto does not convert between them.";
    case "origin_country_unresolved":
      return "This seller hasn't published a dispatch country, so the route can't be worked out.";
    default: {
      const exhaustiveCheck: never = reason;
      return exhaustiveCheck;
    }
  }
}
