// TRANSPORT: props-only — the product page's client state, no network.
"use client";

// WHAT THE BUYER HAS CHOSEN ON A PRODUCT PAGE: which variant, and how many.
//
// ONE CONTEXT FOR BOTH, BECAUSE THE TWO ARE COUPLED. A variant carries its OWN minimum order
// quantity, and the quantity floor has to follow the selection — two independent providers would let
// the page show "Sea blue, minimum 20" while the stepper still floors at the product's 50, and the
// server would then refuse the add with `BELOW_MINIMUM_ORDER_QUANTITY` for a number the page itself
// offered. Renamed from `product-quantity-context.tsx` when the variant half arrived.
//
// IT IS A CONTEXT BECAUSE THE CONTROLS ARE NOT NEIGHBOURS. The picker sits at the top of the buy
// column, the stepper inside the price chart, and the buy actions render TWICE — once inline in that
// column and once in the fixed mobile bar at the page root. `product-detail.tsx` between them is a
// server component, so there is no `useState` all four can share and no prop that reaches the fixed
// bar.
//
// THE PICKER IS REAL NOW. It used to be a module constant reading `selected` off a fixture, with a
// comment saying a buy action that claimed to follow the buyer's choice would be describing a
// control that does not exist. The control exists.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { ProductVariant } from "@/lib/store/products.schemas";

interface ProductSelection {
  // --- Variant ---
  /**
   * The variant the buy actions write against, or `null` for a product with no variants.
   *
   * `hasVariants` on the product is what decides whether `null` is legal: a product that declares it
   * refuses `PUT /commerce/cart/items/:id` with `VARIANT_REQUIRED` until one is chosen. A FLAT LIST,
   * not attribute axes — "Sea blue × Large" is one opaque variant name, deliberately (backend A26).
   */
  readonly selectedVariantId: string | null;
  readonly selectedVariant: ProductVariant | null;
  readonly selectVariant: (variantId: string) => void;
  readonly variants: readonly ProductVariant[];

  // --- Quantity ---
  /** The parsed, floored quantity. This is what a mutation sends. */
  readonly quantity: number;
  /** Kept as a string so the field can be empty mid-edit. */
  readonly quantityInputValue: string;
  readonly setQuantityInputValue: (value: string) => void;
  /**
   * THE FLOOR IS THE MINIMUM ORDER QUANTITY, NOT 1, and it follows the selected variant.
   *
   * A minimum order quantity is a commercial term the seller declared, and the server refuses
   * anything under it. The stepper starts there and cannot go below it, so the default press is a
   * quantity the seller will actually accept — the client is not enforcing the rule, it is declining
   * to offer a value it already knows is refused.
   */
  readonly minimumOrderQuantity: number;
}

const ProductSelectionContext = createContext<ProductSelection | null>(null);

export function ProductSelectionProvider({
  variants,
  productMinimumOrderQuantity,
  children,
}: {
  readonly variants: readonly ProductVariant[];
  /** `null` when the seller declared none; the floor is then 1. */
  readonly productMinimumOrderQuantity: number | null;
  readonly children: ReactNode;
}) {
  // The first variant by `position`, which is the seller's own ordering. Preselecting rather than
  // starting empty is deliberate: `hasVariants` products refuse an add without one, and an empty
  // picker makes the buy button dead on arrival with nothing saying why.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length === 0 ? null : (variants[0]?.id ?? null),
  );

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const minimumOrderQuantity =
    selectedVariant?.minimumOrderQuantity ?? productMinimumOrderQuantity ?? 1;

  // Held as typed text, not as a number pinned to the floor: retyping the field is how a buyer
  // raises the quantity, and coercing on every keystroke makes the input impossible to clear.
  const [quantityInputValue, setQuantityInputValue] = useState(String(minimumOrderQuantity));

  const value = useMemo<ProductSelection>(() => {
    const parsedQuantity = Number.parseInt(quantityInputValue, 10);
    return {
      selectedVariantId,
      selectedVariant,
      selectVariant: (variantId: string) => {
        setSelectedVariantId(variantId);
        // Re-floor to the new variant's minimum. Carrying the old number across would leave the
        // field showing a quantity the newly-chosen variant refuses.
        const nextVariant = variants.find((variant) => variant.id === variantId) ?? null;
        const nextFloor = nextVariant?.minimumOrderQuantity ?? productMinimumOrderQuantity ?? 1;
        setQuantityInputValue((currentValue) => {
          const currentQuantity = Number.parseInt(currentValue, 10);
          if (Number.isNaN(currentQuantity) || currentQuantity < nextFloor) {
            return String(nextFloor);
          }
          return currentValue;
        });
      },
      variants,
      quantity: Math.max(
        minimumOrderQuantity,
        Number.isNaN(parsedQuantity) ? minimumOrderQuantity : parsedQuantity,
      ),
      quantityInputValue,
      setQuantityInputValue,
      minimumOrderQuantity,
    };
  }, [
    quantityInputValue,
    minimumOrderQuantity,
    selectedVariantId,
    selectedVariant,
    variants,
    productMinimumOrderQuantity,
  ]);

  return <ProductSelectionContext value={value}>{children}</ProductSelectionContext>;
}

/** Throws outside the provider rather than defaulting — a silent 1 here is a wrong order quantity. */
export function useProductSelection(): ProductSelection {
  const selection = useContext(ProductSelectionContext);
  if (selection === null) {
    throw new Error("useProductSelection must be used inside a ProductSelectionProvider.");
  }
  return selection;
}
