// TRANSPORT: mock — async server component. Reads `listShowcases` and `listBlueprintTagFacets`
// from `@/lib/blueprints/api`, which serve fixtures from `@/mocks/blueprints-mocks`.
//
// Filtering, ORDERING and paging all live in the getter, for the reason
// `teardowns-index-page.tsx` states at length. The `?sort=` chips below only rewrite the URL: the
// comparator behind `newest` and `top` is `SHOWCASE_SORT_COMPARATORS` in the getter, because a
// cursor into an order the page could re-derive differently is meaningless.

import Link from "next/link";

import ShowcaseFeedRow from "@/components/home/blueprints/cards/showcase-feed-row";
import CursorPageControl from "@/components/home/shared/cursor-page-control";
import FacetChipRow, { type FacetBucket } from "@/components/home/shared/facet-chip-row";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listBlueprintTagFacets, listShowcases } from "@/lib/blueprints/api";
import {
  DEFAULT_SHOWCASE_SORT,
  SHOWCASE_SORT_LABELS,
  SHOWCASE_SORTS,
  type ShowcaseBlueprint,
} from "@/lib/blueprints/schemas";
import {
  buildFilterHref,
  type RawSearchParams,
  readEnumParam,
  readSingleParam,
} from "@/lib/filter-href";

type ShowcaseViewState =
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      showcases: readonly ShowcaseBlueprint[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function ShowcaseFeedPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const tag = readSingleParam(resolvedSearchParams, "tag");
  // An unrecognised `?sort=` is DROPPED rather than forwarded (`readEnumParam`), so a hand-edited
  // URL reads as the default order instead of an error page.
  const sort = readEnumParam(resolvedSearchParams, "sort", SHOWCASE_SORTS) ?? DEFAULT_SHOWCASE_SORT;
  const requestedCursor = readSingleParam(resolvedSearchParams, "cursor");

  const [showcasePage, tagBuckets]: [Awaited<ReturnType<typeof listShowcases>>, FacetBucket[]] =
    await Promise.all([
      listShowcases({ tag, sort, cursor: requestedCursor }),
      listBlueprintTagFacets("showcase"),
    ]);

  // A sort is an order, not a filter: `?sort=top` on its own can never produce "No launch matches
  // that tag", so the applied-filter count stays a count of FILTERS.
  const viewState: ShowcaseViewState =
    showcasePage.items.length === 0
      ? { status: "empty", appliedFilterCount: tag === undefined ? 0 : 1 }
      : {
          status: "ready",
          showcases: showcasePage.items,
          nextCursor: showcasePage.page.nextCursor,
          hasMore: showcasePage.page.hasMore,
        };

  // The `store-search-page.tsx` sort-row recipe, with one difference: the default sort is REMOVED
  // from the URL rather than written into it, so `/blueprints/showcase` stays the canonical address
  // of the default order and the Newest chip is how a reader clears `?sort=`.
  const sortOptions: FilterChipOption[] = SHOWCASE_SORTS.map((sortValue) => ({
    label: SHOWCASE_SORT_LABELS[sortValue],
    href: buildFilterHref(resolvedSearchParams, {
      sort: sortValue === DEFAULT_SHOWCASE_SORT ? undefined : sortValue,
    }),
    isSelected: sort === sortValue,
  }));

  return (
    <div className="pb-10">
      {/* One type step above the sibling indexes — a launch feed opens on its title the way
          Launch YC does — but sans and left-aligned: serif is the case-study signature on this
          surface, and the `(home)` shell has no centred column to put a hero in. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-6 lg:px-6 lg:pt-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
            Showcase
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7979] lg:text-base">
            Working prototypes and finished builds, launched from the teardowns.
          </p>
        </div>
        {/* AN OUTLINE PILL, NOT A FILLED ONE: the feed is for reading, and the committed action on
            this page is choosing a launch to open, not posting one. It wraps under the title on a
            phone rather than squeezing it. */}
        <Link
          href="/blueprints/showcase/new"
          className="shrink-0 rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Post a launch
        </Link>
      </header>

      <div className="mt-4 space-y-2 px-4 lg:px-6">
        <FilterChipRow options={sortOptions} ariaLabel="Sort launches" />
        <FacetChipRow
          searchParams={resolvedSearchParams}
          queryKey="tag"
          ariaLabel="Filter launches by tag"
          buckets={tagBuckets}
        />
      </div>

      {renderShowcaseFeed(viewState, resolvedSearchParams)}
    </div>
  );
}

function renderShowcaseFeed(viewState: ShowcaseViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="mt-8 px-4 text-sm text-[#6F7979] lg:px-6">
          {viewState.appliedFilterCount === 0
            ? "Nothing has been launched yet."
            : "No launch matches that tag."}
        </p>
      );
    case "ready":
      return (
        <>
          {/* No hairline, no border, no divider between rows — YC has none; the gap is the
              separator. */}
          <ul className="mt-6 space-y-6 px-4 sm:space-y-8 lg:px-6">
            {viewState.showcases.map((showcase) => (
              <li key={showcase.id}>
                <ShowcaseFeedRow showcase={showcase} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more launches"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
