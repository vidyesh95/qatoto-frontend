// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the settlement-attestation pair on an order (Phase 25):
//   GET  /commerce/orders/:orderId/settlement-attestations
//   POST /commerce/orders/:orderId/settlement-attestations
//
// BOTH VERBS ANSWER THE SAME SHAPE — the whole list, not the created row. That is deliberate on
// the server's side: the useful question on an offline order is not "did someone claim payment"
// but "do the two parties agree about the amount", and a write that answered with only what the
// writer just said would force a second request to find out.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * WHO CLAIMED WHAT. The kind is derived by the server from which side of the order the caller is
 * on and is never accepted from a request body — a buyer must not be able to record that the
 * SELLER received money.
 */
export const ATTESTATION_KINDS = ["payment_sent", "payment_received"] as const;

export type AttestationKind = (typeof ATTESTATION_KINDS)[number];

export const ATTESTATION_KIND_LABELS: Readonly<Record<AttestationKind, string>> = {
  payment_sent: "Payment sent",
  payment_received: "Payment received",
};

export const SettlementAttestationSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    attestationKind: z.enum(ATTESTATION_KINDS),
    attestedByOrganizationId: z.string(),
    /** Derived server-side, so a shared surface can label a claim without knowing which id it is. */
    attestedByRole: z.enum(["buyer", "seller"]),
    attestedByLegalNameSnapshot: z.string(),
    amountInCents: z.number().int(),
    currency: z.string(),
    referenceNote: z.string().nullable(),
    occurredAt: IsoDateTimeSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * `isAttestable` IS A LEGITIMATE `false`, not an error.
 *
 * Only the `direct_offline` rail admits an attestation; on a processor or escrow order the money
 * is observed and a self-report would compete with evidence. An order detail must be able to say
 * "this settles through a processor, there is nothing to record" without provoking a 409 to find
 * out, which is why the read reports the rail rather than refusing.
 */
export const SettlementAttestationListSchema = z
  .object({
    orderId: z.string(),
    settlementRail: z.string(),
    currency: z.string(),
    orderTotalInCents: z.number().int(),
    isAttestable: z.boolean(),
    items: z.array(SettlementAttestationSchema),
  })
  .strip();

export type SettlementAttestation = z.infer<typeof SettlementAttestationSchema>;
export type SettlementAttestationList = z.infer<typeof SettlementAttestationListSchema>;

/**
 * What a party may state, and nothing else.
 *
 * NO `attestationKind` AND NO `currency` — the server owns both. `occurredAt` is the one genuinely
 * external fact: the party knows when their bank moved the money and the server does not. It is
 * bounded to the past server-side.
 */
export interface RecordAttestationInput {
  readonly amountInCents: number;
  readonly occurredAt: string;
  readonly referenceNote?: string;
}
