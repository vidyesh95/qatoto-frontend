// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `GET /commerce/provider/shipments` and `GET /commerce/shipments` (A29, A38).
//
// Transcribed from `commerce-fulfillment.service.ts` — `ShipmentQueueRowProjection` (:157).

import { z } from "zod";

// The event enum is IMPORTED rather than re-declared. `SHIPMENT_STATES` above is already a second
// copy of `fulfillment.schemas.ts`'s tuple — a pre-existing duplication this file does not widen.
// Two tuples for one pgEnum drift, and the drift is silent: an appended value simply stops parsing
// on whichever copy was forgotten.
import {
  SHIPMENT_EVENT_KINDS,
  SHIPMENT_LEG_EVENT_KINDS,
  ShipmentLegSchema,
  type ShipmentLegState,
} from "@/lib/store/fulfillment.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

export const SHIPMENT_STATES = ["planned", "in_transit", "delivered", "cancelled"] as const;

export type ShipmentState = (typeof SHIPMENT_STATES)[number];

/**
 * One row of the cross-order shipment queue.
 *
 * `estimatedArrivalAt` IS `max()` ACROSS THE LEGS, AND NULL IS A REAL ANSWER. `commerce_shipment`
 * carries no ETA of its own — it lives on the leg — so a shipment whose legs carry none has no
 * date. Never substitute one. A16's rule that an uncovered lane returns nothing rather than a zero
 * applies to a date exactly as it does to a price, and a fabricated ETA on a logistics queue is a
 * promise somebody schedules a truck against.
 *
 * The lane fields are nullable for the same reason: a shipment created before its origin was known
 * has no origin, and "—" is the honest render.
 */
export const ShipmentQueueRowSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    buyerOrganizationId: z.string(),
    state: z.enum(SHIPMENT_STATES),
    originCountryCode: z.string().nullable(),
    originLocality: z.string().nullable(),
    destinationCountryCode: z.string().nullable(),
    destinationLocality: z.string().nullable(),
    packageCount: z.number().int(),
    totalWeightGrams: z.number().int().nullable(),
    estimatedArrivalAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export const ShipmentQueuePageSchema = cursorPageOf(ShipmentQueueRowSchema);

export type ShipmentQueueRow = z.infer<typeof ShipmentQueueRowSchema>;
export type ShipmentQueuePage = z.infer<typeof ShipmentQueuePageSchema>;

/**
 * `GET /commerce/provider/shipments` and `GET /commerce/shipments`.
 *
 * THE ETA WINDOW FILTERS THROUGH THE LEGS, which is where an ETA is recorded — the backend uses an
 * `EXISTS` so a shipment with three legs inside the window is still one row. Both bounds are ISO
 * instants.
 */
export interface ListShipmentsFilter {
  readonly state?: ShipmentState;
  readonly estimatedArrivalFrom?: string;
  readonly estimatedArrivalTo?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export const SHIPMENT_STATE_LABELS: Readonly<Record<ShipmentState, string>> = {
  planned: "Planned",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// --- Writes ------------------------------------------------------------------
//
// `POST /commerce/orders/:orderId/shipments` and `POST /commerce/shipments/:shipmentId/events`.
// Both answer **201** with the whole shipment, so a caller never has to re-read to see what it did.

/**
 * The five kinds a client may APPEND. `created` is on the read enum and not here: the backend
 * writes it itself when the shipment is created, and a client that could append one would be able
 * to claim a second creation of the same shipment.
 */
export const APPENDABLE_SHIPMENT_EVENT_KINDS = [
  "picked_up",
  "in_transit",
  "delivered",
  "exception",
  "cancelled",
] as const;
export type AppendableShipmentEventKind = (typeof APPENDABLE_SHIPMENT_EVENT_KINDS)[number];

export const ShipmentProductLineSchema = z
  .object({
    id: z.string(),
    orderProductLineId: z.string(),
    quantity: z.number().int(),
  })
  .strip();

export const ShipmentEventSchema = z
  .object({
    id: z.string(),
    eventKind: z.enum(SHIPMENT_EVENT_KINDS),
    occurredAt: IsoDateTimeSchema,
    description: z.string().nullable(),
  })
  .strip();

/**
 * One shipment as both writes answer it.
 *
 * ⚠️ **NOT `ShipmentQueueRow` AND NOT `FulfillmentShipment`.** The queue row is a cross-order
 * summary and the fulfillment one carries `legs` and a `version`; this is the write's own
 * projection, with the lines and the event history. Three projections of one table, and parsing a
 * response with the wrong one is a `PARSE` result that reads like a refused write.
 */
export const WrittenShipmentSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    state: z.enum(SHIPMENT_STATES),
    originCountryCode: z.string().nullable(),
    originLocality: z.string().nullable(),
    destinationCountryCode: z.string().nullable(),
    destinationLocality: z.string().nullable(),
    packageCount: z.number().int(),
    totalWeightGrams: z.number().int().nullable(),
    createdAt: IsoDateTimeSchema,
    productLines: z.array(ShipmentProductLineSchema),
    events: z.array(ShipmentEventSchema),
  })
  .strip();
export type WrittenShipment = z.infer<typeof WrittenShipmentSchema>;

/**
 * `POST …/shipments` — which order lines are in the box, and where it is going.
 *
 * ⚠️ **`legs` IS ACCEPTED NOW, AND THE CONDITION FOR THAT WAS EXPLICIT.** This comment used to
 * refuse them: "a form that could create a leg it has no way to advance would leave a booking
 * nobody can move. Legs stay out until their command surface has a caller." That surface has a
 * caller — `executeShipmentLegCommand` — so the refusal expired rather than being overruled.
 *
 * ⚠️ **THIS IS THE ONLY PLACE A LEG CAN BE CREATED, AND THE ONLY PLACE `logisticsEngagementId` CAN
 * BE SET.** No route attaches an engagement to an existing leg or adds a leg to an existing
 * shipment, so a seller who books a forwarder after creating the shipment cannot record it. Say so
 * at the form rather than letting them find out.
 *
 * The lane fields are all optional because a shipment created before its origin is known has none,
 * and an invented one is a lane somebody schedules a truck against.
 */
export interface CreateShipmentInput {
  readonly lines: readonly { readonly orderProductLineId: string; readonly quantity: number }[];
  readonly originCountryCode?: string;
  readonly originLocality?: string;
  readonly destinationCountryCode?: string;
  readonly destinationLocality?: string;
  readonly packageCount: number;
  readonly totalWeightGrams?: number;
  readonly legs?: readonly ShipmentLegInput[];
}

/**
 * One leg on shipment creation.
 *
 * `mode` IS THE FOUR-MEMBER LEG TUPLE, not `FREIGHT_MODES`' five — a leg can never be
 * `multimodal`; that is what a sequence of legs IS. The two country codes are REQUIRED here even
 * though they are nullable on the way back, because a leg with no route is not a leg.
 */
export interface ShipmentLegInput {
  readonly sequence: number;
  readonly mode: "air" | "sea" | "land" | "rail";
  readonly originCountryCode: string;
  readonly originLocality?: string;
  readonly originLocationIdentifier?: string;
  readonly destinationCountryCode: string;
  readonly destinationLocality?: string;
  readonly destinationLocationIdentifier?: string;
  readonly logisticsEngagementId?: string;
  readonly estimatedDepartureAt?: string;
  readonly estimatedArrivalAt?: string;
}

/** `POST …/events` — `occurredAt` omitted means now, which is the common case. */
export interface AppendShipmentEventInput {
  readonly eventKind: AppendableShipmentEventKind;
  readonly occurredAt?: string;
  readonly description?: string;
}

export const APPENDABLE_SHIPMENT_EVENT_KIND_LABELS: Record<AppendableShipmentEventKind, string> = {
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  exception: "Something went wrong",
  cancelled: "Cancelled",
};

// --- Shipment detail, legs and leg commands (Phase 26) -----------------------
//
// THE THREE ROUTES THAT WERE BUILT AND NEVER CALLED. `GET /commerce/shipments/:shipmentId`,
// `POST /commerce/shipment-legs/:legId/commands` and `GET /commerce/shipment-legs/:legId/events`
// all shipped with the backend's Phase 6 fulfilment service and had no frontend wrapper at all, so
// a leg could be created by a seed and then never moved by anybody.
//
// THIS IS WHAT UNBLOCKS `legs` ON SHIPMENT CREATION. `CreateShipmentInput` above carried a comment
// refusing to send legs because "a form that could create a leg it has no way to advance would
// leave a booking nobody can move". That condition is met by the command surface below, so the
// input now accepts them.

/**
 * One shipment in full — `GET /commerce/shipments/:shipmentId`.
 *
 * The write projection plus the two fields only the read carries: `version`, and the `legs` that
 * are the whole point of opening a shipment rather than reading its queue row.
 */
export const ShipmentDetailSchema = WrittenShipmentSchema.extend({
  version: z.number().int(),
  legs: z.array(ShipmentLegSchema),
}).strip();
export type ShipmentDetail = z.infer<typeof ShipmentDetailSchema>;

/**
 * The five commands a leg accepts, mirroring `ShipmentLegCommandSchema` in
 * `commerce-fulfillment.schemas.ts`.
 *
 * ⚠️ **`expectedVersion` IS ECHOED FROM THE LEG, NEVER INVENTED.** Leg commands execute through an
 * outbox and a stale version is refused with a 409 carrying the current one. That refusal is a
 * FINDING — somebody else moved the leg — and never something to retry with a bumped number.
 *
 * ⚠️ **THE BACKEND ARMS ARE `.strict()`.** An extra key is a 422 that kills the whole write, not a
 * field the server ignores. Send only what the arm names.
 */
export const ShipmentLegCommandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("book"),
    expectedVersion: z.number().int().min(0),
    carrierReference: z.string().optional(),
    trackingReference: z.string().optional(),
    note: z.string().optional(),
  }),
  z.object({
    command: z.literal("depart"),
    expectedVersion: z.number().int().min(0),
    departedAt: z.string().optional(),
    locationIdentifier: z.string().optional(),
    note: z.string().optional(),
  }),
  z.object({
    command: z.literal("arrive"),
    expectedVersion: z.number().int().min(0),
    arrivedAt: z.string().optional(),
    locationIdentifier: z.string().optional(),
    note: z.string().optional(),
  }),
  z.object({
    command: z.literal("complete"),
    expectedVersion: z.number().int().min(0),
    note: z.string().optional(),
  }),
  z.object({
    command: z.literal("report_exception"),
    expectedVersion: z.number().int().min(0),
    description: z.string(),
    locationIdentifier: z.string().optional(),
  }),
  z.object({
    command: z.literal("cancel"),
    expectedVersion: z.number().int().min(0),
    note: z.string().optional(),
  }),
]);
export type ShipmentLegCommand = z.infer<typeof ShipmentLegCommandSchema>;
export type ShipmentLegCommandName = ShipmentLegCommand["command"];

/**
 * Which command a leg in each state accepts, and it is NOT a client-side guard.
 *
 * The backend's state machine is the authority and refuses anything else with a 409; this map
 * exists so the UI does not OFFER a button that can only fail. `cancelled` and `completed` are
 * terminal and appear here with an empty list rather than being absent, so a new leg state becomes
 * a type error instead of a silently button-less row.
 *
 * ⚠️ **THIS SHIPPED WRONG ONCE AND THE FAILURE MODE IS WORTH NAMING.** It was transcribed with FIVE
 * commands while `LEG_TRANSITIONS` in the backend has SIX — `cancel` was missing from every state,
 * so a seller could reach a leg they were entitled to cancel and be offered no way to do it. It
 * cost nothing at runtime and nothing in the type system, because a map that under-offers is
 * indistinguishable from a correct one: only reading the backend table beside it finds the gap.
 * Re-read `LEG_TRANSITIONS` when touching this, never the previous version of this map.
 */
export const SHIPMENT_LEG_COMMANDS_BY_STATE: Record<
  ShipmentLegState,
  readonly ShipmentLegCommandName[]
> = {
  planned: ["book", "report_exception", "cancel"],
  booked: ["depart", "report_exception", "cancel"],
  in_transit: ["arrive", "report_exception", "cancel"],
  arrived: ["complete", "report_exception", "cancel"],
  completed: [],
  cancelled: [],
};

export const SHIPMENT_LEG_COMMAND_LABELS: Record<ShipmentLegCommandName, string> = {
  book: "Book",
  depart: "Mark departed",
  arrive: "Mark arrived",
  complete: "Complete",
  report_exception: "Report a problem",
  cancel: "Cancel this leg",
};

/**
 * `POST /commerce/shipments/:shipmentId/legs` — A43.
 *
 * `.min(1)` mirrors the backend: an empty array answers 201 having done nothing, which reads as
 * success to a client that sent a broken body.
 */
/** What `POST …/legs` answers: the shipment it touched, and the legs it created. */
export const ShipmentLegsAddedSchema = z
  .object({
    shipmentId: z.string(),
    legs: z.array(ShipmentLegSchema),
  })
  .strip();
export type ShipmentLegsAdded = z.infer<typeof ShipmentLegsAddedSchema>;

export interface AddShipmentLegsInput {
  readonly legs: readonly ShipmentLegInput[];
}

/**
 * `POST /commerce/shipment-legs/:legId/assignment` — who is carrying this leg.
 *
 * ⚠️ **`null` IS A DETACH AND MUST BE SENT EXPLICITLY.** The backend schema is `.strict()` and the
 * field is `.nullable()` rather than optional precisely so attach and detach are different
 * requests rather than one of them being an omission.
 *
 * ⚠️ **ATTACHING TRANSFERS CONTROL.** Once a leg carries an engagement, `book`/`depart`/`arrive`/
 * `complete` are executable by the PROVIDER organization, not the seller. Detach is how it comes
 * back, and the backend refuses assignment once the leg is past `booked`.
 */
export interface ShipmentLegAssignmentInput {
  readonly expectedVersion: number;
  readonly logisticsEngagementId: string | null;
}

/** One entry in a leg's history — `GET /commerce/shipment-legs/:legId/events`. */
export const ShipmentLegEventSchema = z
  .object({
    id: z.string(),
    sequence: z.number().int(),
    eventKind: z.enum(SHIPMENT_LEG_EVENT_KINDS),
    occurredAt: IsoDateTimeSchema,
    description: z.string().nullable(),
    carrierReference: z.string().nullable(),
    trackingReference: z.string().nullable(),
    locationIdentifier: z.string().nullable(),
    evidenceDocumentId: z.string().nullable(),
  })
  .strip();
export type ShipmentLegEvent = z.infer<typeof ShipmentLegEventSchema>;

export const ShipmentLegEventListSchema = z
  .object({ items: z.array(ShipmentLegEventSchema) })
  .strip();
export type ShipmentLegEventList = z.infer<typeof ShipmentLegEventListSchema>;
