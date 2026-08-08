// TRANSPORT: props-only — a mutable in-memory cart, no network.
//
// TEMPORARY. Deleted when `cart.api.ts` swaps its stand-ins for `getJson`/`sendJson`.
//
// THIS FIXTURE IS MUTABLE, UNLIKE EVERY OTHER ONE IN `src/mocks/store/`, and the reason is that a
// cart is the first WRITE surface. A static fixture would make the cart page a photograph: the
// quantity stepper would appear to work through local state, and the one discipline that actually
// matters here — the client sends an intent, the SERVER returns the authoritative cart, and the
// client renders what came back — would be untested until wiring day, which is precisely when
// getting it wrong is expensive.
//
// So this module models the server's role: it holds the cart, applies a mutation, RECOMPUTES the
// totals, and hands back the whole thing. No caller ever patches a line locally.
//
// Two consequences worth knowing. It is module state, so it lives per browser tab and resets on
// reload — good enough for a mock and nothing like a session. And the recomputation below is
// deliberately the SERVER's job being imitated, not a helper any component may call: when the real
// endpoint lands, this arithmetic is deleted rather than moved.

import type { CommerceCart, CommerceCartItem, SetCartItemInput } from "@/lib/store/cart.schemas";

/** A catalogue the mock cart prices against — the server's product table, in miniature. */
interface MockPricedProduct {
  readonly title: string;
  readonly currency: string;
  readonly unitPriceInCents: number;
  readonly minimumOrderQuantity: number | null;
  readonly isMadeToOrder: boolean;
  readonly stockState: CommerceCartItem["stockState"];
  /** Mirrors A1: a product with variants refuses a line naming none. */
  readonly requiresVariant: boolean;
  readonly availableQuantity: number;
  readonly variantNamesById?: Readonly<Record<string, string>>;
}

const MOCK_PRICED_PRODUCTS: Readonly<Record<string, MockPricedProduct>> = {
  prd_folding_chair: {
    title: "Powder-coated steel folding chair, stackable",
    currency: "USD",
    unitPriceInCents: 123_079,
    minimumOrderQuantity: 50,
    isMadeToOrder: false,
    stockState: "in_stock",
    requiresVariant: true,
    availableQuantity: 900,
    variantNamesById: {
      var_folding_chair_red: "Raspberry red",
      var_folding_chair_blue: "Sea blue",
    },
  },
  prd_office_chair: {
    title: "Mesh-back task chair, adjustable arms",
    // A SECOND CURRENCY in the cart, on purpose — this is what makes `currencyTotals` an array.
    currency: "EUR",
    unitPriceInCents: 74_900,
    minimumOrderQuantity: 100,
    isMadeToOrder: false,
    stockState: "in_stock",
    requiresVariant: false,
    availableQuantity: 400,
  },
  prd_massage_chair: {
    title: "Zero-gravity reclining massage chair",
    currency: "USD",
    unitPriceInCents: 1_845_000,
    minimumOrderQuantity: 5,
    isMadeToOrder: true,
    stockState: "made_to_order",
    requiresVariant: false,
    availableQuantity: 12,
  },
  prd_desk_lamp: {
    title: "Brass desk lamp, dimmable",
    currency: "USD",
    unitPriceInCents: 18_400,
    minimumOrderQuantity: null,
    isMadeToOrder: false,
    stockState: "low_stock",
    requiresVariant: false,
    // Deliberately small, so asking for more than this produces a real `INSUFFICIENT_STOCK` line
    // rather than a hypothetical one.
    availableQuantity: 3,
  },
};

/**
 * Prices one line the way the server would, or attaches the error explaining why it could not.
 *
 * The order of the checks matters and mirrors the backend: a missing variant is refused BEFORE stock
 * is consulted, because a line that names no variant has no stock to consult.
 */
function priceLine(
  productId: string,
  quantity: number,
  variantId: string | null,
  isSample: boolean,
): CommerceCartItem {
  const product = MOCK_PRICED_PRODUCTS[productId];

  if (product === undefined) {
    return {
      productId,
      variantId,
      variantName: null,
      quantity,
      isSample,
      title: "Unknown product",
      currency: null,
      unitPriceInCents: null,
      lineTotalInCents: null,
      isMadeToOrder: null,
      minimumOrderQuantity: null,
      pricingError: { type: "PRODUCT_NOT_FOUND" },
    };
  }

  const variantName = variantId === null ? null : (product.variantNamesById?.[variantId] ?? null);

  const unpriced = {
    productId,
    variantId,
    variantName,
    quantity,
    isSample,
    title: product.title,
    currency: null,
    unitPriceInCents: null,
    lineTotalInCents: null,
    isMadeToOrder: null,
    minimumOrderQuantity: product.minimumOrderQuantity,
  } as const;

  if (product.requiresVariant && variantId === null) {
    return { ...unpriced, pricingError: { type: "VARIANT_REQUIRED" } };
  }
  if (quantity > product.availableQuantity) {
    return {
      ...unpriced,
      stockState: product.stockState,
      pricingError: { type: "INSUFFICIENT_STOCK", availableQuantity: product.availableQuantity },
    };
  }
  // A SAMPLE BYPASSES EXACTLY TWO THINGS — the tier ladder and the minimum order quantity — because
  // both express bulk economics and a sample is the negation of bulk. Stock and the variant rules
  // still apply, which is why this check sits after them.
  if (
    !isSample &&
    product.minimumOrderQuantity !== null &&
    quantity < product.minimumOrderQuantity
  ) {
    return {
      ...unpriced,
      stockState: product.stockState,
      pricingError: {
        type: "BELOW_MINIMUM_ORDER_QUANTITY",
        minimumOrderQuantity: product.minimumOrderQuantity,
      },
    };
  }

  return {
    productId,
    variantId,
    variantName,
    quantity,
    isSample,
    title: product.title,
    currency: product.currency,
    unitPriceInCents: product.unitPriceInCents,
    lineTotalInCents: product.unitPriceInCents * quantity,
    isMadeToOrder: product.isMadeToOrder,
    minimumOrderQuantity: product.minimumOrderQuantity,
    stockState: product.stockState,
  };
}

/**
 * Totals per currency, skipping any line that could not be priced.
 *
 * A stale line contributes NOTHING rather than zero — which is why a cart with one broken line still
 * shows a truthful total for the rest, and why the broken line has to be visible on its own terms.
 */
function recomputeCurrencyTotals(
  items: readonly CommerceCartItem[],
): CommerceCart["currencyTotals"] {
  const subtotalsByCurrency = new Map<string, number>();

  for (const item of items) {
    if (item.currency === null || item.lineTotalInCents === null) continue;
    subtotalsByCurrency.set(
      item.currency,
      (subtotalsByCurrency.get(item.currency) ?? 0) + item.lineTotalInCents,
    );
  }

  return [...subtotalsByCurrency.entries()]
    .map(([currency, subtotalInCents]) => ({
      currency,
      subtotalInCents,
      // Equal to the subtotal today because tax, service fee and freight are all literal `0`
      // server-side. The two fields stay separate anyway — a client that computed one from the other
      // would break silently the day tax lands.
      totalInCents: subtotalInCents,
    }))
    .toSorted((left, right) => left.currency.localeCompare(right.currency));
}

/** Identity of a cart line: product + variant + sample flag. All three, or a sample collides. */
function isSameLine(
  item: CommerceCartItem,
  productId: string,
  variantId: string | null,
  isSample: boolean,
): boolean {
  return item.productId === productId && item.variantId === variantId && item.isSample === isSample;
}

const INITIAL_LINES: CommerceCartItem[] = [
  priceLine("prd_folding_chair", 120, "var_folding_chair_red", false),
  priceLine("prd_office_chair", 100, null, false),
  // A SAMPLE beside nothing else, showing the flag renders. Quantity 1 is below the product's MOQ of
  // 5 on purpose: a sample is allowed to be, and if this line ever shows
  // `BELOW_MINIMUM_ORDER_QUANTITY` the bypass has regressed.
  priceLine("prd_massage_chair", 1, null, true),
  // A DELIBERATELY BROKEN LINE: 40 requested, 3 available. The cart must still load, still total the
  // other lines, and show this one's reason.
  priceLine("prd_desk_lamp", 40, null, false),
];

let mockCart: CommerceCart = {
  id: "cart_mock",
  buyerOrganizationId: "org_buyer_mock",
  items: INITIAL_LINES,
  currencyTotals: recomputeCurrencyTotals(INITIAL_LINES),
  // A fixed timestamp: `new Date()` at module scope would differ between the server prerender and
  // the client, which is a hydration mismatch for no benefit.
  updatedAt: "2026-08-08T09:15:00.000Z",
};

function commit(items: CommerceCartItem[]): CommerceCart {
  mockCart = {
    ...mockCart,
    items,
    currencyTotals: recomputeCurrencyTotals(items),
    updatedAt: mockCart.updatedAt,
  };
  return mockCart;
}

export function readMockCart(): CommerceCart {
  return mockCart;
}

/**
 * Sets the DESIRED quantity for a line — not an increment.
 *
 * Re-prices the line from scratch afterwards, exactly as the server does under its pricing row
 * locks. A quantity the buyer may not have is refused with a reason rather than clamped: silently
 * lowering someone's order is worse than telling them why it cannot be filled.
 */
export function setMockCartItem(productId: string, input: SetCartItemInput): CommerceCart {
  const variantId = input.variantId ?? null;
  const isSample = input.isSample ?? false;
  const pricedLine = priceLine(productId, input.quantity, variantId, isSample);

  const existingIndex = mockCart.items.findIndex((item) =>
    isSameLine(item, productId, variantId, isSample),
  );

  const items = [...mockCart.items];
  if (existingIndex === -1) items.push(pricedLine);
  else items[existingIndex] = pricedLine;

  return commit(items);
}

/** Naming a variant removes that line; omitting one removes every line for the product. */
export function removeMockCartItem(productId: string, variantId?: string): CommerceCart {
  const items = mockCart.items.filter((item) => {
    if (item.productId !== productId) return true;
    if (variantId === undefined) return false;
    return item.variantId !== variantId;
  });
  return commit(items);
}

/** Empties the cart. Used by a successful confirm — the server clears it in the same transaction. */
export function clearMockCart(): CommerceCart {
  return commit([]);
}
