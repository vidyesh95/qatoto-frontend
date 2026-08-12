// TRANSPORT: client-query — order-scoped, read and written from a client island.
//
// WIRED, AND THE TABLE BEHIND IT HAD NO WRITER AT ALL UNTIL PHASE 25. `commerce_settlement_attestation`
// has been in the schema since Phase 14 and nothing in the backend inserted into it — no route, no
// service, no seed. The `direct_offline` rail, which the settlement enum itself calls "The default",
// therefore recorded nothing whatsoever, and a seller trading by wire or letter of credit had no way
// to tell the platform they had been paid.

import { sendJson, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  SettlementAttestationListSchema,
  type RecordAttestationInput,
  type SettlementAttestationList,
} from "@/lib/store/attestations.schemas";

/**
 * Both parties' claims about one order — `GET /commerce/orders/:orderId/settlement-attestations`.
 *
 * Readable by either party and nobody else; a non-party gets the same 404 an unknown id gets.
 */
export function listSettlementAttestations(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SettlementAttestationList>> {
  return getJson(
    `/commerce/orders/${encodeURIComponent(orderId)}/settlement-attestations`,
    SettlementAttestationListSchema,
    options,
  );
}

/**
 * Records this party's claim that money moved — `POST /commerce/orders/:orderId/settlement-attestations`.
 *
 * **THIS IS AN ATTESTATION, NOT A PAYMENT.** Nothing is charged, nothing is transferred, and nothing
 * is posted to the ledger. The party is telling the platform about a wire that happened between two
 * banks it has no relationship with. Every surface that renders the result must say so — the
 * earnings read keeps it in a separate `selfReported` member for the same reason.
 *
 * REQUIRES AN `Idempotency-Key`, minted once per attempt in component state. Without it the
 * middleware answers **400** before the service is reached.
 *
 * **THE KIND IS NOT IN THE BODY, AND MUST NOT BE.** The server derives it from which side of the
 * order the caller is on: the buyer writes `payment_sent`, the seller `payment_received`. Currency
 * is read off the order for the same reason. Sending either is a `422` from a `.strict()` schema,
 * which is the correct answer to a client trying to state a value the server owns.
 *
 * TWO 409s, AND NEITHER IS A RETRY:
 *
 *   - `settlementRail` in `data` — the order settles through a processor or an escrow provider, so
 *     the money is observed and there is nothing to attest. Render the rail, not a retry button.
 *   - `attestationKind` in `data` — you already recorded this one. Recorded payments are never
 *     edited: overwriting the first claim would erase the version the counterparty may already have
 *     read and acted on. A correction belongs in the conversation.
 *
 * ANSWERS `201` WITH THE WHOLE LIST, including the counterparty's claim. Where the two disagree
 * about the amount, that disagreement is the most useful thing on the surface and is shown rather
 * than reconciled — the platform has no basis on which to decide which party is right.
 */
export function recordSettlementAttestation(
  orderId: string,
  input: RecordAttestationInput,
  options?: RequestOptions,
): Promise<ActionResponse<SettlementAttestationList>> {
  return sendJson(
    `/commerce/orders/${encodeURIComponent(orderId)}/settlement-attestations`,
    "POST",
    input,
    SettlementAttestationListSchema,
    options,
  );
}
