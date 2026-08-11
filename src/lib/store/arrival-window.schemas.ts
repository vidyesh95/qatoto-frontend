// TRANSPORT: props-only — schemas for the order arrival window, no network of their own.
//
// Client contract for `GET /commerce/orders/:orderId/arrival-window`. Transcribed from
// `commerce-arrival-window.service.ts` (:48-137) and `commerce-customs-dwell.service.ts` (:32-43).
//
// THE WINDOW IS THE ONLY PLACE THIS PRODUCT PRINTS A DATE, and it closes only when all three
// components are resolved. Everywhere else — the delivery estimate, the lane plan, the checkout
// sheet — carries DAYS, because Qatoto owns no shipping network and a date it cannot keep is a
// promise it has no business making. What makes a date defensible here is that an order has a
// confirmed clock start, a manufacturing deadline, a rated leg and a customs dwell estimate behind
// it. Take any one away and the window is `null`.
//
// THREE THINGS THIS FILE ENCODES THAT A RENDERER WILL GET WRONG OTHERWISE:
//
//  1. EVERY COMPONENT IS A DISCRIMINATED UNION ON `status`, NEVER A NULLABLE OBJECT. A component is
//     RESOLVED iff its status is `known` or `not_applicable`, and only `unknown` reaches
//     `missingComponents`. `not_applicable` is an ANSWER — a domestic lane genuinely has no customs
//     leg — and rendering it as a gap would tell a buyer something is missing when nothing is.
//  2. `customs: not_applicable/domestic_lane` AND `customs: unknown/no_dwell_estimate_for_lane` MUST
//     READ DIFFERENTLY. The first still lets the window close; the second is precisely why it cannot.
//     Collapsing them into "customs: —" hides the difference between "there is no customs step" and
//     "nobody has bought dwell data for this lane".
//  3. `clockStartAt` AND `orderPlacedAt` ARE DIFFERENT INSTANTS. The clock starts at `confirmedAt`,
//     not at `createdAt`, so an order that sat unpaid for a week has a legible gap between the two.
//     That gap is meant to be visible — it is the answer to "why is my window later than I expected".

import { z } from "zod";

import {
  ConsignmentMeasurementSchema,
  FreightJourneyLegSelectionSchema,
  FreightModeSchema,
  type FreightMode,
} from "@/lib/store/freight.schemas";
import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

export const ARRIVAL_WINDOW_COMPONENT_NAMES = ["manufacturing", "freight", "customs"] as const;

export type ArrivalWindowComponentName = (typeof ARRIVAL_WINDOW_COMPONENT_NAMES)[number];

/**
 * How long the seller says it takes to make the goods.
 *
 * `daysMin` IS NULLABLE INSIDE THE `known` ARM, which is not an oversight: a seller who declared only
 * a maximum has a real, usable deadline and an unknown floor. `basis` says which of the two happened,
 * so a renderer never has to guess whether a missing minimum means "immediate" or "unstated".
 */
export const ManufacturingComponentSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("known"),
      daysMin: z.number().int().nullable(),
      daysMax: z.number().int(),
      endsAt: IsoDateTimeSchema,
      basis: z.enum(["declared_maximum_only", "declared_range"]),
    })
    .strip(),
  z
    .object({
      status: z.literal("not_applicable"),
      reason: z.literal("no_physical_goods_on_order"),
    })
    .strip(),
  z
    .object({
      status: z.literal("unknown"),
      reason: z.literal("no_seller_declared_lead_time"),
    })
    .strip(),
]);

/**
 * Why freight could not be timed.
 *
 * `mode_not_selected` IS NOT A FAILURE — it is the server refusing to choose for the buyer, and it
 * arrives with `availableModes` precisely so the client can offer the choice. NO MODE IS EVER
 * AUTO-SELECTED: picking the cheapest would silently commit a buyer to 34 days at sea when they
 * would have paid for air.
 */
export const FREIGHT_UNKNOWN_REASONS = [
  "destination_unresolved",
  "origin_country_unresolved",
  "consignment_not_measurable",
  "no_active_rate_card",
  "leg_uncovered",
  "no_common_currency_across_legs",
  "mode_not_selected",
  "mode_not_covered",
] as const;

export type FreightUnknownReason = (typeof FREIGHT_UNKNOWN_REASONS)[number];

export const FreightComponentSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("known"),
      daysMin: z.number().int(),
      daysMax: z.number().int(),
      mode: FreightModeSchema,
      priceInCents: z.number().int(),
      currency: z.string(),
      validUntil: IsoDateTimeSchema.nullable(),
      legSelections: z.array(FreightJourneyLegSelectionSchema),
    })
    .strip(),
  z
    .object({
      status: z.literal("not_applicable"),
      reason: z.literal("no_physical_goods_on_order"),
    })
    .strip(),
  z
    .object({
      status: z.literal("unknown"),
      reason: z.enum(FREIGHT_UNKNOWN_REASONS),
      availableModes: z.array(FreightModeSchema),
    })
    .strip(),
]);

/**
 * Customs dwell, exposed as its OWN component rather than bundled into transit.
 *
 * More transparent than Alibaba, and intended (§19.9). `scope` says how specific the estimate that
 * matched actually was — an `any`-scoped figure is a much weaker claim than one keyed to this origin
 * and this commodity, and a buyer reading a clearance range deserves to know which they got.
 *
 * TWO `not_applicable` ARMS WITH DIFFERENT REASONS, and both are correct: a domestic lane has no
 * customs leg, and an order of no physical goods has no shipment at all.
 */
export const CustomsComponentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_applicable"), reason: z.literal("domestic_lane") }).strip(),
  z
    .object({
      status: z.literal("not_applicable"),
      reason: z.literal("no_physical_goods_on_order"),
    })
    .strip(),
  z
    .object({
      status: z.literal("known"),
      estimateId: z.string(),
      clearanceDaysMin: z.number().int(),
      clearanceDaysMax: z.number().int(),
      source: z.string(),
      validUntil: IsoDateTimeSchema.nullable(),
      scope: z.enum(["origin_and_commodity", "origin_only", "commodity_only", "any"]),
    })
    .strip(),
  z
    .object({
      status: z.literal("unknown"),
      reason: z.literal("no_dwell_estimate_for_lane"),
    })
    .strip(),
]);

export const ArrivalWindowProjectionSchema = z
  .object({
    /** `order.confirmedAt`. Null until the order is confirmed, and then the window cannot close. */
    clockStartAt: IsoDateTimeSchema.nullable(),
    clockStartBasis: z.enum(["order_confirmed_at", "not_confirmed"]),
    /** `order.createdAt`. A DIFFERENT INSTANT from `clockStartAt` — the gap is meant to be legible. */
    orderPlacedAt: IsoDateTimeSchema,
    lane: z
      .object({
        originCountryCode: z.string().nullable(),
        destinationCountryCode: z.string().nullable(),
        destinationSource: z.enum(["order_delivery_address", "rfq_destination", "unresolved"]),
      })
      .strip(),
    consignment: ConsignmentMeasurementSchema.nullable(),
    components: z
      .object({
        manufacturing: ManufacturingComponentSchema,
        freight: FreightComponentSchema,
        customs: CustomsComponentSchema,
      })
      .strip(),
    /**
     * THE DATE PAIR, AND THE ONLY DATE THIS PRODUCT PRINTS. Null whenever any component is `unknown`,
     * the clock has not started, or manufacturing is not `known` — in which case `missingComponents`
     * says which, and the client renders those rather than an approximation.
     */
    arrivalWindow: z
      .object({
        fromDate: IsoDateTimeSchema,
        toDate: IsoDateTimeSchema,
        basis: z.literal("manufacturing_deadline_anchored"),
      })
      .strip()
      .nullable(),
    /** Only `unknown` components appear here, in the fixed order manufacturing → freight → customs. */
    missingComponents: z.array(z.enum(ARRIVAL_WINDOW_COMPONENT_NAMES)),
  })
  .strip();

/**
 * THE PAYLOAD DOUBLE-NESTS, and this is not a typo.
 *
 * The envelope's `data` is `{ arrivalWindow: ArrivalWindowProjection }`, and the projection ITSELF
 * has a field called `arrivalWindow` holding the date pair. `getJson` hands the schema `envelope.data`,
 * so this wrapper peels the first layer and `.arrivalWindow` on the result is the second.
 */
export const OrderArrivalWindowResponseSchema = z
  .object({ arrivalWindow: ArrivalWindowProjectionSchema })
  .strip();

/** `.strict()` on the backend — a `mode` is the only key this query accepts. */
export interface ArrivalWindowFilter {
  readonly mode?: FreightMode;
}

export type ManufacturingComponent = z.infer<typeof ManufacturingComponentSchema>;
export type FreightComponent = z.infer<typeof FreightComponentSchema>;
export type CustomsComponent = z.infer<typeof CustomsComponentSchema>;
export type ArrivalWindowProjection = z.infer<typeof ArrivalWindowProjectionSchema>;

// --- Display copy -----------------------------------------------------------

export const ARRIVAL_WINDOW_COMPONENT_LABELS: Record<ArrivalWindowComponentName, string> = {
  manufacturing: "Manufacturing",
  freight: "Freight",
  customs: "Customs clearance",
};

/**
 * Why freight has no timing yet.
 *
 * `mode_not_selected` is deliberately phrased as a prompt rather than a fault — it is the one entry
 * here the buyer can clear themselves, in one click, and wording it like a failure would send them
 * to support instead of to the mode picker beside it.
 */
export const FREIGHT_UNKNOWN_REASON_LABELS: Record<FreightUnknownReason, string> = {
  destination_unresolved: "No delivery address on this order yet.",
  origin_country_unresolved: "The seller hasn't published a dispatch country.",
  consignment_not_measurable: "The seller hasn't published package size and weight.",
  no_active_rate_card: "No forwarder has published a rate for this lane.",
  leg_uncovered: "Part of this route has no published rate.",
  no_common_currency_across_legs:
    "The legs of this route are priced in different currencies, which Qatoto does not convert.",
  mode_not_selected: "Choose how this should travel.",
  mode_not_covered: "No forwarder publishes a rate for that mode on this lane.",
};

/** How specific the matched dwell estimate was. A weaker scope is a weaker claim, and says so. */
export const CUSTOMS_DWELL_SCOPE_LABELS: Record<
  Extract<CustomsComponent, { status: "known" }>["scope"],
  string
> = {
  origin_and_commodity: "for this origin and this kind of goods",
  origin_only: "for this origin, across all goods",
  commodity_only: "for this kind of goods, from any origin",
  any: "for this destination, across all origins and goods",
};
