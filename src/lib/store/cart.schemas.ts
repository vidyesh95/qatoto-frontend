// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the buyer's cart and checkout: `GET /commerce/cart`,
// `PUT`/`DELETE /commerce/cart/items/:productId`, `POST /commerce/cart/from-pathway/:pathwaySlug`,
// `POST /commerce/checkout/prepare` and `POST /commerce/checkout/confirm`.
//
// Transcribed from `commerce-cart.service.ts` (`CommerceCartProjection` :72,
// `CommerceCartItemProjection` :96) and `commerce-checkout.service.ts`
// (`CheckoutPrepareProjection`, `CheckoutCurrencyTotalProjection`, `OrderProjection`,
// `ConfirmCheckoutProjection`).
//
// THIS IS THE FIRST WRITE SURFACE IN THE STORE, and four rules apply that no read needed:
//
//  1. NOTHING IS OPTIMISTIC. Every mutation returns the authoritative cart, and the client renders
//     what came back. A cart line is a price and a stock reservation; guessing at either and being
//     wrong shows a buyer a total they will not be charged.
//  2. THE TOTALS ARE PER CURRENCY AND ARE NEVER SUMMED. `currencyTotals` is an array because a
//     basket spanning three sellers in three currencies has three totals and no grand total. Adding
//     them invents an FX rate the platform has not quoted.
//  3. A PER-LINE `pricingError` DOES NOT FAIL THE CART. A cart never fails to load because one line
//     went stale — the line carries its own error, the rest still price, and the buyer can act on
//     the one that broke.
//  4. AN IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, in component state, and reused across retries
//     of THAT attempt. A fresh key per retry is not idempotency, it is a second order.

import { z } from "zod";

import { CommercePricingErrorSchema } from "@/lib/store/merchandising.schemas";
import { STORE_STOCK_STATES } from "@/lib/store/organizations.schemas";
import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Cart -------------------------------------------------------------------

/**
 * One cart line.
 *
 * MONEY IS NULLABLE HERE AND THAT IS NOT AN OVERSIGHT. `currency`, `unitPriceInCents` and
 * `lineTotalInCents` are all null together when the line could not be priced — a retired variant, a
 * product that stopped being purchasable — and `pricingError` says why. Render the reason, never a
 * zero: `$0.00` on a line the buyer cannot buy is worse than no number at all.
 *
 * `isSample` makes a sample line and a bulk line of the SAME product two separate entries. That is
 * the entire pattern samples exist for: order one to check it, then order five hundred.
 *
 * `stockState` and `pricingError` are OPTIONAL on the wire (`field?:`), so they are absent rather
 * than null. `.optional()` matches that; `.nullable()` would accept a shape the server never sends.
 */
export const CommerceCartItemSchema = z
  .object({
    productId: z.string(),
    // Null only for products with no active variants. A product WITH variants and no `variantId`
    // is refused at add time with `VARIANT_REQUIRED`, so this cannot be null for those.
    variantId: z.string().nullable(),
    variantName: z.string().nullable(),
    quantity: z.number().int(),
    isSample: z.boolean(),
    title: z.string(),
    currency: z.string().nullable(),
    unitPriceInCents: z.number().int().nullable(),
    lineTotalInCents: z.number().int().nullable(),
    isMadeToOrder: z.boolean().nullable(),
    minimumOrderQuantity: z.number().int().nullable(),
    // A17. The ceiling on a sample line. Null on every bulk line — a bulk line has a floor, not a
    // ceiling — and null on a sample line that failed to price, which is why the stepper must
    // treat null as "cannot raise" rather than "no limit".
    maximumSampleQuantity: z.number().int().nullable(),
    stockState: z.enum(STORE_STOCK_STATES).optional(),
    pricingError: CommercePricingErrorSchema.optional(),
  })
  .strip();

/**
 * A subtotal and total for ONE currency.
 *
 * `subtotalInCents` and `totalInCents` differ once tax, fees, freight or a discount apply. Today
 * tax, service fee and freight are all written literal `0` server-side, so they match — do NOT rely
 * on that, and never compute one from the other.
 */
export const CommerceCartCurrencyTotalSchema = z
  .object({
    currency: z.string(),
    subtotalInCents: z.number().int(),
    totalInCents: z.number().int(),
  })
  .strip();

export const CommerceCartSchema = z
  .object({
    id: z.string(),
    // The cart belongs to an ORGANIZATION, not a user. Two colleagues share one cart, which is
    // correct for procurement and surprising if you expect a consumer basket.
    buyerOrganizationId: z.string(),
    items: z.array(CommerceCartItemSchema),
    currencyTotals: z.array(CommerceCartCurrencyTotalSchema),
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

// --- Checkout preparation ---------------------------------------------------

export const CheckoutPrepareLineSchema = z
  .object({
    productId: z.string(),
    // Present because a checkout produces ONE ORDER PER SELLER. The client groups by it; it does not
    // decide it.
    sellerOrganizationId: z.string(),
    title: z.string(),
    quantity: z.number().int(),
    // Not nullable here, unlike the cart line: preparation refuses outright if a line cannot be
    // priced, so anything that reaches this shape has a price.
    unitPriceInCents: z.number().int(),
    lineTotalInCents: z.number().int(),
    currency: z.string(),
    isMadeToOrder: z.boolean(),
  })
  .strip();

/**
 * The seven money fields of a checkout total, per currency.
 *
 * `total = subtotal + tax + serviceFee + shipping - discount`, and the backend enforces that with a
 * CHECK constraint. The client DISPLAYS these; it never recomputes the total from the parts, because
 * a client-side sum that disagrees with the constraint is a bug that looks like a pricing dispute.
 *
 * `shippingInCents` is written literal `0` today and that is a decision, not a gap: nothing is
 * charged for freight, so nothing appears in a total. Billing from an advertised estimate with no
 * booking behind it would put an invented number into an immutable order.
 */
export const CheckoutCurrencyTotalSchema = z
  .object({
    currency: z.string(),
    subtotalInCents: z.number().int(),
    taxInCents: z.number().int(),
    serviceFeeInCents: z.number().int(),
    shippingInCents: z.number().int(),
    discountInCents: z.number().int(),
    totalInCents: z.number().int(),
  })
  .strip();

/** What an indicative delivery estimate was computed FROM. Provenance, not a booking. */
export const DeliveryEstimateBasisSchema = z
  .object({
    originCountryCode: z.string().nullable(),
    destinationCountryCode: z.string(),
    billableWeightGrams: z.number().int().nullable(),
    packageCount: z.number().int().nullable(),
    // True when the seller never declared package geometry. The estimate is then weaker, and saying
    // so beats guessing a weight.
    hasIncompletePackageData: z.boolean(),
  })
  .strip();

export const DeliveryEstimateSourceOfferingSchema = z
  .object({
    offeringId: z.string(),
    offeringSlug: z.string(),
    providerOrganizationSlug: z.string(),
    providerDisplayName: z.string(),
    providerKind: z.string(),
  })
  .strip();

/**
 * One estimate per currency, NEVER converted.
 *
 * An offering's currency is independent of the order's, so a lane priced in EUR stays in EUR beside
 * a USD order — the same rule the pathway set totals follow. And no DELIVERY DATE is returned at
 * all: an estimate is not a booking, and a date the platform cannot keep is a promise it has no
 * business making.
 */
export const DeliveryEstimateSchema = z
  .object({
    currency: z.string(),
    estimatedMinInCents: z.number().int(),
    estimatedMaxInCents: z.number().int(),
    leadTimeMinDays: z.number().int().nullable(),
    leadTimeMaxDays: z.number().int().nullable(),
    basis: DeliveryEstimateBasisSchema,
    derivedFrom: z.array(DeliveryEstimateSourceOfferingSchema),
  })
  .strip();

/**
 * Estimates for one seller. An EMPTY `estimates` array is a real answer meaning "no covering
 * provider was found" — which is NOT "free". The mock this replaces rendered the second one.
 */
export const SellerDeliveryEstimateSchema = z
  .object({
    sellerOrganizationId: z.string(),
    estimates: z.array(DeliveryEstimateSchema),
  })
  .strip();

/**
 * `POST /commerce/checkout/prepare`.
 *
 * `prepareId` is what `confirm` echoes back, and `expiresAt` is real: preparation RESERVES STOCK
 * with row locks and a bounded expiry, and a worker releases it. So a prepare left open is a
 * reservation held against other buyers — show the expiry, and do not silently re-prepare on a
 * timer.
 */
export const CheckoutPrepareSchema = z
  .object({
    prepareId: z.string(),
    expiresAt: IsoDateTimeSchema,
    items: z.array(CheckoutPrepareLineSchema),
    currencyTotals: z.array(CheckoutCurrencyTotalSchema),
    // Redacted plaintext — country, region, locality, postcode. The street lines, recipient and
    // phone are encrypted and reach a seller only through the audited decrypt route, after confirm.
    deliveryAddressSnapshot: z.string().nullable(),
    deliveryEstimates: z.array(SellerDeliveryEstimateSchema),
    // `arrivalWindows` IS SENT AND IS NOT PARSED HERE YET. `.strip()` drops it, deliberately rather
    // than accidentally: the backend builds it with `projectPrepareArrivalWindow`, where the window
    // itself is ALWAYS null at prepare time and only `missingComponents` carries meaning. Rendering
    // it needs a checkout panel that names components — "ships in 15–25 days · 24–34 days at sea ·
    // 3–10 days clearance" — without ever printing a date, which is its own piece of work. Adding
    // the field with nothing reading it would be an unverified shape.
  })
  .strip();

// --- Orders created by confirm ----------------------------------------------

export const ORDER_SOURCES = ["direct_checkout", "accepted_quote"] as const;

export const ORDER_STATES = [
  "pending_payment",
  "payment_processing",
  "confirmed",
  "in_fulfillment",
  "partially_completed",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

/**
 * How an order settles. FOUR VALUES, AND WHICH ONE YOU GET DEPENDS ON HOW THE ORDER WAS MADE.
 *
 * `direct_processor` is what a DIRECT CHECKOUT produces, always, unless the buyer names an accepted
 * escrow agreement. `commerce-checkout.service.ts` passes `hasProcessorPayment: true` for this path
 * unconditionally, so the processor settles buyer straight to seller and the money never rests
 * anywhere Qatoto can see.
 *
 * `direct_offline` belongs to QUOTE-ORIGINATED orders, settled by T/T, L/C or whatever the parties
 * arranged and recorded as a party attestation. Nothing on the checkout page can produce it. This
 * comment used to call it "the default", which was wrong in the one place it mattered: only
 * `direct_processor` and `internal_custody` can take a payment intent at all, so a reader who
 * believed a checkout produced `direct_offline` would have gone looking for a wire-transfer UI
 * instead of the pay control.
 *
 * `external_escrow` requires a mutual agreement and a licensed third party. `internal_custody` is
 * FROZEN — §14 retired it and decided the platform is not a custodian — and its branch survives only
 * so a replayed webhook for a pre-Phase-14 order posts what that order's rail permits.
 */
export const SETTLEMENT_RAILS = [
  "internal_custody",
  "direct_offline",
  "direct_processor",
  "external_escrow",
] as const;

export type SettlementRail = (typeof SETTLEMENT_RAILS)[number];

export const CommerceOrderSchema = z
  .object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    counterpartyOrganizationId: z.string(),
    checkoutGroupId: z.string().nullable(),
    source: z.enum(ORDER_SOURCES),
    state: z.enum(ORDER_STATES),
    currency: z.string(),
    subtotalInCents: z.number().int(),
    taxInCents: z.number().int(),
    serviceFeeInCents: z.number().int(),
    shippingInCents: z.number().int(),
    discountInCents: z.number().int(),
    totalInCents: z.number().int(),
    paymentTermsSnapshot: z.string().nullable(),
    incotermSnapshot: z.string().nullable(),
    buyerLegalNameSnapshot: z.string(),
    counterpartyLegalNameSnapshot: z.string(),
    settlementRail: z.enum(SETTLEMENT_RAILS),
    /**
     * DERIVED FROM THE RAIL, and on the wire because ABSENCE MUST BE LEGIBLE. A client has to be
     * able to state plainly that nobody is holding the funds; leaving it to be inferred from a rail
     * name is how an interface ends up implying a protection nobody agreed to.
     */
    hasEscrowProtection: z.boolean(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * `POST /commerce/checkout/confirm`.
 *
 * ONE CHECKOUT GROUP, N ORDERS — one per counterparty organization. That split is deliberate: it
 * stops one late warehouse provider blocking a manufacturer's shipment, and keeps authorization,
 * invoicing, refunds and disputes attributable to exactly one counterparty.
 */
export const ConfirmCheckoutSchema = z
  .object({
    checkoutGroupId: z.string(),
    orders: z.array(CommerceOrderSchema),
  })
  .strip();

// --- Request bodies ---------------------------------------------------------

/**
 * A customization selection, keyed by SLOT KEY rather than option id.
 *
 * The key is the seller's stable machine name for the slot, so a client that cached one still means
 * the same thing after a rename. Capped at twelve slots server-side.
 */
export interface CustomizationSelectionInput {
  readonly slotKey: string;
  /** For an upload slot: the id of an already-scanned, promoted private document. */
  readonly encryptedDocumentId?: string;
  /** For a choice slot: one of the seller's declared values. */
  readonly choiceValue?: string;
}

/**
 * `PUT /commerce/cart/items/:productId`. Sets the DESIRED quantity — it is not an increment.
 *
 * `variantId` stays optional in the schema and is mandatory in the domain: its absence is exactly
 * what produces `VARIANT_REQUIRED` for a product with active variants, and the server is the one
 * that decides.
 */
export interface SetCartItemInput {
  readonly quantity: number;
  readonly variantId?: string;
  readonly isSample?: boolean;
  readonly customizations?: readonly CustomizationSelectionInput[];
}

/**
 * `DELETE /commerce/cart/items/:productId`. Naming a variant removes that line; omitting one
 * removes every line for the product.
 *
 * `isSample` narrows the same way and is what keeps a sample line and a bulk line of one product
 * independently removable — omit it and BOTH go, which is what the Remove control used to do.
 * Serialised as the STRING "true"/"false" by `buildQueryString`; the backend parses an enum
 * rather than coercing, because `Boolean("false")` is `true`.
 */
export interface RemoveCartItemInput {
  readonly variantId?: string;
  readonly isSample?: boolean;
}

export interface PrepareCheckoutInput {
  readonly deliveryAddressId?: string;
}

/**
 * `POST /commerce/checkout/confirm`.
 *
 * `settlementAgreements` is OPTIONAL AND OMITTING IT IS THE DEFAULT, not an error: the order settles
 * with no protection at all and the buyer carries the counterparty risk. Naming an agreement here
 * does NOT establish one — the server revalidates it against the accepted, unconsumed set under a
 * row lock and refuses the confirm outright if it has lapsed.
 */
export interface ConfirmCheckoutInput {
  readonly prepareId: string;
  readonly deliveryAddressId?: string;
  readonly settlementAgreements?: readonly {
    readonly sellerOrganizationId: string;
    readonly agreementId: string;
  }[];
}

export type CommerceCartItem = z.infer<typeof CommerceCartItemSchema>;
export type CommerceCart = z.infer<typeof CommerceCartSchema>;
export type CommerceCartCurrencyTotal = z.infer<typeof CommerceCartCurrencyTotalSchema>;
export type CheckoutPrepare = z.infer<typeof CheckoutPrepareSchema>;
export type CheckoutPrepareLine = z.infer<typeof CheckoutPrepareLineSchema>;
export type CheckoutCurrencyTotal = z.infer<typeof CheckoutCurrencyTotalSchema>;
export type SellerDeliveryEstimate = z.infer<typeof SellerDeliveryEstimateSchema>;
export type DeliveryEstimate = z.infer<typeof DeliveryEstimateSchema>;
export type CommerceOrder = z.infer<typeof CommerceOrderSchema>;
export type ConfirmCheckout = z.infer<typeof ConfirmCheckoutSchema>;

// --- Display maps -----------------------------------------------------------

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  pending_payment: "Awaiting payment",
  payment_processing: "Payment processing",
  confirmed: "Confirmed",
  in_fulfillment: "In fulfilment",
  partially_completed: "Partly completed",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "In dispute",
};

/**
 * What each rail means for the buyer's money, in plain words.
 *
 * These sentences are the ONE place a buyer learns whether anybody is holding the funds, so none of
 * them may imply a protection that the rail does not provide. `direct_offline` in particular has to
 * say so outright — it is the default.
 */
export const SETTLEMENT_RAIL_LABELS: Record<SettlementRail, string> = {
  internal_custody: "Held by Qatoto",
  direct_offline: "You pay the seller directly. Qatoto is not holding the money.",
  direct_processor: "Card or bank payment settled to the seller. Qatoto is not holding the money.",
  external_escrow: "Held by the escrow provider you and the seller agreed on.",
};
