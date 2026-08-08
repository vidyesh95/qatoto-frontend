// TRANSPORT: props-only — renders the parsed offerings, fetches nothing.
//
// The provider's active offerings. Also reused, unchanged, on the offering detail page as "other
// services from this provider".
//
// AN INDICATIVE RANGE IS NOT A QUOTE, and this component is where that rule is easiest to break.
// `pricingModel: "quote_only"` means both price ends are null — the honest render is "quoted per
// request", never a `$0`, and never one end of a range printed as though it were the price. The
// range that does exist is a range: `formatCentsRangeLabel` collapses it only when the two ends are
// genuinely equal.

import Link from "next/link";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";
import { formatCentsRangeLabel, formatLeadTimeRangeLabel } from "@/lib/store/format";
import {
  SERVICE_PRICING_MODEL_LABELS,
  type PublicOfferingCard,
} from "@/lib/store/providers.schemas";

export default function ProviderOfferingList({
  offerings,
  providerDisplayName,
}: {
  offerings: PublicOfferingCard[];
  providerDisplayName: string;
}) {
  if (offerings.length === 0) {
    return (
      <StorefrontSection
        title="Services"
        attribution="declared"
        description="What this provider has published."
      >
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
          {providerDisplayName} has no published services yet. A profile can exist before any
          offering does.
        </p>
      </StorefrontSection>
    );
  }

  return (
    <StorefrontSection
      title="Services"
      attribution="declared"
      description="Scope, indicative pricing and lead times as published by the provider."
    >
      <ul className="flex flex-col gap-3">
        {offerings.map((offering) => (
          <li key={offering.id}>
            <OfferingRow offering={offering} />
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}

function OfferingRow({ offering }: { offering: PublicOfferingCard }) {
  const priceRangeLabel = formatCentsRangeLabel(
    offering.indicativePriceMinInCents,
    offering.indicativePriceMaxInCents,
    offering.currency,
  );
  const leadTimeLabel = formatLeadTimeRangeLabel(
    offering.minimumLeadTimeDays,
    offering.maximumLeadTimeDays,
  );

  return (
    <Link
      href={`/store/services/${offering.slug}`}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <ProviderKindBadge providerKind={offering.providerKind} isCompact />

      <p className="mt-1 text-sm leading-5 font-medium text-[#191C1C]">{offering.title}</p>

      {offering.summary !== null && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#6F7979]">{offering.summary}</p>
      )}

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-4">
        {/* `quote_only` yields a null range. The label is the model's own copy, not an invented
            price — "Quoted per request" is a true statement and "$0" is not. */}
        {priceRangeLabel === null ? (
          <span className="text-[#00696E]">
            {SERVICE_PRICING_MODEL_LABELS[offering.pricingModel]}
          </span>
        ) : (
          <>
            <span className="font-medium text-[#191C1C]">{priceRangeLabel}</span>
            <span className="text-[#6F7979]">
              {SERVICE_PRICING_MODEL_LABELS[offering.pricingModel].toLowerCase()}, indicative
            </span>
          </>
        )}

        {leadTimeLabel !== null && <span className="text-[#6F7979]">{leadTimeLabel}</span>}
      </div>
    </Link>
  );
}
