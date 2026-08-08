// TRANSPORT: server-fetch — awaits `listStoreProviders` and branches on the result.
//
// `/store/providers`. The connector marketplace: freight forwarders, logistics operators, customs
// brokers, cargo insurers, inspection agencies, testing labs, marketing agencies, warehousing and
// foreign exchange. Nine kinds, one directory.
//
// TWO HONESTY PROBLEMS THIS PAGE HAS TO LIVE WITH, both from the read rather than the design.
//
//  1. A ROW CANNOT SAY WHAT IT DOES. No public read projects the kinds an organization holds —
//     `commerce_provider_kind_link` is filtered on and never projected — so the kind chips filter
//     the list but a card carries no kind of its own. A buyer scanning nine rows cannot tell the
//     customs broker from the laboratory without opening each one. That is the single most useful
//     backend addition to this surface and is recorded as an ask.
//  2. `verificationState` IS PROFILE-LEVEL, NOT PER KIND. It says the organization's own documents
//     were reviewed; it does NOT say the organization is approved to broker customs. The labels
//     therefore all say "profile", and no badge on this page implies a per-kind approval.

import Image from "next/image";
import Link from "next/link";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyFilteredPanel,
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import {
  buildFilterHref,
  readEnumParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import { countryLabelFromCode, formatCountLabel, formatPercentageLabel } from "@/lib/store/format";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  PROVIDER_VERIFICATION_LABELS,
  type PublicProviderCard,
} from "@/lib/store/providers.schemas";
import { listStoreProviders } from "@/lib/store/providers.api";
import { PROVIDER_KINDS } from "@/lib/store/shared.schemas";

type ProviderDirectoryViewState =
  | { status: "error"; message: string }
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      providers: PublicProviderCard[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function ProviderDirectoryPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  // `readEnumParam` DROPS an unrecognized value rather than forwarding it, which is what keeps a
  // hand-edited `?providerKind=banana` from becoming a 422 error page against a `.strict()` schema.
  const providerKind = readEnumParam(searchParams, "providerKind", PROVIDER_KINDS);
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const result = await listStoreProviders({ providerKind, cursor: requestedCursor });
  const appliedFilterCount = providerKind === undefined ? 0 : 1;

  const viewState: ProviderDirectoryViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          providers: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  const kindOptions: FilterChipOption[] = [
    {
      label: "All services",
      href: buildFilterHref(searchParams, { providerKind: undefined }),
      isSelected: providerKind === undefined,
    },
    ...PROVIDER_KINDS.map((kind) => ({
      label: PROVIDER_KIND_LABELS[kind],
      href: buildFilterHref(searchParams, { providerKind: kind }),
      isSelected: providerKind === kind,
    })),
  ];

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
          Trade services
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Freight, customs, inspection, testing, warehousing, insurance and settlement. Engage any
          of them on their own — none requires buying a product on Qatoto.
        </p>
      </header>

      <div className="px-4 pt-4 lg:px-6">
        <FilterChipRow options={kindOptions} ariaLabel="Filter providers by service kind" />
      </div>

      {renderProviderDirectory(viewState, searchParams)}
    </div>
  );
}

function renderProviderDirectory(
  viewState: ProviderDirectoryViewState,
  searchParams: RawSearchParams,
) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          {viewState.appliedFilterCount > 0 ? (
            <StoreEmptyFilteredPanel
              appliedFilterCount={viewState.appliedFilterCount}
              clearFiltersHref="/store/providers"
            />
          ) : (
            <StoreEmptyPanel message="No trade-service providers are listed yet." />
          )}
        </div>
      );
    case "ready":
      return (
        <>
          <ul className="mt-4 space-y-3 px-4 lg:px-6">
            {viewState.providers.map((provider) => (
              <li key={provider.organizationId}>
                <ProviderRow provider={provider} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more providers"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function ProviderRow({ provider }: { provider: PublicProviderCard }) {
  const { fulfillmentMetrics, reviewMetrics } = provider;

  return (
    <Link
      href={`/store/providers/${provider.slug}`}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <div className="flex items-start gap-3">
        {provider.logoUrl === null ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-sm font-medium text-[#00696E]">
            {provider.displayName.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Image
            src={provider.logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-medium text-[#191C1C]">{provider.displayName}</p>
          <p className="text-xs leading-4 text-[#6F7979]">
            {countryLabelFromCode(provider.countryCode)}
            {provider.serviceRegionSummary !== null && ` · ${provider.serviceRegionSummary}`}
          </p>
        </div>

        {/* Not accepting requests is worth saying; accepting them is the default and is not. */}
        {!provider.acceptingRequests && (
          <span className="shrink-0 rounded bg-[#F2F4F4] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#6F7979]">
            Not taking requests
          </span>
        )}
      </div>

      {provider.publicSummary !== null && (
        <p className="mt-2 line-clamp-2 text-xs leading-4 text-[#6F7979]">
          {provider.publicSummary}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4">
        {/* "Profile verified", never a bare tick. The per-kind approval is a different fact and
            does not reach this read at all. */}
        <span className="text-[#00696E]">
          {PROVIDER_VERIFICATION_LABELS[provider.verificationState]}
        </span>

        {reviewMetrics.averageRating !== null && (
          <span className="text-[#191C1C]">
            {reviewMetrics.averageRating.toFixed(1)} ★ (
            {formatCountLabel(reviewMetrics.reviewCount)})
          </span>
        )}

        {/* A rate of `null` means BELOW THE SAMPLE THRESHOLD, so the sample size is stated instead
            of a percentage. Printing 0% here would publish a failure the provider never earned,
            and printing nothing at all would hide that they have completed work. */}
        {fulfillmentMetrics.onTimeShipmentRate === null ? (
          fulfillmentMetrics.completedOrderCount > 0 && (
            <span className="text-[#6F7979]">
              {formatCountLabel(fulfillmentMetrics.completedOrderCount)} completed · not enough data
              for an on-time rate
            </span>
          )
        ) : (
          <span className="text-[#6F7979]">
            {formatPercentageLabel(fulfillmentMetrics.onTimeShipmentRate)} on time across{" "}
            {formatCountLabel(fulfillmentMetrics.onTimeSampleSize)} orders
          </span>
        )}

        {/* Self-reported, and labelled as such in the copy rather than in a tooltip. The measured
            median lives on the detail read under `measuredMetrics`. */}
        {provider.declaredResponseTimeHours !== null && (
          <span className="text-[#6F7979]">
            replies in ≤ {provider.declaredResponseTimeHours} h, self-reported
          </span>
        )}
      </div>
    </Link>
  );
}
