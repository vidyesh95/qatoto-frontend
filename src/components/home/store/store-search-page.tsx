// TRANSPORT: server-fetch — awaits `searchStore` and branches on the result.
//
// `/store/search`. The store had no search page at all; the navbar's search goes to
// `/search`, which searches VIDEOS.
//
// EVERY FILTER IS IN THE URL AND EVERY FILTER IS THE BACKEND'S. The chips are links that
// rewrite the query string, this server component re-reads `searchParams`, and the backend
// filters in SQL. Nothing is filtered, sorted or sliced here — a client-side filter over one
// keyset page silently misreports every page after the first, which is why `filter-href.ts`
// exists and why these rows are not client islands.
//
// THE CHIP SET IS EXACTLY `SearchQuerySchema`, AND THAT IS SHORTER THAN THE DOC ASKS FOR.
// STORE_STRUCTURE §7.3 lists eleven filters. The backend accepts `query`, `category`,
// `sellerCountryCode`, `providerKind`, `documentKind`, `minOrderQuantityMax` and `sort`.
// Price range, lead-time range, condition and verification state DO NOT EXIST as query
// keys, and because that schema is `.strict()` sending one is a **422** rather than an
// ignored param. So they are not chips. Filed as a backend ask (Appendix A25); a control
// that errors is worse than a control that is absent.
//
// Two of the accepted keys are also not chips, for a different reason: `sellerCountryCode`
// and `category` need a VOCABULARY to render options from, and the search response carries
// no facets. They are honoured when present in the URL — a link from a category page can set
// them — but this page cannot offer a picker it has no list for. Inventing one from the
// current page's hits would offer whichever countries happened to appear in the top 24.

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
import { searchStore } from "@/lib/store/catalog.api";
import {
  SEARCH_DOCUMENT_KIND_LABELS,
  SEARCH_DOCUMENT_KINDS,
  SEARCH_SORT_LABELS,
  SEARCH_SORTS,
  type StoreSearchHit,
} from "@/lib/store/catalog.schemas";
import { countryLabelFromCode, formatCentsLabel, formatCountLabel } from "@/lib/store/format";
import { PROVIDER_KIND_ICONS, PROVIDER_KIND_LABELS } from "@/lib/store/labels";

type SearchViewState =
  | { status: "error"; message: string; isSignInRequired: boolean }
  | { status: "empty"; appliedFilterCount: number }
  | { status: "ready"; hits: StoreSearchHit[]; nextCursor: string | null; hasMore: boolean };

export default async function StoreSearchPage({ searchParams }: { searchParams: RawSearchParams }) {
  const searchQuery = readSingleParam(searchParams, "query");
  const documentKind = readEnumParam(searchParams, "documentKind", SEARCH_DOCUMENT_KINDS);
  const sort = readEnumParam(searchParams, "sort", SEARCH_SORTS);
  const category = readSingleParam(searchParams, "category");
  const sellerCountryCode = readSingleParam(searchParams, "sellerCountryCode");
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const result = await searchStore({
    query: searchQuery,
    documentKind,
    sort,
    category,
    sellerCountryCode,
    cursor: requestedCursor,
  });

  // The cursor is not a filter — it is a position. Counting it would tell a visitor on page
  // two that they have three filters applied when they have two.
  const appliedFilterCount = [searchQuery, documentKind, sort, category, sellerCountryCode].filter(
    (appliedValue) => appliedValue !== undefined,
  ).length;

  const viewState: SearchViewState = !result.success
    ? {
        status: "error",
        message: result.error.message,
        isSignInRequired: result.error.code === "401",
      }
    : result.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          hits: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
          {searchQuery === undefined ? "Search the store" : `Results for “${searchQuery}”`}
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Products and trade services, ranked by the backend.
        </p>
      </header>

      <SearchFilters searchParams={searchParams} appliedFilterCount={appliedFilterCount} />

      {renderSearchResults(viewState, searchParams)}
    </div>
  );
}

function SearchFilters({
  searchParams,
  appliedFilterCount,
}: {
  searchParams: RawSearchParams;
  appliedFilterCount: number;
}) {
  const activeDocumentKind = readEnumParam(searchParams, "documentKind", SEARCH_DOCUMENT_KINDS);
  const activeSort = readEnumParam(searchParams, "sort", SEARCH_SORTS);

  // `undefined` in a patch REMOVES the key — that is how a chip clears itself, and it is why
  // "All" is the same control as the others rather than a special case.
  const documentKindOptions: FilterChipOption[] = [
    {
      label: "All results",
      href: buildFilterHref(searchParams, { documentKind: undefined }),
      isSelected: activeDocumentKind === undefined,
    },
    ...SEARCH_DOCUMENT_KINDS.map((kind) => ({
      label: SEARCH_DOCUMENT_KIND_LABELS[kind],
      href: buildFilterHref(searchParams, { documentKind: kind }),
      isSelected: activeDocumentKind === kind,
    })),
  ];

  const sortOptions: FilterChipOption[] = SEARCH_SORTS.map((sortValue) => ({
    label: SEARCH_SORT_LABELS[sortValue],
    href: buildFilterHref(searchParams, { sort: sortValue }),
    // `relevance` is the backend's own default, so no `?sort=` reads as relevance selected.
    isSelected: activeSort === sortValue || (activeSort === undefined && sortValue === "relevance"),
  }));

  return (
    <div className="space-y-2 px-4 pt-4 lg:px-6">
      <FilterChipRow options={documentKindOptions} ariaLabel="Filter by result type" />
      <FilterChipRow options={sortOptions} ariaLabel="Sort results" />
      {appliedFilterCount > 0 && (
        <Link
          href="/store/search"
          className="inline-block text-xs leading-4 text-[#00696E] underline"
        >
          Clear all filters
        </Link>
      )}
    </div>
  );
}

function renderSearchResults(viewState: SearchViewState, searchParams: RawSearchParams) {
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
              clearFiltersHref="/store/search"
            />
          ) : (
            <StoreEmptyPanel message="Search for a product, a material, or a service like customs clearance." />
          )}
        </div>
      );
    case "ready":
      return (
        <>
          <ul className="mt-6 space-y-3 px-4 lg:px-6">
            {viewState.hits.map((hit) => (
              <li key={`${hit.documentKind}-${hit.entityId}`}>
                <SearchHitRow hit={hit} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more results"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

/**
 * One hit, product or offering.
 *
 * BRANCHES ON `documentKind`, never on a nullable field. A search document is denormalized
 * so one index serves both entities, which means `categorySlug` is null on every offering
 * and `providerKind` is null on every product — testing either to guess the kind would
 * misread the other. The exhaustive switch makes a third document kind a compile error.
 */
function SearchHitRow({ hit }: { hit: StoreSearchHit }) {
  switch (hit.documentKind) {
    case "product":
      return (
        <SearchHitShell
          href={`/store/product/${hit.publicSlug}`}
          badge={<span className="text-[#6F7979]">Product</span>}
          hit={hit}
        />
      );
    case "provider_offering":
      return (
        <SearchHitShell
          href={`/store/services/${hit.publicSlug}`}
          badge={
            hit.providerKind === null ? (
              <span className="text-[#6F7979]">Service</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#6F7979]">
                <Image
                  src={`/icons/${PROVIDER_KIND_ICONS[hit.providerKind]}`}
                  alt=""
                  width={14}
                  height={14}
                />
                {PROVIDER_KIND_LABELS[hit.providerKind]}
              </span>
            )
          }
          hit={hit}
        />
      );
    default: {
      const exhaustiveCheck: never = hit.documentKind;
      return exhaustiveCheck;
    }
  }
}

function SearchHitShell({
  href,
  badge,
  hit,
}: {
  href: string;
  badge: React.ReactNode;
  hit: StoreSearchHit;
}) {
  // Price and currency travel TOGETHER and are both nullable: a quote-only offering has
  // neither, and an amount without its currency cannot be formatted. Requiring both is what
  // stops a `null` currency becoming a bare number with an assumed dollar sign.
  const priceLabel =
    hit.priceInCents !== null && hit.currency !== null
      ? formatCentsLabel(hit.priceInCents, hit.currency)
      : null;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <div className="flex items-center gap-2 text-[11px] leading-4 font-medium tracking-[0.4px]">
        {badge}
        <span aria-hidden className="text-[#CAC4D0]">
          ·
        </span>
        <span className="text-[#6F7979]">
          {hit.organizationDisplayName} · {countryLabelFromCode(hit.organizationCountryCode)}
        </span>
      </div>

      <p className="mt-1 text-sm leading-5 font-medium text-[#191C1C]">{hit.title}</p>

      {hit.summary !== null && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#6F7979]">{hit.summary}</p>
      )}

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 text-xs leading-4">
        {priceLabel === null ? (
          <span className="text-[#00696E]">Quote on request</span>
        ) : (
          <span className="font-medium text-[#191C1C]">{priceLabel}</span>
        )}
        {hit.minimumOrderQuantity !== null && (
          <span className="text-[#6F7979]">
            Minimum order {formatCountLabel(hit.minimumOrderQuantity)}
          </span>
        )}
      </div>
    </Link>
  );
}
