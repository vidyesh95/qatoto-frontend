// TRANSPORT: mock — async server component. Reads `listBlueprintsByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Filtering is server-side over the whole set, for the reason `teardowns-index-page.tsx` states
// at length.

import ShowcaseFeedRow from "@/components/home/blueprints/cards/showcase-feed-row";
import FacetChipRow, { type FacetBucket } from "@/components/home/shared/facet-chip-row";
import { listBlueprintsByCategory } from "@/lib/blueprints/api";
import type { ShowcaseBlueprint } from "@/lib/blueprints/schemas";
import { type RawSearchParams, readSingleParam } from "@/lib/filter-href";

type ShowcaseViewState =
  | { status: "empty"; appliedFilterCount: number }
  | { status: "ready"; showcases: ShowcaseBlueprint[] };

/**
 * NEWEST LAUNCH FIRST, BY `launchedAt` AND NOT `createdAt`.
 *
 * A launch is announced on a date its author chose; `createdAt` is when the row was typed. The two
 * differ by days in the fixtures on purpose, so an order built on the wrong field is visible
 * rather than plausible.
 */
function byMostRecentlyLaunched(left: ShowcaseBlueprint, right: ShowcaseBlueprint): number {
  return Date.parse(right.launchedAt) - Date.parse(left.launchedAt);
}

function countTagOccurrences(showcases: readonly ShowcaseBlueprint[]): FacetBucket[] {
  const countsByTag = new Map<string, number>();
  for (const showcase of showcases) {
    for (const tag of showcase.tags) countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + 1);
  }
  return [...countsByTag]
    .map(([value, count]) => ({ value, count }))
    .toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

export default async function ShowcaseFeedPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const tag = readSingleParam(resolvedSearchParams, "tag");

  const allShowcases = await listBlueprintsByCategory("showcase");
  const tagBuckets = countTagOccurrences(allShowcases);

  const matching = allShowcases
    .filter((showcase) => tag === undefined || showcase.tags.includes(tag))
    .toSorted(byMostRecentlyLaunched);

  const viewState: ShowcaseViewState =
    matching.length === 0
      ? { status: "empty", appliedFilterCount: tag === undefined ? 0 : 1 }
      : { status: "ready", showcases: matching };

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

      {renderShowcaseFeed(viewState)}
    </div>
  );
}

function renderShowcaseFeed(viewState: ShowcaseViewState) {
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
        <ul className="mt-4 space-y-3 px-4 lg:px-6">
          {viewState.showcases.map((showcase) => (
            <li key={showcase.id}>
              <ShowcaseFeedRow showcase={showcase} />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
