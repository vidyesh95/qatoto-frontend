"use client";

// TRANSPORT: props-only — quantity preview is UX only; checkout prices are server-owned.

import { useState } from "react";
import Image from "next/image";
import PriceChartSheet from "@/components/home/store/sheets/price-chart-sheet";
import type { StorePricingTier } from "@/lib/store/catalog.schemas";
import { formatStorePriceInCents } from "@/lib/store/shared.schemas";

/**
 * The index of the tier a quantity falls into.
 *
 * A pricing tier has NO `id` on the wire — only `position`, `minimumOrderQuantity` and a
 * price — so this walks indices directly instead of matching rows by identity. It picks the
 * highest tier whose minimum the quantity clears, which is the same rule the backend prices
 * with; the answer here is still only a preview, and checkout re-prices server-side.
 */
function findActiveTierIndex(pricingTiers: readonly StorePricingTier[], quantity: number): number {
  let activeIndex = 0;
  let activeMinimum = -1;
  for (let tierIndex = 0; tierIndex < pricingTiers.length; tierIndex += 1) {
    const tier = pricingTiers[tierIndex];
    if (quantity >= tier.minimumOrderQuantity && tier.minimumOrderQuantity > activeMinimum) {
      activeMinimum = tier.minimumOrderQuantity;
      activeIndex = tierIndex;
    }
  }
  return activeIndex;
}

export default function PriceChart({
  pricingTiers,
  currency,
}: {
  pricingTiers: StorePricingTier[];
  currency: string;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [quantityInputValue, setQuantityInputValue] = useState("1");
  const quantity = Math.max(1, Number.parseInt(quantityInputValue, 10) || 1);
  const activeTierIndex = findActiveTierIndex(pricingTiers, quantity);
  const activeTier = pricingTiers[activeTierIndex];

  if (pricingTiers.length === 0 || !activeTier) return null;

  const activePriceLabel = formatStorePriceInCents(activeTier.unitPriceInCents, currency);

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
                key={tier.position}
                className={`flex flex-1 flex-col gap-1 rounded p-1 ${
                  tierIndex === activeTierIndex
                    ? "bg-[#D6E3FF]/40 outline -outline-offset-1 outline-[#2A76FD]"
                    : ""
                }`}
              >
                <span className="text-sm font-medium tracking-wide text-[#191C1C]">
                  {formatStorePriceInCents(tier.unitPriceInCents, currency)}
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

      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-[#191C1C]">Quantity</span>
          <span className="text-xs text-[#6F7979]">
            Preview: {activePriceLabel}/unit at this quantity (server confirms at checkout)
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setQuantityInputValue(String(Math.max(1, quantity - 1)))}
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
            onChange={(changeEvent) =>
              setQuantityInputValue(changeEvent.target.value.replace(/\D/g, ""))
            }
            onBlur={() => setQuantityInputValue(String(quantity))}
            aria-label="Quantity"
            className="mx-1 w-14 rounded py-1 text-center text-sm font-medium text-[#191C1C] outline -outline-offset-1 outline-[#E0E3E3] focus:outline-[#2A76FD]"
          />
          <button
            type="button"
            onClick={() => setQuantityInputValue(String(quantity + 1))}
            aria-label="Increase quantity"
            className="grid size-8 place-items-center rounded-full text-base text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
          >
            +
          </button>
        </div>
      </div>

      {isSheetOpen ? (
        <PriceChartSheet
          pricingTiers={pricingTiers}
          currency={currency}
          onClose={() => setIsSheetOpen(false)}
        />
      ) : null}
    </>
  );
}
