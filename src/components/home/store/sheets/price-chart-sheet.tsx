"use client";

import { useEffect } from "react";

import Image from "next/image";

import type { ProductPricingTier } from "@/components/home/store/sections/price-chart";

// Detailed price-chart bottom sheet for the product page (UI-only phase, no
// fetch). The inline price chart shows a compact preview; tapping "more" opens
// this sheet with the full tier breakdown — quantity range, unit price, and the
// per-set saving versus the single-unit price. All values are mock; the backend
// owns real pricing later and the client never computes or trusts prices.

export default function PriceChartSheet({
  pricingTiers,
  onClose,
}: {
  pricingTiers: ProductPricingTier[];
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close price chart"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Price chart"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Price chart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <p className="shrink-0 px-4 pb-2 text-xs text-[#6F7979]">
          Unit price drops as your order quantity grows. Prices exclude shipping and customization.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {/* Column headers */}
          <div className="flex items-center border-b border-[#CAC4D0] py-2 text-xs font-medium tracking-wide text-[#6F7979]">
            <span className="flex-1">Order quantity</span>
            <span className="w-24 text-right">Unit price</span>
          </div>

          {pricingTiers.map((tier) => (
            <div
              key={tier.minimumOrderQuantity}
              className="flex items-center border-b border-[#CAC4D0]/60 py-3"
            >
              <span className="flex-1 text-sm tracking-wide text-[#191C1C]">
                {tier.minimumOrderQuantity}
              </span>
              <span className="w-24 text-right text-sm font-medium tracking-wide text-[#191C1C]">
                {tier.unitPrice}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
