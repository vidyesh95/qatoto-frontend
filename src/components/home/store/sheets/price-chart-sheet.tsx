// TRANSPORT: props-only — renders the tiers it was handed, no network.
"use client";

import StoreSheet from "@/components/home/store/shared/store-sheet";
import { formatCentsLabel } from "@/lib/store/format";
import type { ProductPricingTier } from "@/lib/store/products.schemas";

// The full tier breakdown. The inline price chart shows a compact preview; "more" opens this.
//
// `leadTimeDays` IS THE BAND'S OWN PROMISE, and it belongs here rather than only on the delivery
// row. A tier can carry a longer lead time than the product's headline — that is usually the
// TRADE-OFF the discount is for — and a buyer choosing a quantity is choosing that lead time with
// it. `null` means the band declared none and the product's range applies, so it renders blank
// rather than as a zero-day promise.

export default function PriceChartSheet({
  pricingTiers,
  currency,
  onClose,
}: {
  readonly pricingTiers: readonly ProductPricingTier[];
  readonly currency: string;
  readonly onClose: () => void;
}) {
  const hasAnyLeadTime = pricingTiers.some((tier) => tier.leadTimeDays !== null);

  return (
    <StoreSheet title="Price chart" onClose={onClose}>
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        Unit price drops as your order quantity grows. Prices exclude shipping and customization.
      </p>

      <div className="px-4 pb-6">
        <div className="flex items-center border-b border-[#CAC4D0] py-2 text-xs font-medium tracking-wide text-[#6F7979]">
          <span className="flex-1">Order quantity</span>
          {hasAnyLeadTime && <span className="w-24 text-right">Lead time</span>}
          <span className="w-24 text-right">Unit price</span>
        </div>

        {pricingTiers.map((tier) => (
          <div
            key={tier.minimumOrderQuantity}
            className="flex items-center border-b border-[#CAC4D0]/60 py-3"
          >
            <span className="flex-1 text-sm tracking-wide text-[#191C1C]">
              {tier.minimumOrderQuantity}+
            </span>
            {hasAnyLeadTime && (
              <span className="w-24 text-right text-xs tracking-wide text-[#6F7979]">
                {tier.leadTimeDays === null ? "" : `${tier.leadTimeDays} days`}
              </span>
            )}
            <span className="w-24 text-right text-sm font-medium tracking-wide text-[#191C1C]">
              {formatCentsLabel(tier.unitPriceInCents, currency)}
            </span>
          </div>
        ))}
      </div>
    </StoreSheet>
  );
}
