"use client";

import { useState } from "react";

import Image from "next/image";

import PriceChartSheet from "@/components/home/store/sheets/price-chart-sheet";

// Price chart block on the product page. Shows a compact tier preview; tapping
// the header "more" chevron opens the detailed price-chart bottom sheet. UI-only
// mock — real pricing comes from the backend later; the client never owns it.

export type ProductPricingTier = {
  unitPrice: string;
  minimumOrderQuantity: string;
};

export default function PriceChart({ pricingTiers }: { pricingTiers: ProductPricingTier[] }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
            {pricingTiers.map((tier) => (
              <span
                key={tier.minimumOrderQuantity}
                className="flex flex-1 flex-col gap-1 rounded p-1"
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

      {isSheetOpen && (
        <PriceChartSheet pricingTiers={pricingTiers} onClose={() => setIsSheetOpen(false)} />
      )}
    </>
  );
}
