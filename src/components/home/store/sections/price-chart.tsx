// TRANSPORT: props-only — renders the tiers it is handed; the stepper writes to shared client state.
"use client";

// Price chart block on the product page. Shows a compact tier preview; tapping the header "more"
// chevron opens the detailed price-chart bottom sheet. A quantity stepper below highlights the tier
// the chosen quantity falls in.
//
// THE BANDS ARE DERIVED FROM THE TIERS, NOT FROM A PARALLEL ARRAY. This used to carry a module
// constant `TIER_UPPER_QUANTITY_LIMITS = [49, 499, Infinity]` aligned by INDEX with the tiers — so a
// seller publishing four bands, or three bands breaking at different quantities, got the wrong row
// highlighted and no error anywhere. A tier's `minimumOrderQuantity` is the LOWER bound of its band,
// the bands are ordered, and the active one is simply the last whose bound the quantity has reached.
//
// THE TIERS FOLLOW THE SELECTED VARIANT. A variant carries its own ladder; when it has one, that is
// the ladder the buyer will be priced from, so showing the product's would misquote the selection.

import { useState } from "react";

import Image from "next/image";

import PriceChartSheet from "@/components/home/store/sheets/price-chart-sheet";
import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { formatCentsLabel } from "@/lib/store/format";
import type { ProductPricingTier } from "@/lib/store/products.schemas";

/**
 * The band a quantity is priced from: the LAST tier whose minimum the quantity has reached.
 *
 * Returns `-1` for an empty ladder or a quantity below the first band, which the caller renders as
 * "no tier highlighted" rather than guessing at row zero.
 */
function findActiveTierIndex(
  pricingTiers: readonly ProductPricingTier[],
  quantity: number,
): number {
  let activeTierIndex = -1;
  for (const [tierIndex, tier] of pricingTiers.entries()) {
    if (quantity >= tier.minimumOrderQuantity) activeTierIndex = tierIndex;
  }
  return activeTierIndex;
}

export default function PriceChart({
  productPricingTiers,
  currency,
}: {
  readonly productPricingTiers: readonly ProductPricingTier[];
  readonly currency: string;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // The quantity is SHARED, not local. The buy actions send it, and they render outside this
  // component — see `product-selection-context.tsx` for why that cannot be a prop.
  const {
    quantity,
    quantityInputValue,
    setQuantityInputValue,
    minimumOrderQuantity,
    selectedVariant,
  } = useProductSelection();

  const pricingTiers =
    selectedVariant !== null && selectedVariant.pricingTiers.length > 0
      ? selectedVariant.pricingTiers
      : productPricingTiers;

  const activeTierIndex = findActiveTierIndex(pricingTiers, quantity);
  const activeTier = activeTierIndex === -1 ? null : (pricingTiers[activeTierIndex] ?? null);

  const handleDecreaseQuantityClick = () =>
    setQuantityInputValue(String(Math.max(minimumOrderQuantity, quantity - 1)));
  const handleIncreaseQuantityClick = () => setQuantityInputValue(String(quantity + 1));

  const handleQuantityInputChange = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityInputValue(changeEvent.target.value.replace(/\D/g, ""));
  };

  const handleQuantityInputBlur = () => setQuantityInputValue(String(quantity));

  return (
    <>
      {/* A seller who published no ladder has one price, already on the page. Rendering an empty
          chart would invite the buyer to look for a bulk discount that does not exist. */}
      {pricingTiers.length > 0 && (
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="flex w-full flex-col py-2 text-left"
        >
          <span className="flex w-full items-center px-4 py-1 lg:px-6">
            <span className="flex-1 text-sm">Price chart</span>
            <Image
              src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={24}
              height={24}
              alt="more"
            />
          </span>

          <span className="block px-4 lg:px-6">
            <span className="block border-t border-[#CAC4D0]" />
            <span className="flex">
              {pricingTiers.map((tier, tierIndex) => (
                <span
                  key={tier.minimumOrderQuantity}
                  className={`flex flex-1 flex-col gap-1 rounded p-1 ${
                    tierIndex === activeTierIndex
                      ? "bg-[#D6E3FF]/40 outline -outline-offset-1 outline-[#2A76FD]"
                      : ""
                  }`}
                >
                  <span className="text-sm font-medium tracking-wide text-[#191C1C]">
                    {formatCentsLabel(tier.unitPriceInCents, currency)}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs leading-4 font-medium tracking-wide text-[#191C1C]">
                      Min. order:
                    </span>
                    <span className="text-xs leading-4 font-medium tracking-wide text-[#191C1C]">
                      {tier.minimumOrderQuantity}
                    </span>
                  </span>
                </span>
              ))}
            </span>
            <span className="block border-t border-[#CAC4D0]" />
          </span>
        </button>
      )}

      {/* Quantity stepper — sibling of the sheet-opening button above (a button cannot nest inside a
          button) */}
      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-[#191C1C]">Quantity</span>
          {activeTier !== null && (
            <span className="text-xs text-[#6F7979]">
              Price: {formatCentsLabel(activeTier.unitPriceInCents, currency)} per unit at this
              quantity
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleDecreaseQuantityClick}
            // Floored at the seller's minimum order quantity, not at 1: below it the server refuses
            // the line outright, so offering the value would be offering a refusal.
            disabled={quantity <= minimumOrderQuantity}
            aria-label="Decrease quantity"
            className="grid size-8 place-items-center rounded-full text-base text-[#00696E] outline -outline-offset-1 outline-[#6F7979] disabled:opacity-40"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={quantityInputValue}
            onChange={handleQuantityInputChange}
            onBlur={handleQuantityInputBlur}
            aria-label="Quantity"
            className="mx-1 w-14 rounded py-1 text-center text-sm font-medium text-[#191C1C] outline -outline-offset-1 outline-[#E0E3E3] focus:outline-[#2A76FD]"
          />
          <button
            type="button"
            onClick={handleIncreaseQuantityClick}
            aria-label="Increase quantity"
            className="grid size-8 place-items-center rounded-full text-base text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
          >
            +
          </button>
        </div>
      </div>

      {isSheetOpen && (
        <PriceChartSheet
          pricingTiers={pricingTiers}
          currency={currency}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </>
  );
}
