// TRANSPORT: props-only — derives a prepare/confirm from the mutable mock cart, no network.
//
// TEMPORARY. Deleted when `cart.api.ts` swaps its stand-ins for `sendJson`.
//
// Prepare and confirm are DERIVED FROM THE CART rather than being their own fixtures, because the one
// thing this pair has to demonstrate is that they agree with it. A hand-written prepare fixture would
// happily disagree with the cart the buyer just edited, and the resulting "the total changed at
// checkout" is the single most damaging bug this surface can ship.
//
// It also models two refusals the real endpoint makes, since both change what the page must render:
//   EMPTY_CART — prepare refuses outright rather than preparing nothing.
//   A LINE THAT CANNOT BE PRICED — preparation refuses the whole cart. Unlike `GET /cart`, which
//   tolerates a stale line and shows its reason, prepare is the point where every line must be
//   buyable, because it reserves stock and the next step creates orders.

import type {
  CheckoutPrepare,
  CheckoutPrepareLine,
  ConfirmCheckout,
  CommerceOrder,
} from "@/lib/store/cart.schemas";
import { clearMockCart, readMockCart } from "@/mocks/store/cart-mocks";

/** Which seller owns which product, so the prepare can group the way the server does. */
const SELLER_ORGANIZATION_BY_PRODUCT: Readonly<Record<string, string>> = {
  prd_folding_chair: "org_puda",
  prd_massage_chair: "org_puda",
  prd_desk_lamp: "org_puda",
  prd_office_chair: "org_nordlys",
};

const SELLER_LEGAL_NAMES: Readonly<Record<string, string>> = {
  org_puda: "Guangdong Puda Electrical Appliance Co., Ltd",
  org_nordlys: "Nordlys Industrial AS",
};

export type MockPrepareRefusal =
  | { readonly type: "EMPTY_CART" }
  | { readonly type: "LINE_NOT_PRICEABLE"; readonly productId: string };

/**
 * Builds a prepare from the current cart, or says why it cannot.
 *
 * `expiresAt` is fifteen minutes out and is not decoration: preparation RESERVES STOCK with row locks
 * and a bounded expiry, and a worker releases it. A prepare left open is a reservation held against
 * other buyers.
 */
export function buildMockPrepare(
  deliveryAddressSnapshot: string | null,
):
  | { readonly ok: true; readonly prepare: CheckoutPrepare }
  | { readonly ok: false; readonly refusal: MockPrepareRefusal } {
  const cart = readMockCart();

  if (cart.items.length === 0) return { ok: false, refusal: { type: "EMPTY_CART" } };

  const unpriceableLine = cart.items.find(
    (item) => item.currency === null || item.unitPriceInCents === null,
  );
  if (unpriceableLine !== undefined) {
    return {
      ok: false,
      refusal: { type: "LINE_NOT_PRICEABLE", productId: unpriceableLine.productId },
    };
  }

  const items: CheckoutPrepareLine[] = cart.items.map((item) => ({
    productId: item.productId,
    sellerOrganizationId: SELLER_ORGANIZATION_BY_PRODUCT[item.productId] ?? "org_unknown",
    title: item.title,
    quantity: item.quantity,
    // Non-null by the guard above. Read through `?? 0` rather than asserted, because a cast here
    // would be a claim about data this function just finished checking — and the check is the point.
    unitPriceInCents: item.unitPriceInCents ?? 0,
    lineTotalInCents: item.lineTotalInCents ?? 0,
    currency: item.currency ?? "USD",
    isMadeToOrder: item.isMadeToOrder ?? false,
  }));

  const currencyTotals = cart.currencyTotals.map((total) => ({
    currency: total.currency,
    subtotalInCents: total.subtotalInCents,
    // All three are literal `0` server-side today. Tax and fees are not implemented, and freight is
    // deliberately not charged: billing from an indicative estimate with no booking behind it would
    // put an invented number into an immutable order.
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: total.subtotalInCents,
  }));

  return {
    ok: true,
    prepare: {
      prepareId: "prep_mock_1",
      expiresAt: "2026-08-08T09:30:00.000Z",
      items,
      currencyTotals,
      deliveryAddressSnapshot,
      deliveryEstimates: [
        {
          sellerOrganizationId: "org_puda",
          estimates: [
            {
              currency: "USD",
              estimatedMinInCents: 185_000,
              estimatedMaxInCents: 240_000,
              leadTimeMinDays: 28,
              leadTimeMaxDays: 38,
              basis: {
                originCountryCode: "CN",
                destinationCountryCode: "IN",
                billableWeightGrams: 486_000,
                packageCount: 120,
                hasIncompletePackageData: false,
              },
              derivedFrom: [
                {
                  offeringId: "off_meridian_fcl",
                  offeringSlug: "meridian-fcl-asia-europe",
                  providerOrganizationSlug: "meridian-freight",
                  providerDisplayName: "Meridian Freight Partners",
                  providerKind: "freight_forwarder",
                },
              ],
            },
          ],
        },
        {
          // AN EMPTY ESTIMATE LIST IS A REAL ANSWER and it means "no covering provider was found",
          // which is NOT "free". The mock this replaces rendered "Free Delivery" for exactly this
          // case, and that is the specific lie the empty array exists to prevent.
          sellerOrganizationId: "org_nordlys",
          estimates: [],
        },
      ],
    },
  };
}

/**
 * Confirms the prepare into ONE ORDER PER COUNTERPARTY and clears the cart.
 *
 * The per-seller split is not a display choice: it stops one late provider blocking another's
 * shipment and keeps authorization, invoicing, refunds and disputes attributable to one counterparty.
 *
 * Every order comes back on `direct_offline` — the DEFAULT rail, where Qatoto observes nothing and
 * the buyer carries the counterparty risk — with `hasEscrowProtection: false`. That pairing is what
 * the confirmation screen has to state plainly rather than leave to inference.
 */
export function buildMockConfirmation(prepare: CheckoutPrepare): ConfirmCheckout {
  const sellerOrganizationIds = [
    ...new Set(prepare.items.map((item) => item.sellerOrganizationId)),
  ];

  const orders: CommerceOrder[] = sellerOrganizationIds.map((sellerOrganizationId, sellerIndex) => {
    const sellerLines = prepare.items.filter(
      (item) => item.sellerOrganizationId === sellerOrganizationId,
    );
    const currency = sellerLines[0]?.currency ?? "USD";
    const subtotalInCents = sellerLines.reduce((sum, line) => sum + line.lineTotalInCents, 0);

    return {
      id: `ord_mock_${sellerIndex + 1}`,
      buyerOrganizationId: readMockCart().buyerOrganizationId,
      counterpartyOrganizationId: sellerOrganizationId,
      checkoutGroupId: "grp_mock_1",
      source: "direct_checkout",
      // A confirmed checkout lands here, not at `confirmed`: nothing has been paid, and the state
      // machine says so.
      state: "pending_payment",
      currency,
      subtotalInCents,
      taxInCents: 0,
      serviceFeeInCents: 0,
      shippingInCents: 0,
      discountInCents: 0,
      totalInCents: subtotalInCents,
      paymentTermsSnapshot: null,
      incotermSnapshot: null,
      buyerLegalNameSnapshot: "Kuberhunt Procurement Pvt Ltd",
      counterpartyLegalNameSnapshot:
        SELLER_LEGAL_NAMES[sellerOrganizationId] ?? sellerOrganizationId,
      settlementRail: "direct_offline",
      hasEscrowProtection: false,
      createdAt: "2026-08-08T09:16:00.000Z",
    };
  });

  // The server clears the cart in the same transaction that creates the orders.
  clearMockCart();

  return { checkoutGroupId: "grp_mock_1", orders };
}
