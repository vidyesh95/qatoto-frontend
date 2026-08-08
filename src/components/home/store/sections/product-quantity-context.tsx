// TRANSPORT: props-only — one piece of client state, no network.
"use client";

// The quantity the buyer has chosen on a product page, shared between the price chart's stepper and
// the buy actions.
//
// IT IS A CONTEXT BECAUSE THE TWO CONTROLS ARE NOT NEIGHBOURS. The stepper lives in the price chart,
// inside the buy column; the buy actions render TWICE, once inline in that column and once in the
// fixed mobile bar at the page root. `product-detail.tsx` between them is a server component, so
// there is no `useState` that all three can share and no prop that reaches the fixed bar.
//
// It previously lived as local state inside `price-chart.tsx`, where it only drove the tier
// highlight. That was fine while "Add to cart" was inert. It is not fine now: a visible quantity
// field that the add button ignores would put 50 in the cart while the page says 200.
//
// THE FLOOR IS THE MINIMUM ORDER QUANTITY, NOT 1. A minimum order quantity is a commercial term the
// seller declared, and the server refuses anything under it with `BELOW_MINIMUM_ORDER_QUANTITY`. The
// stepper starts there and cannot go below it, so the default press is a quantity the seller will
// actually accept — the client is not enforcing the rule, it is declining to offer a value it already
// knows is refused.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ProductQuantitySelection {
  /** The parsed, floored quantity. This is what a mutation sends. */
  readonly quantity: number;
  /** Kept as a string so the field can be empty mid-edit. */
  readonly quantityInputValue: string;
  readonly setQuantityInputValue: (value: string) => void;
  readonly minimumOrderQuantity: number;
}

const ProductQuantityContext = createContext<ProductQuantitySelection | null>(null);

export function ProductQuantityProvider({
  minimumOrderQuantity,
  children,
}: {
  minimumOrderQuantity: number;
  children: ReactNode;
}) {
  const [quantityInputValue, setQuantityInputValue] = useState(String(minimumOrderQuantity));

  const value = useMemo<ProductQuantitySelection>(() => {
    const parsedQuantity = Number.parseInt(quantityInputValue, 10);
    return {
      quantity: Math.max(
        minimumOrderQuantity,
        Number.isNaN(parsedQuantity) ? minimumOrderQuantity : parsedQuantity,
      ),
      quantityInputValue,
      setQuantityInputValue,
      minimumOrderQuantity,
    };
  }, [quantityInputValue, minimumOrderQuantity]);

  return <ProductQuantityContext value={value}>{children}</ProductQuantityContext>;
}

/** Throws outside the provider rather than defaulting — a silent 1 here is a wrong order quantity. */
export function useProductQuantity(): ProductQuantitySelection {
  const selection = useContext(ProductQuantityContext);
  if (selection === null) {
    throw new Error("useProductQuantity must be used inside a ProductQuantityProvider.");
  }
  return selection;
}
