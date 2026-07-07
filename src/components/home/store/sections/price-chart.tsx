"use client";

import { useState } from "react";

import Image from "next/image";

import PriceChartSheet from "@/components/home/store/sheets/price-chart-sheet";
import type { ProductPricingTier } from "@/types/store";

// Price chart block on the product page. Shows a compact tier preview; tapping
// the header "more" chevron opens the detailed price-chart bottom sheet. A
// quantity stepper below highlights the tier the chosen quantity falls in.
// UI-only mock — real pricing comes from the backend later; the client never
// owns it.

// Upper quantity bound per tier, aligned by index with `pricingTiers`. The
// backend will send numeric bounds alongside each tier later.
const TIER_UPPER_QUANTITY_LIMITS = [49, 499, Number.POSITIVE_INFINITY];

export default function PriceChart({ pricingTiers }: { pricingTiers: ProductPricingTier[] }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Kept as a string so the field can be empty mid-edit; the parsed number
  // below (floored at 1) is what drives the tier highlight and helper price.
  const [quantityInputValue, setQuantityInputValue] = useState("1");
  const quantity = Math.max(1, Number.parseInt(quantityInputValue, 10) || 1);

  const activeTierIndex = TIER_UPPER_QUANTITY_LIMITS.findIndex((limit) => quantity <= limit);

  const handleDecreaseQuantityClick = () =>
    setQuantityInputValue(String(Math.max(1, quantity - 1)));
  const handleIncreaseQuantityClick = () => setQuantityInputValue(String(quantity + 1));

  const handleQuantityInputChange = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityInputValue(changeEvent.target.value.replace(/\D/g, ""));
  };

  const handleQuantityInputBlur = () => setQuantityInputValue(String(quantity));

  return (
    <>
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
                  {tier.unitPrice}
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

      {/* Quantity stepper — sibling of the sheet-opening button above (a
          button cannot nest inside a button) */}
      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-[#191C1C]">Quantity</span>
          <span className="text-xs text-[#6F7979]">
            Price: {pricingTiers[activeTierIndex].unitPrice}/set at this quantity
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleDecreaseQuantityClick}
            disabled={quantity <= 1}
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
        <PriceChartSheet pricingTiers={pricingTiers} onClose={() => setIsSheetOpen(false)} />
      )}
    </>
  );
}
