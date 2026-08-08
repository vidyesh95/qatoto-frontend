// TRANSPORT: server-fetch

import Link from "next/link";
import { fetchStoreSearch } from "@/lib/store/catalog.api";
import { toStoreSearchViewState } from "@/lib/store/view-state";
import type { RawSearchParams } from "@/lib/filter-href";
import {
  buildStoreSearchHref,
  countAppliedStoreFilters,
  readStoreSearchFilter,
} from "@/lib/store/search-params";
import { STORE_SEARCH_DOCUMENT_KINDS, storeSearchDocumentKindLabel } from "@/lib/store/labels";
import SearchHitCard from "@/components/home/store/cards/search-hit-card";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";

/**
 * Store search.
 *
 * The result is a MIXED, ranked list of products and provider offerings — not a product
 * page — so hits render through `SearchHitCard`, which switches on `documentKind`.
 *
 * There is no sort control: `/store/search` accepts `sort: "relevance"` and nothing else.
 * There are no facet chips either — the route returns no facet counts, and inventing counts
 * from the visible cards would be reporting a page as if it were the corpus.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const filter = readStoreSearchFilter(resolvedSearchParams);
  const searchResult = await fetchStoreSearch(filter);
  const viewState = toStoreSearchViewState(searchResult, countAppliedStoreFilters(filter));
  const pathname = "/store/search";

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-3 px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium tracking-wide">Search the store</h1>
        <form action="/store/search" method="get" className="flex gap-2">
          <input
            type="search"
            name="query"
            defaultValue={filter.query ?? ""}
            placeholder="Search products and services"
            className="min-w-0 flex-1 rounded-full border border-[#E0E3E3] px-4 py-2 text-sm outline-none focus:border-[#2A76FD]"
          />
          {/* Carry the active narrowing filters through the GET form. */}
          {filter.category ? <input type="hidden" name="category" value={filter.category} /> : null}
          {filter.documentKind ? (
            <input type="hidden" name="documentKind" value={filter.documentKind} />
          ) : null}
          {filter.sellerCountryCode ? (
            <input type="hidden" name="sellerCountryCode" value={filter.sellerCountryCode} />
          ) : null}
          <button
            type="submit"
            className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>

        {/* `documentKind` is the one result-narrowing control the backend actually supports. */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildStoreSearchHref(pathname, resolvedSearchParams, {
              documentKind: undefined,
            })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter.documentKind === undefined
                ? "bg-[#00696E] text-white"
                : "bg-muted text-foreground"
            }`}
          >
            Everything
          </Link>
          {STORE_SEARCH_DOCUMENT_KINDS.map((documentKind) => (
            <Link
              key={documentKind}
              href={buildStoreSearchHref(pathname, resolvedSearchParams, { documentKind })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter.documentKind === documentKind
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {storeSearchDocumentKindLabel(documentKind)}
            </Link>
          ))}
        </div>
      </div>

      {(() => {
        switch (viewState.status) {
          case "error":
            return (
              <StoreStatusPanel
                status="error"
                message={viewState.message}
                isSignInRequired={viewState.isSignInRequired}
              />
            );
          case "empty":
            return (
              <StoreStatusPanel
                status="empty"
                title="No matching results"
                message={
                  viewState.appliedFilterCount > 0
                    ? "Nothing matches these filters."
                    : "Search for a product or a trade service to get started."
                }
                resetHref={viewState.appliedFilterCount > 0 ? pathname : undefined}
              />
            );
          case "ready": {
            const { items, page } = viewState.result;
            return (
              <div className="space-y-6">
                {filter.query ? (
                  <p className="px-4 text-sm text-foreground/70 lg:px-6">
                    Results for{" "}
                    <span className="font-medium text-foreground">“{filter.query}”</span>
                  </p>
                ) : null}

                <section className="space-y-4 px-4 lg:px-6">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((hit) => (
                      <SearchHitCard key={`${hit.documentKind}-${hit.entityId}`} hit={hit} />
                    ))}
                  </div>
                  {page.nextCursor ? (
                    <Link
                      href={buildStoreSearchHref(pathname, resolvedSearchParams, {
                        cursor: page.nextCursor,
                      })}
                      className="inline-flex text-sm font-medium text-[#00696E]"
                    >
                      Load more
                    </Link>
                  ) : null}
                </section>
              </div>
            );
          }
          default: {
            const exhaustiveCheck: never = viewState;
            return exhaustiveCheck;
          }
        }
      })()}
    </div>
  );
}
