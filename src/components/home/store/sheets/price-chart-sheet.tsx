// TRANSPORT: props-only — renders the tiers it was handed, no network.
"use client";

import StoreSheet from "@/components/home/store/shared/store-sheet";
import type { ProductPricingTier } from "@/types/store";

// The full tier breakdown. The inline price chart shows a compact preview; "more" opens this.
//
// Still reading `ProductPricingTier` from `@/types/store`, whose `unitPrice` and
// `minimumOrderQuantity` are DISPLAY STRINGS. The wire carries
// `{unitPriceInCents, minimumOrderQuantity: number, position}` and this sheet will read that
// directly when the PDP is wired — at which point `@/types/store` goes away. A string price
// cannot be compared, so nothing here does arithmetic on one.

export default function PriceChartSheet({
  pricingTiers,
  onClose,
}: {
  pricingTiers: ProductPricingTier[];
  onClose: () => void;
}) {
  return (
    <StoreSheet title="Price chart" onClose={onClose}>
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        Unit price drops as your order quantity grows. Prices exclude shipping and customization.
      </p>

      <div className="px-4 pb-6">
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
    </StoreSheet>
  );
}
