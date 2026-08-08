// TRANSPORT: props-only

import type { PublicOfferingCard, PublicProviderCard } from "@/lib/store/catalog.schemas";
import { providerKindLabel, servicePricingModelLabel } from "@/lib/store/labels";
import { formatLeadTimeDays, formatStorePriceRange } from "@/lib/store/shared.schemas";

/**
 * A service-offering tile, as it appears inside a rail or a pathway.
 *
 * NOT a link, for the same reason as `ProviderCard`: `/store/services/[offeringSlug]` is a
 * shipped backend route with no frontend page yet (STORE_STRUCTURE §3.1).
 *
 * The price is an INDICATIVE range and is rendered as one. A `quote_only` offering has no
 * range at all, and `formatStorePriceRange` returns null there rather than printing a dash
 * that would read as "free" or "unknown".
 */
export default function OfferingCard({
  offering,
  provider,
}: {
  offering: PublicOfferingCard;
  provider: PublicProviderCard;
}) {
  const priceRangeLabel = formatStorePriceRange(
    offering.indicativePriceMinInCents,
    offering.indicativePriceMaxInCents,
    offering.currency,
  );
  const leadTimeLabel = formatLeadTimeDays(
    offering.minimumLeadTimeDays,
    offering.maximumLeadTimeDays,
  );

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-[#E0E3E3] p-3 sm:w-64">
      <p className="text-[11px] font-medium tracking-wide text-[#00696E]">
        {providerKindLabel(offering.providerKind)}
      </p>
      <p className="line-clamp-2 text-sm font-semibold">{offering.title}</p>
      <p className="truncate text-xs text-foreground/60">{provider.displayName}</p>
      {offering.summary ? (
        <p className="line-clamp-2 text-xs text-foreground/70">{offering.summary}</p>
      ) : null}
      <div className="mt-auto space-y-0.5 pt-1">
        <p className="text-xs font-medium">
          {priceRangeLabel ?? servicePricingModelLabel(offering.pricingModel)}
        </p>
        {leadTimeLabel ? (
          <p className="text-[11px] text-foreground/55">Lead time {leadTimeLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
