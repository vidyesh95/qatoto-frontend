// TRANSPORT: client-query — `GET /commerce/admin/orders/:orderId/chargeback-evidence`, built in
// `qatoto-backend`'s `commerce-chargeback-evidence.service.ts` / `commerce-trust.routes.ts`.
//
// WAS `TRANSPORT: mock` — `@/mocks/store/chargeback-evidence-mocks` is deleted along with this
// comment's old self, matching `@/lib/blueprints/api.ts`'s precedent: the getter was the only
// import site, so wiring the real route was an edit to this function's body, not a rewrite of
// the page.

import { getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  ChargebackEvidenceBundleSchema,
  type ChargebackEvidenceBundle,
} from "@/lib/store/chargeback-evidence.schemas";

/**
 * The full evidence bundle for one order: order detail, chat thread and shipment/tracking
 * history, aggregated behind one admin-only read.
 *
 * NOT A QUERY — see `useExportChargebackEvidence` in `src/hooks/store/chargeback-evidence.ts`.
 * The backend writes a platform-wide audit entry on every call (the actor is staff, not an
 * order party, so it is NOT the buyer's own audit stream `getOrderDeliveryAddress` writes to) —
 * so this must never be called on mount, on focus refetch, or speculatively. It is triggered by
 * an explicit "Load evidence" control that says what pressing it does.
 */
export async function getChargebackEvidenceBundle(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ChargebackEvidenceBundle>> {
  const path = `/commerce/admin/orders/${encodeURIComponent(orderId)}/chargeback-evidence`;
  return getJson(path, ChargebackEvidenceBundleSchema, options);
}
