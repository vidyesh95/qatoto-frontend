// TRANSPORT: mock — serves `@/mocks/store/chargeback-evidence-mocks`. There is no
// `GET /commerce/admin/orders/:orderId/chargeback-evidence` on the Express backend yet; the spec
// for it lives in the plan that shipped this file, not in this repo.
//
// THE GETTER IS STILL THE ONLY IMPORT SITE, matching `@/lib/blueprints/api.ts`'s precedent — the
// component below never reaches into the fixture directly, so wiring the real route later is an
// edit to this function's body, not a rewrite of the page.
//
// `RequestOptions` IS ACCEPTED AND UNUSED FOR NOW, deliberately kept in the signature so the call
// site in `src/hooks/store/chargeback-evidence.ts` does not change shape when this starts hitting
// the network — only this function's body does.

import type { ActionResponse, RequestOptions } from "@/lib/http";
import { buildMockChargebackEvidenceBundle } from "@/mocks/store/chargeback-evidence-mocks";
import {
  ChargebackEvidenceBundleSchema,
  type ChargebackEvidenceBundle,
} from "@/lib/store/chargeback-evidence.schemas";

/**
 * The full evidence bundle for one order: order detail, chat thread and shipment/tracking
 * history, aggregated behind one admin-only read.
 *
 * NOT A QUERY, AND WHEN THIS IS WIRED IT MUST STAY A MUTATION IN `useExportChargebackEvidence`.
 * The backend spec writes an audit entry to the buyer's stream on every call, mirroring
 * `getOrderDeliveryAddress` — so this must never be called on mount, on focus refetch, or
 * speculatively. It is triggered by an explicit "Load evidence" control that says what pressing
 * it does.
 */
export async function getChargebackEvidenceBundle(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ChargebackEvidenceBundle>> {
  void options;

  const parsed = ChargebackEvidenceBundleSchema.safeParse(
    buildMockChargebackEvidenceBundle(orderId),
  );
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "PARSE", message: "Mock evidence fixture failed its own contract." },
    };
  }

  return { success: true, data: parsed.data };
}
