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
import { SHIPMENT_EVENT_KINDS } from "@/lib/store/fulfillment.schemas";
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
 * ⚠️ **`legs` IS DELIBERATELY ABSENT FROM THIS INPUT.** The route accepts one, but a leg is a state
 * machine of its own with optimistic-concurrency commands (`book`, `depart`, … each carrying an
 * `expectedVersion`), and a form that could create a leg it has no way to advance would leave a
 * booking nobody can move. Legs stay out until their command surface has a caller.
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
