// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the (not yet built) `GET /commerce/admin/orders/:orderId/chargeback-evidence`.
// See `chargeback-evidence.api.ts` for the mock this currently parses instead.
//
// NOTHING HERE IS REDECLARED. `order`, `messages` and `shipments` reuse the exact schemas the
// party-scoped reads already validate against (`OrderDetailSchema`, `ThreadMessageSchema`,
// `ShipmentDetailSchema`) — this bundle is those three projections aggregated behind one
// admin-only, audited route, not a fourth shape for the same data to drift against.
//
// THIS IS A CARD-NETWORK CHARGEBACK RESPONSE, NOT QATOTO'S OWN DISPUTE. `disputes.schemas.ts`
// (`DisputeDetailSchema`) is buyer-opened and Qatoto-decided; a chargeback is decided by the
// buyer's card issuer, off this platform entirely. This bundle is evidence an admin hands the
// issuer manually — nothing here submits anywhere automatically.

import { z } from "zod";

import { ShipmentDetailSchema } from "@/lib/store/shipments.schemas";
import { OrderDetailSchema } from "@/lib/store/orders.schemas";
import { ThreadMessageSchema } from "@/lib/store/messages.schemas";
import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * Everything an admin needs to answer one card chargeback on one order.
 *
 * `exportAuditId` IS THE SERVER'S RECEIPT FOR THIS CALL, not a client-generated value — the
 * backend spec writes an audit entry on every read of this route (mirroring
 * `getOrderDeliveryAddress`) and echoes its id back so the UI can show "logged: exported by
 * &lt;staff email&gt; at &lt;time&gt;" without a second write.
 */
export const ChargebackEvidenceBundleSchema = z
  .object({
    order: OrderDetailSchema,
    messages: z.array(ThreadMessageSchema),
    shipments: z.array(ShipmentDetailSchema),
    generatedAt: IsoDateTimeSchema,
    exportedByStaffEmail: z.string(),
    exportAuditId: z.string(),
  })
  .strip();

export type ChargebackEvidenceBundle = z.infer<typeof ChargebackEvidenceBundleSchema>;
