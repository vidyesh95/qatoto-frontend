// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `GET /commerce/provider/shipments` and `GET /commerce/shipments` (A29, A38).
//
// Transcribed from `commerce-fulfillment.service.ts` — `ShipmentQueueRowProjection` (:157).

import { z } from "zod";

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
