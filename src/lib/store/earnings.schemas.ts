// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `GET /commerce/provider/earnings` (Phase 25).
//
// TRANSCRIBED FROM THE CONTROLLER'S RESPONSE, NOT THE SERVICE'S RETURN TYPE. That distinction is
// the single most repeated mistake of the previous pass — eleven schemas were written from a
// service signature and every one of them would have failed on its first live call, because the
// controller reshapes what the service returns. `getSellerEarnings` happens to answer
// `data: result.value` unchanged, and this file was checked against a live payload before it was
// believed.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One currency's worth of one kind of fact.
 *
 * A CURRENCY WITH NO MONEY IN IT IS ABSENT FROM THE ARRAY, never present as a zero row. The server
 * drops empty totals deliberately, so an empty array means "no money of this kind exists" — which
 * a page must render as a sentence rather than as `$0.00`. The two are different answers and a
 * seller reads them differently.
 */
export const CurrencyAmountSchema = z
  .object({
    currency: z.string(),
    amountInCents: z.number().int(),
    orderCount: z.number().int(),
  })
  .strip();

/**
 * THREE KINDS OF FACT, AND THERE IS NO GRAND TOTAL ANYWHERE IN THIS SHAPE.
 *
 * That is a decision the backend's schema enforces rather than a field somebody forgot:
 * `commerce_journal_account_memorandum_ck` exists, in its author's words, "so no future balance
 * report can sum memo value and real money into one number". Adding a headline figure that sums
 * these members would be a regression, not a feature.
 *
 *   - `observed.processorSettled` — a payment processor reported the money moved.
 *   - `observed.escrowReleased` — a licensed third party released a milestone. Memorandum value:
 *     someone else is holding it, and Qatoto never claims it as an asset.
 *   - `selfReported.attestedReceived` — the seller said so. On the `direct_offline` rail that is
 *     all there will ever be, because two banks moved money and this platform was not a party.
 *
 * `commissionOwed` runs the OTHER WAY: it is what the seller owes Qatoto, accrued as a receivable
 * rather than deducted. It is normally EMPTY — the commission rate defaults to zero basis points
 * and a zero rate posts nothing at all rather than a zero-value entry.
 *
 * `uncounted` is the blind spot made legible. An offline order nobody has attested may well have
 * been paid; reporting it as zero revenue would be a claim the platform cannot support.
 */
export const SellerEarningsSchema = z
  .object({
    window: z.object({
      from: IsoDateTimeSchema.nullable(),
      to: IsoDateTimeSchema.nullable(),
    }),
    observed: z.object({
      processorSettled: z.array(CurrencyAmountSchema),
      processorRefunded: z.array(CurrencyAmountSchema),
      escrowReleased: z.array(CurrencyAmountSchema),
      escrowRefunded: z.array(CurrencyAmountSchema),
    }),
    selfReported: z.object({
      attestedReceived: z.array(CurrencyAmountSchema),
    }),
    commissionOwed: z.array(CurrencyAmountSchema),
    uncounted: z.object({
      offlineOrdersWithNoAttestation: z.number().int(),
      ordersAwaitingPayment: z.number().int(),
    }),
  })
  .strip();

export type CurrencyAmount = z.infer<typeof CurrencyAmountSchema>;
export type SellerEarnings = z.infer<typeof SellerEarningsSchema>;

/**
 * `GET /commerce/provider/earnings`.
 *
 * NO `organizationId`. The seller is the authenticated session's active organization — the server
 * refuses the key outright (its query schema is `.strict()`), which is the correct answer to a
 * client trying to name whose books it is reading.
 *
 * BOTH BOUNDS OPTIONAL, and omitting them is the LIFETIME figure rather than a defaulted window.
 */
export interface SellerEarningsFilter {
  readonly from?: string;
  readonly to?: string;
}
