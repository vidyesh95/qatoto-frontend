// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for fulfillment: `GET /commerce/orders/:orderId/fulfillment`,
// `GET /commerce/service-engagements`, `GET /commerce/service-engagements/:engagementId` and
// `POST /commerce/service-engagements/:engagementId/transitions`.
//
// THE FULFILLMENT READ IS TYPED `Result<unknown, …>` ON THE SERVER. `getOrderFulfillment` in
// `commerce-fulfillment-phase6.service.ts` builds a real object and declares its return as `unknown`,
// so there is NO server-side projection type to check it against. Which makes the schema below the
// only contract that exists for that payload — and the argument for parsing at the boundary rather
// than trusting it, which was already the rule, stops being theoretical here.
//
// Transcribed from what the service actually constructs, plus `ServiceEngagementProjection` (:—) in
// `commerce-fulfillment.service.ts`, which IS typed.
//
// THE RULE THAT GOVERNS THIS WHOLE SURFACE: COMPLETION OF ONE THING NEVER MARKS ANOTHER COMPLETE.
// Customs, insurance, inspection, lab, warehouse, marketing and FX each have their own state machine.
// `overallState` is a DERIVED coordinator's view for display; it is not a state anything transitions
// to, and no client may infer one connector's progress from another's.

import { z } from "zod";

import { FreightModeSchema } from "@/lib/store/freight.schemas";

import { ORDER_STATES } from "@/lib/store/cart.schemas";
import { cursorPageOf, IsoDateTimeSchema, PROVIDER_KINDS } from "@/lib/store/shared.schemas";

// --- Enums ------------------------------------------------------------------

export const SHIPMENT_STATES = ["planned", "in_transit", "delivered", "cancelled"] as const;

export type ShipmentState = (typeof SHIPMENT_STATES)[number];

export const SHIPMENT_EVENT_KINDS = [
  "created",
  "picked_up",
  "in_transit",
  "delivered",
  "exception",
  "cancelled",
] as const;

export type ShipmentEventKind = (typeof SHIPMENT_EVENT_KINDS)[number];

/**
 * A LEG'S OWN STATE MACHINE, WHICH IS NOT THE SHIPMENT'S. `commerce_shipment_leg_state` has six
 * members against `commerce_shipment_state`'s four, and only `planned` and `cancelled` are spelled
 * the same in both. A leg reaches `completed`; a shipment reaches `delivered`.
 *
 * `state` on `ShipmentLegSchema` below was `z.string()` — it parsed anything, so a typo in a
 * `state === "booked"` comparison would have been silently false rather than a type error. The
 * command surface branches on this value, so the loose type stopped being acceptable.
 */
export const SHIPMENT_LEG_STATES = [
  "planned",
  "booked",
  "in_transit",
  "arrived",
  "completed",
  "cancelled",
] as const;

export type ShipmentLegState = (typeof SHIPMENT_LEG_STATES)[number];

export const SHIPMENT_LEG_STATE_LABELS: Record<ShipmentLegState, string> = {
  planned: "Planned",
  booked: "Booked",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * `commerce_shipment_leg_event_kind` — SEVEN members, and note `departed`, which the shipment event
 * enum has no equivalent of. A leg's history is finer-grained than its parent's by design.
 */
export const SHIPMENT_LEG_EVENT_KINDS = [
  "created",
  "booked",
  "departed",
  "arrived",
  "completed",
  "exception",
  "cancelled",
] as const;

export type ShipmentLegEventKind = (typeof SHIPMENT_LEG_EVENT_KINDS)[number];

export const SHIPMENT_LEG_EVENT_KIND_LABELS: Record<ShipmentLegEventKind, string> = {
  created: "Created",
  booked: "Booked",
  departed: "Departed",
  arrived: "Arrived",
  completed: "Completed",
  exception: "Problem reported",
  cancelled: "Cancelled",
};

export const SERVICE_ENGAGEMENT_STATES = [
  "awaiting_provider",
  "scheduled",
  "in_progress",
  "awaiting_buyer",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type ServiceEngagementState = (typeof SERVICE_ENGAGEMENT_STATES)[number];

/**
 * The coordinator's DERIVED view of an order's fulfillment.
 *
 * `attention_required` is the one that matters most and the one a naive UI drops: it means something
 * needs a human, not that something failed. `awaiting_buyer` means the ball is with the reader if they
 * are the buyer — which is why the page has to know who is reading.
 */
export const FULFILLMENT_OVERALL_STATES = [
  "not_started",
  "in_progress",
  "awaiting_buyer",
  "attention_required",
  "completed",
  "cancelled",
] as const;

export type FulfillmentOverallState = (typeof FULFILLMENT_OVERALL_STATES)[number];

// --- Shipment legs ----------------------------------------------------------

/**
 * One leg of a shipment.
 *
 * `estimated*` and `actual*` are FOUR SEPARATE FIELDS and never fall back to one another. An estimated
 * arrival is a plan; an actual arrival is a fact; rendering the estimate where the actual is missing
 * would tell a buyer their goods arrived when nobody has said so.
 *
 * `version` is an optimistic-concurrency token. It exists because leg commands are executed through an
 * outbox and a stale version is refused — so it must be echoed back on a command, never invented.
 */
export const ShipmentLegSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  sequence: z.number().int(),
  /**
   * FOUR MEMBERS, NOT FIVE.
   *
   * The column is `commerce_shipment_leg_mode` — `air | sea | land | rail`. This parsed with
   * `FREIGHT_TRANSPORT_MODES`, which is `freight_transport_mode`'s FIVE and includes
   * `multimodal`; a leg can never carry that, so the schema admitted a value the database
   * forbids.
   *
   * Harmless in practice — `multimodal` simply never arrives — and fixed anyway, because a second
   * vocabulary that disagrees with the database is the exact class of bug the wire-casing rule
   * exists to prevent. `FREIGHT_MODES` is already the correct tuple and `admin-freight` will want
   * the same one.
   */
  mode: FreightModeSchema,
  state: z.enum(SHIPMENT_LEG_STATES),
  version: z.number().int(),
  originCountryCode: z.string().nullable(),
  originLocality: z.string().nullable(),
  originLocationIdentifier: z.string().nullable(),
  destinationCountryCode: z.string().nullable(),
  destinationLocality: z.string().nullable(),
  destinationLocationIdentifier: z.string().nullable(),
  // Present when a freight or logistics engagement is carrying this leg. Null means the seller is
  // moving it themselves, NOT that it is unassigned.
  logisticsEngagementId: z.string().nullable(),
  carrierReference: z.string().nullable(),
  trackingReference: z.string().nullable(),
  estimatedDepartureAt: IsoDateTimeSchema.nullable(),
  estimatedArrivalAt: IsoDateTimeSchema.nullable(),
  actualDepartureAt: IsoDateTimeSchema.nullable(),
  actualArrivalAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const FulfillmentShipmentSchema = z.object({
  id: z.string(),
  state: z.enum(SHIPMENT_STATES),
  version: z.number().int(),
  legs: z.array(ShipmentLegSchema),
});

// --- Engagements ------------------------------------------------------------

export const ServiceEngagementSchema = z.object({
  id: z.string(),
  buyerOrganizationId: z.string(),
  providerOrganizationId: z.string(),
  orderId: z.string(),
  orderServiceLineId: z.string(),
  providerKind: z.enum(PROVIDER_KINDS),
  state: z.enum(SERVICE_ENGAGEMENT_STATES),
  titleSnapshot: z.string(),
  scopeSnapshot: z.string(),
  /**
   * FOUR LIFECYCLE INSTANTS, each null until it happens. They are not a progress bar: an engagement
   * may be `cancelled` with a `startedAt` set, and reading "started" as "in progress" would misreport
   * that. Read `state` for what is true now and these for when it changed.
   */
  scheduledAt: IsoDateTimeSchema.nullable(),
  startedAt: IsoDateTimeSchema.nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
  cancelledAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ServiceEngagementListPageSchema = cursorPageOf(ServiceEngagementSchema);

// --- Engagement detail: deliverables ----------------------------------------

/** `commerce_engagement_deliverable_state`, verbatim. */
export const DELIVERABLE_STATES = [
  "planned",
  "submitted",
  "accepted",
  "waived",
  "cancelled",
] as const;

export type DeliverableState = (typeof DELIVERABLE_STATES)[number];

export const DELIVERABLE_STATE_LABELS: Record<DeliverableState, string> = {
  planned: "Not submitted yet",
  submitted: "Submitted, awaiting the buyer",
  accepted: "Accepted by the buyer",
  waived: "Waived",
  cancelled: "Cancelled",
};

/**
 * One deliverable as `GET /commerce/service-engagements/:engagementId` projects it.
 *
 * `result` IS PARSED SECOND, AGAINST THE ENGAGEMENT'S KIND. The server switches on the provider
 * kind to build it, so its shape is only knowable once the kind is — see `parseDeliverableResult`.
 * Parsing it here as a union of nine shapes would accept a laboratory result on an insurance
 * engagement, which is the guess this file refuses to make.
 */
export const EngagementDeliverableSchema = z.object({
  id: z.string(),
  sequence: z.number().int(),
  title: z.string(),
  isRequired: z.boolean(),
  state: z.enum(DELIVERABLE_STATES),
  dueAt: IsoDateTimeSchema.nullable(),
  submittedAt: IsoDateTimeSchema.nullable(),
  reviewedAt: IsoDateTimeSchema.nullable(),
  evidenceDocumentId: z.string().nullable(),
  reviewNote: z.string().nullable(),
  result: z.unknown(),
});

export const ServiceEngagementDetailSchema = ServiceEngagementSchema.extend({
  deliverables: z.array(EngagementDeliverableSchema),
});

/**
 * MINOR UNITS ARRIVE AS STRINGS — the columns are bigint-as-text, so a value past 2^53 survives the
 * wire. Kept as a string here; `formatMinorUnitsLabel` decides whether it is safe to format.
 */
const MinorUnitsSchema = z.string().regex(/^-?\d+$/);

export const InsuranceDeliverableResultSchema = z.object({
  policyReference: z.string(),
  coverageClass: z.string(),
  insuredValueMinorUnits: MinorUnitsSchema.nullable(),
  coverageLimitMinorUnits: MinorUnitsSchema.nullable(),
  currency: z.string().nullable(),
  effectiveFrom: IsoDateTimeSchema.nullable(),
  effectiveTo: IsoDateTimeSchema.nullable(),
});

/** The laboratory's own result. Rendered attributed to the laboratory, never as Qatoto's. */
export const TESTING_RESULTS = ["passed", "failed", "inconclusive"] as const;

export const TestingDeliverableResultSchema = z.object({
  standard: z.string(),
  specimenReference: z.string().nullable(),
  result: z.enum(TESTING_RESULTS),
  laboratoryLocation: z.string().nullable(),
  reportedAt: IsoDateTimeSchema.nullable(),
});

export const WAREHOUSE_MOVEMENT_KINDS = [
  "receipt",
  "putaway",
  "pick",
  "release",
  "adjustment",
] as const;

export const WAREHOUSE_MOVEMENT_KIND_LABELS: Record<
  (typeof WAREHOUSE_MOVEMENT_KINDS)[number],
  string
> = {
  receipt: "Received into the warehouse",
  putaway: "Put away",
  pick: "Picked",
  release: "Released",
  adjustment: "Stock adjustment",
};

export const WarehouseDeliverableResultSchema = z.object({
  movementKind: z.enum(WAREHOUSE_MOVEMENT_KINDS),
  /** A fixed-point quantity: `quantityUnits / 10^quantityScale`. Never a float on the wire. */
  quantityUnits: MinorUnitsSchema,
  quantityScale: z.number().int().nonnegative(),
  unitLabel: z.string(),
  facilityIdentifier: z.string().nullable(),
  occurredAt: IsoDateTimeSchema.nullable(),
});

export type InsuranceDeliverableResult = z.infer<typeof InsuranceDeliverableResultSchema>;
export type TestingDeliverableResult = z.infer<typeof TestingDeliverableResultSchema>;
export type WarehouseDeliverableResult = z.infer<typeof WarehouseDeliverableResultSchema>;

/**
 * The deliverable's result, typed by the engagement's kind.
 *
 * ONLY THE THREE KINDS THIS SURFACE RENDERS ARE PARSED. Every other kind, a null result and a result
 * that fails its schema all come back as `none` — the row still shows its title and state, and no
 * field is invented for a shape this file has not transcribed.
 */
export type ParsedDeliverableResult =
  | { readonly kind: "insurance"; readonly value: InsuranceDeliverableResult }
  | { readonly kind: "testing"; readonly value: TestingDeliverableResult }
  | { readonly kind: "warehouse"; readonly value: WarehouseDeliverableResult }
  | { readonly kind: "none" };

export function parseDeliverableResult(
  providerKind: (typeof PROVIDER_KINDS)[number],
  result: unknown,
): ParsedDeliverableResult {
  if (result === null || result === undefined) return { kind: "none" };
  switch (providerKind) {
    case "insurance_provider": {
      const parsed = InsuranceDeliverableResultSchema.safeParse(result);
      return parsed.success ? { kind: "insurance", value: parsed.data } : { kind: "none" };
    }
    case "testing_certification_lab": {
      const parsed = TestingDeliverableResultSchema.safeParse(result);
      return parsed.success ? { kind: "testing", value: parsed.data } : { kind: "none" };
    }
    case "warehouse_provider": {
      const parsed = WarehouseDeliverableResultSchema.safeParse(result);
      return parsed.success ? { kind: "warehouse", value: parsed.data } : { kind: "none" };
    }
    default:
      return { kind: "none" };
  }
}

// --- Services arranged for a goods order ------------------------------------

/**
 * `GET /commerce/orders/:orderId/linked-service-engagements`.
 *
 * Engagements on SERVICE orders whose `relatedOrderId` is this goods order, and only those the
 * CALLER bought — a buyer's insurer is not shown to the seller, nor the reverse. `serviceOrderId`
 * is named for what it is: the engagement's own order is never the goods order.
 */
export const LinkedServiceEngagementSchema = ServiceEngagementSchema.extend({
  serviceOrderId: z.string(),
});

export const LinkedServiceEngagementListSchema = z.object({
  orderId: z.string(),
  items: z.array(LinkedServiceEngagementSchema),
});

/**
 * The engagement as the fulfillment read projects it — the same row plus execution-contract fields.
 *
 * `executionContractState: "legacy_missing_snapshot"` is a real value and it means the engagement
 * predates typed snapshots, so its deliverables cannot be read back. That is an ATTENTION item, not an
 * error, and the fulfillment read surfaces it as one.
 */
export const FulfillmentEngagementSchema = ServiceEngagementSchema.extend({
  executionContractState: z.string(),
  executionContractProvenance: z.string().nullable(),
  requiresDeliverableNormalization: z.boolean(),
  version: z.number().int(),
});

// --- The fulfillment read ---------------------------------------------------

/**
 * Something that needs a human.
 *
 * A closed set on the server today, parsed loosely on purpose: `kind` is a plain string so a new
 * attention kind added backend-side surfaces as an unlabelled item rather than failing the page. An
 * attention item nobody rendered is the failure this exists to prevent, and a hard enum would trade
 * that for a blank screen.
 */
export const FulfillmentAttentionItemSchema = z.object({
  kind: z.string(),
  engagementId: z.string(),
});

export const OrderFulfillmentSchema = z.object({
  orderId: z.string(),
  orderState: z.enum(ORDER_STATES),
  overallState: z.enum(FULFILLMENT_OVERALL_STATES),
  /**
   * DERIVED progress in units, plus basis points.
   *
   * `basisPoints` is out of 10,000 — not a percentage, and not a fraction. Dividing it by 100 gives
   * a percent; treating it as one directly would show 4,200% complete.
   */
  progress: z.object({
    completedUnits: z.number().int(),
    totalUnits: z.number().int(),
    basisPoints: z.number().int(),
  }),
  shipments: z.array(FulfillmentShipmentSchema),
  engagements: z.array(FulfillmentEngagementSchema),
  attentionItems: z.array(FulfillmentAttentionItemSchema),
  computedAt: IsoDateTimeSchema,
});

// --- Filter and command inputs ----------------------------------------------

export interface ListServiceEngagementsFilter {
  readonly state?: ServiceEngagementState;
  /**
   * WHICH SIDE OF THE ENGAGEMENT TO LIST — the caller's own role, not a filter on the rows.
   *
   * Omitted means both sides, which is what an organization that buys and provides wants. It was
   * missing here entirely, so the two studio queues could not be told apart.
   */
  readonly role?: "buyer" | "provider";
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /commerce/service-engagements/:engagementId/transitions`.
 *
 * WHICH SIDE MAY MOVE AN ENGAGEMENT DEPENDS ON THE TARGET, and the server decides. `scheduled`,
 * `in_progress` and `awaiting_buyer` are the provider's to set; `completed` is the buyer accepting the
 * deliverable. Offering the wrong one is a 403 the buyer did not need to see, which is why the client
 * derives the offer from its relation to the engagement.
 */
export type ServiceEngagementTransitionTarget =
  | "scheduled"
  | "in_progress"
  | "awaiting_buyer"
  | "completed"
  | "cancelled";

export interface TransitionServiceEngagementInput {
  /**
   * `targetState`, NOT `target`.
   *
   * The body is `.strict()`, so the old spelling was refused twice over — once for the
   * unrecognized key and once for the missing required one — and the transition never happened.
   * The enum members themselves were always right; only the key was wrong.
   */
  readonly targetState: ServiceEngagementTransitionTarget;
  /** Optional, and it lands on the engagement's event trail rather than being discarded. */
  readonly note?: string;
}

export type ShipmentLeg = z.infer<typeof ShipmentLegSchema>;
export type FulfillmentShipment = z.infer<typeof FulfillmentShipmentSchema>;
export type ServiceEngagement = z.infer<typeof ServiceEngagementSchema>;
export type ServiceEngagementListPage = z.infer<typeof ServiceEngagementListPageSchema>;
export type EngagementDeliverable = z.infer<typeof EngagementDeliverableSchema>;
export type ServiceEngagementDetail = z.infer<typeof ServiceEngagementDetailSchema>;
export type LinkedServiceEngagement = z.infer<typeof LinkedServiceEngagementSchema>;
export type LinkedServiceEngagementList = z.infer<typeof LinkedServiceEngagementListSchema>;
export type FulfillmentEngagement = z.infer<typeof FulfillmentEngagementSchema>;
export type OrderFulfillment = z.infer<typeof OrderFulfillmentSchema>;
export type FulfillmentAttentionItem = z.infer<typeof FulfillmentAttentionItemSchema>;

// --- Display maps -----------------------------------------------------------

export const SHIPMENT_STATE_LABELS: Record<ShipmentState, string> = {
  planned: "Planned",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const SHIPMENT_EVENT_KIND_LABELS: Record<ShipmentEventKind, string> = {
  created: "Shipment created",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  exception: "Exception raised",
  cancelled: "Cancelled",
};

export const SERVICE_ENGAGEMENT_STATE_LABELS: Record<ServiceEngagementState, string> = {
  awaiting_provider: "Waiting on the provider",
  scheduled: "Scheduled",
  in_progress: "In progress",
  // Named from the BUYER's side because that is who has to act. A provider reading it needs to know
  // they are blocked, which "Waiting on the buyer" says and "Awaiting acceptance" does not.
  awaiting_buyer: "Waiting on the buyer",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "In dispute",
};

export const FULFILLMENT_OVERALL_STATE_LABELS: Record<FulfillmentOverallState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_buyer: "Waiting on the buyer",
  attention_required: "Needs attention",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Attention kinds this client knows how to explain. An unknown one still renders, unlabelled. */
const ATTENTION_KIND_LABELS: Record<string, string> = {
  engagement_awaiting_buyer: "A provider is waiting on the buyer to accept their work.",
  legacy_missing_snapshot:
    "This engagement predates typed deliverables, so its results cannot be read back here.",
};

export function attentionItemLabel(kind: string): string {
  return ATTENTION_KIND_LABELS[kind] ?? "This engagement needs a human to look at it.";
}

/**
 * Basis points as a percentage string.
 *
 * Out of 10,000, so the divisor is 100. Named to make the unit impossible to misread at the call
 * site — `progress.basisPoints` rendered directly would say 4,200%.
 */
export function formatBasisPointsLabel(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(0)}%`;
}
