// TRANSPORT: server-fetch — awaits `getStoreServiceOffering` and branches on the result.
//
// `/store/services/[offeringSlug]`. One connector offering: its scope, its typed extension, the
// lanes it covers, and the provider behind it.
//
// THE TWO CTAs ARE DELIBERATELY DIFFERENT FROM A PRODUCT'S.
//
// "Request a quote" starts a SERVICE RFQ — connector work is quoted, not priced, and even an
// offering with an indicative range is quoted before it is booked. "Add to order" would create an
// explicit draft linkage and must NOT silently alter the product cart: `commerce_order_service_link`
// exists precisely so an engagement can attach to an order, a line or a shipment — or to nothing at
// all, because a company may buy lab testing or marketing without buying a product on Qatoto.
//
// Both are inert here. `POST /commerce/rfqs` exists and takes service lines, but an RFQ needs a
// buyer organization, which is the auto-provisioning decision Batch D lands.

import { notFound } from "next/navigation";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import StorefrontSection, {
  StorefrontDivider,
} from "@/components/home/store/sections/organization/storefront-section";
import ServiceCoverageList from "@/components/home/store/sections/service-coverage-list";
import ServiceOfferingDetailPanel from "@/components/home/store/sections/service-offering-detail-panel";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import Link from "next/link";
import {
  countryLabelFromCode,
  formatCentsRangeLabel,
  formatLeadTimeRangeLabel,
} from "@/lib/store/format";
import { getStoreServiceOffering } from "@/lib/store/providers.api";
import {
  SERVICE_PRICING_MODEL_LABELS,
  type PublicServiceOffering,
} from "@/lib/store/providers.schemas";

type ServiceOfferingViewState =
  | { status: "error"; message: string }
  | { status: "ready"; offering: PublicServiceOffering };

export default async function ServiceOfferingPage({ offeringSlug }: { offeringSlug: string }) {
  const result = await getStoreServiceOffering(offeringSlug);

  // A draft, pending, suspended or retired offering is a 404 — identical to one that never
  // existed. Never render a "withdrawn" state from it: the codes are the same on purpose.
  if (!result.success && result.error.code === "404") notFound();

  const viewState: ServiceOfferingViewState = result.success
    ? { status: "ready", offering: result.data }
    : { status: "error", message: result.error.message };

  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 py-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { offering, provider, detail, coverage } = viewState.offering;

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
        <div className="pb-10">
          <header className="px-4 pt-4 lg:px-6">
            <ProviderKindBadge providerKind={offering.providerKind} />

            <h1 className="mt-2 font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
              {offering.title}
            </h1>

            <Link
              href={`/store/providers/${provider.slug}`}
              className="mt-1 inline-block text-xs font-medium text-[#2A76FD]"
            >
              {provider.displayName} · {countryLabelFromCode(provider.countryCode)}
            </Link>

            {offering.summary !== null && (
              <p className="mt-2 text-sm leading-5 text-[#191C1C]">{offering.summary}</p>
            )}

            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              {priceRangeLabel === null ? (
                <span className="font-medium text-[#00696E]">
                  {SERVICE_PRICING_MODEL_LABELS[offering.pricingModel]}
                </span>
              ) : (
                <>
                  <span className="font-medium text-[#191C1C]">{priceRangeLabel}</span>
                  <span className="text-xs text-[#6F7979]">
                    {SERVICE_PRICING_MODEL_LABELS[offering.pricingModel].toLowerCase()}, indicative
                    only
                  </span>
                </>
              )}
              {leadTimeLabel !== null && (
                <span className="text-xs text-[#6F7979]">{leadTimeLabel}</span>
              )}
            </div>

            {/* Said once, plainly, and not repeated as a badge beside every number above. An
                indicative range is what the provider publishes; what a buyer pays comes from a
                quote against their actual shipment. */}
            <p className="mt-2 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
              Published figures are indicative. A price and a lead time for your shipment come from
              a quote.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-[#00696E] px-5 py-2 text-sm font-medium text-white"
              >
                Request a quote
              </button>
              <button
                type="button"
                className="rounded-full bg-background px-5 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
              >
                Add to an order
              </button>
            </div>
          </header>

          <StorefrontDivider />

          <StorefrontSection
            title="Scope"
            attribution="declared"
            description={`What ${provider.displayName} says this service covers.`}
          >
            <ServiceOfferingDetailPanel detail={detail} />
          </StorefrontSection>

          <StorefrontDivider />

          <ServiceCoverageList coverage={coverage} />

          {/* NO "other services from this provider" SECTION, and the reason is worth stating so
              nobody adds one with an empty array. `GET /store/services/:offeringSlug` returns
              `{offering, provider, detail, coverage}` and carries NO sibling offerings — the
              provider's other services are only on `GET /store/providers/:organizationSlug`.
              Rendering `ProviderOfferingList` with `[]` here would print "has no published services
              yet" on a page that is itself one of that provider's published services. A link is the
              honest control; a second fetch would be the alternative if the section earns it. */}
          <div className="px-4 pt-4 lg:px-6">
            <Link
              href={`/store/providers/${provider.slug}`}
              className="text-sm font-medium text-[#00696E] underline"
            >
              See everything {provider.displayName} offers
            </Link>
          </div>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
