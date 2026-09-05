// TRANSPORT: mock — async server component. Reads `listShowcases` and `listBlueprintTagFacets`
// from `@/lib/blueprints/api`, which serve fixtures from `@/mocks/blueprints-mocks`.
//
// Filtering, ordering and paging all live in the getter, for the reason
// `teardowns-index-page.tsx` states at length. The `launchedAt` ordering in particular belongs
// beside the filter: a cursor into an order the page could re-derive differently is meaningless.

import ShowcaseFeedRow from "@/components/home/blueprints/cards/showcase-feed-row";
import CursorPageControl from "@/components/home/shared/cursor-page-control";
import FacetChipRow, { type FacetBucket } from "@/components/home/shared/facet-chip-row";
import { listBlueprintTagFacets, listShowcases } from "@/lib/blueprints/api";
import type { ShowcaseBlueprint } from "@/lib/blueprints/schemas";
import { buildFilterHref, type RawSearchParams, readSingleParam } from "@/lib/filter-href";

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
  const requestedCursor = readSingleParam(resolvedSearchParams, "cursor");

  const [showcasePage, tagBuckets]: [Awaited<ReturnType<typeof listShowcases>>, FacetBucket[]] =
    await Promise.all([
      listShowcases({ tag, cursor: requestedCursor }),
      listBlueprintTagFacets("showcase"),
    ]);

  const viewState: ShowcaseViewState =
    showcasePage.items.length === 0
      ? { status: "empty", appliedFilterCount: tag === undefined ? 0 : 1 }
      : {
          status: "ready",
          showcases: showcasePage.items,
          nextCursor: showcasePage.page.nextCursor,
          hasMore: showcasePage.page.hasMore,
        };

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">Showcase</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
          Working prototypes and finished builds, made from the teardowns.
        </p>
      </header>

      <div className="mt-3 px-4 lg:px-6">
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
          <ul className="mt-4 space-y-3 px-4 lg:px-6">
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
