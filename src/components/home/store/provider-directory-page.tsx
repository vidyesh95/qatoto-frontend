// TRANSPORT: server-fetch — awaits `listStoreProviders` and branches on the result.
//
// `/store/providers`. The connector marketplace: freight forwarders, logistics operators, customs
// brokers, cargo insurers, inspection agencies, testing labs, marketing agencies, warehousing and
// foreign exchange. Nine kinds, one directory.
//
// THE TWO HONESTY PROBLEMS THIS PAGE USED TO HAVE, both now fixed rather than lived with.
//
//  1. A ROW COULD NOT SAY WHAT IT DID. No public read projected the kinds an organization holds —
//     `commerce_provider_kind_link` was filtered on and never projected — so the kind chips
//     filtered the list but a card carried no kind of its own. A buyer could narrow to customs
//     brokers and then read a page of cards that did not say "customs broker", which looks broken
//     rather than absent. `PublicProviderCard.providerKinds` closed it, and it shipped WITH the
//     filters below rather than after them, deliberately.
//  2. `verificationState` IS PROFILE-LEVEL, NOT PER KIND — and this one is not "fixed", it is
//     SPLIT. The card carries both facts now, so the risk changed from omission to conflation:
//     `provider.verificationState` says the organization's own documents were reviewed,
//     `providerKinds[].verificationState` says Qatoto approved them to operate as that kind. They
//     get two label maps, `PROVIDER_VERIFICATION_LABELS` (every string says "Profile") and
//     `PROVIDER_KIND_VERIFICATION_LABELS` (no string says "profile"), so rendering one as the
//     other is a visible edit rather than a one-character mistake. NEITHER implies a regulator's
//     licence — a customs broker's actual licence is issued by a customs authority.
//
// THE FILTERS ARE FACET-DRIVEN, NOT ENUM-DRIVEN. The kind row used to render all nine
// `PROVIDER_KINDS` regardless of whether any organization held them; with one provider seeded that
// is eight chips that return an empty page. `catalog.schemas.ts`'s rule governs here too — a bucket
// absent is not a bucket at zero — so every chip below comes from the backend's facet counts and
// every one of them returns at least one row.

import Image from "next/image";
import Link from "next/link";

import FacetChipRow from "@/components/home/shared/facet-chip-row";
import FilterChipRow from "@/components/home/shared/filter-chip-row";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyFilteredPanel,
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import {
  buildFilterHref,
  readEnumParam,
  readPatternParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import { countryLabelFromCode, formatCountLabel, formatPercentageLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS, PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  PROVIDER_KIND_VERIFICATION_LABELS,
  PROVIDER_VERIFICATION_LABELS,
  type ProviderDirectoryFacets,
  type PublicProviderCard,
} from "@/lib/store/providers.schemas";
import { listStoreProviders } from "@/lib/store/providers.api";
import { FREIGHT_TRANSPORT_MODES, PROVIDER_KINDS } from "@/lib/store/shared.schemas";

// MIRRORS THE BACKEND'S OWN `.regex()`, character for character. A looser pattern here lets a 422
// through; a tighter one silently drops a value the server would have taken. Neither is caught by a
// type, so they are written next to each other and cited: `ProvidersQuerySchema` in
// `store.schemas.ts`.
const ISO_COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_PAIR = /^[A-Z]{3}\/[A-Z]{3}$/;

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
  // TWO GUARDS, ONE REASON. `ProvidersQuerySchema` is `.strict()` with `z.enum()` and `.regex()`
  // values, so a hand-edited URL is a 422 that BLANKS THE WHOLE PAGE rather than an ignored param.
  // `readEnumParam` drops a value outside the enum; `readPatternParam` drops one outside the
  // backend's own regex. An unknown filter value means "no filter", never "match nothing".
  //
  // The three free-text keys go through `readSingleParam` unguarded, and that is correct rather
  // than an oversight — the backend accepts them as free text, so there is no shape to check.
  const providerKind = readEnumParam(searchParams, "providerKind", PROVIDER_KINDS);
  const transportMode = readEnumParam(searchParams, "transportMode", FREIGHT_TRANSPORT_MODES);
  const originCountryCode = readPatternParam(searchParams, "originCountryCode", ISO_COUNTRY_CODE);
  const destinationCountryCode = readPatternParam(
    searchParams,
    "destinationCountryCode",
    ISO_COUNTRY_CODE,
  );
  const currencyPair = readPatternParam(searchParams, "currencyPair", CURRENCY_PAIR);
  const jurisdiction = readSingleParam(searchParams, "jurisdiction");
  const standard = readSingleParam(searchParams, "standard");
  const storageType = readSingleParam(searchParams, "storageType");
  // ABSENT IS "NO FILTER", NOT "FALSE". Only `?acceptingRequests=true` narrows; anything else —
  // including a hand-typed `false` — leaves both states in the page, because a buyer may well want
  // to see a provider who has paused intake.
  const isAcceptingRequestsOnly = readSingleParam(searchParams, "acceptingRequests") === "true";
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const appliedFilters = {
    providerKind,
    transportMode,
    originCountryCode,
    destinationCountryCode,
    currencyPair,
    jurisdiction,
    standard,
    storageType,
    acceptingRequests: isAcceptingRequestsOnly ? true : undefined,
  };

  const result = await listStoreProviders({ ...appliedFilters, cursor: requestedCursor });

  // COUNTED FROM THE PARSED VALUES, not from `searchParams`. A dropped `?providerKind=banana` is
  // not an applied filter, and counting it would tell a visitor "no results for your 1 filter"
  // about a filter that was never sent.
  const appliedFilterCount = Object.values(appliedFilters).filter(
    (value) => value !== undefined,
  ).length;

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

  // THE FACETS SURVIVE AN EMPTY PAGE, and that is the point of keeping them out of the view state:
  // a buyer who has narrowed to nothing needs the chips MOST, because they are the way back. They
  // are `null` only when the read itself failed, where there is nothing to offer.
  const facets: ProviderDirectoryFacets | null = result.success ? result.data.facets : null;

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

      {facets !== null && (
        <div className="flex flex-col gap-2 px-4 pt-4 lg:px-6">
          <FacetChipRow
            searchParams={searchParams}
            queryKey="providerKind"
            ariaLabel="Filter providers by service kind"
            buckets={facets.providerKinds}
            labelsByEnumValue={PROVIDER_KIND_LABELS}
          />
          <FacetChipRow
            searchParams={searchParams}
            queryKey="transportMode"
            ariaLabel="Filter providers by transport mode"
            buckets={facets.transportModes}
            labelsByEnumValue={FREIGHT_TRANSPORT_MODE_LABELS}
          />
          <FacetChipRow
            searchParams={searchParams}
            queryKey="originCountryCode"
            ariaLabel="Filter providers by origin country"
            buckets={facets.originCountryCodes}
            formatValue={countryLabelFromCode}
          />
          <FacetChipRow
            searchParams={searchParams}
            queryKey="destinationCountryCode"
            ariaLabel="Filter providers by destination country"
            buckets={facets.destinationCountryCodes}
            formatValue={countryLabelFromCode}
          />
          {/*
            NOT A FACET, so it carries no count — it is a two-state toggle, and "Taking requests ·
            12" beside a directory of 13 says nothing a buyer can act on. It is also NOT part of
            `FacetChipRow`, whose contract is a backend bucket list.

            `cursor: undefined` is unnecessary here — `buildFilterHref` already drops a cursor the
            patch does not mention — and is omitted rather than written defensively, so the rule
            lives in exactly one place.
          */}
          <FilterChipRow
            options={[
              {
                label: "Any availability",
                href: buildFilterHref(searchParams, { acceptingRequests: undefined }),
                isSelected: !isAcceptingRequestsOnly,
              },
              {
                label: "Taking requests",
                href: buildFilterHref(searchParams, { acceptingRequests: "true" }),
                isSelected: isAcceptingRequestsOnly,
              },
            ]}
            ariaLabel="Filter providers by whether they are taking requests"
          />
        </div>
      )}

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

          {/*
            WHAT THIS ORGANIZATION ACTUALLY IS — the single addition that makes the filters above
            worth having. Before it, narrowing to customs brokers returned cards that did not say
            "customs broker".

            The `title` carries the PER-KIND verification state and nothing else does: putting it in
            the visible chip would sit it inches from the profile-level line below, where the two
            read as one claim. An empty array renders nothing rather than "Unknown" — a provider
            with no eligible kind link is not a provider of an unknown kind.
          */}
          {provider.providerKinds.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1">
              {provider.providerKinds.map((providerKind) => (
                <li
                  key={providerKind.kind}
                  title={PROVIDER_KIND_VERIFICATION_LABELS[providerKind.verificationState]}
                  className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]"
                >
                  {PROVIDER_KIND_LABELS[providerKind.kind]}
                </li>
              ))}
            </ul>
          )}
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
