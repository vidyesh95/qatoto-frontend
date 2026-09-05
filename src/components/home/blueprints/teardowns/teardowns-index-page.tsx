// TRANSPORT: mock — async server component. Reads `listBlueprintsByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// FILTERING HAPPENS HERE, ON THE SERVER, over the whole set — never in the browser over a fetched
// page. It reads a fixture array today, so the filter is an in-memory `.filter`; when this reads
// the backend the same three params become query params on the request and the predicates below
// are deleted rather than moved into a client component. That direction is the point: a client
// that filters can only filter what it already downloaded.

import TeardownGridCard from "@/components/home/blueprints/cards/teardown-grid-card";
import FacetChipRow, { type FacetBucket } from "@/components/home/shared/facet-chip-row";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listBlueprintsByCategory } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DIFFICULTY_LABELS,
  type TeardownBlueprint,
} from "@/lib/blueprints/schemas";
import {
  buildFilterHref,
  type RawSearchParams,
  readEnumParam,
  readSingleParam,
} from "@/lib/filter-href";

/** What a teardown published. Snake-shaped like every other enum that could reach a query. */
const TEARDOWN_MEDIA_FILTERS = ["video", "documents"] as const;
type TeardownMediaFilter = (typeof TEARDOWN_MEDIA_FILTERS)[number];

const TEARDOWN_MEDIA_FILTER_LABELS: Record<TeardownMediaFilter, string> = {
  video: "Has walkthrough",
  documents: "Has files",
};

/**
 * TWO VARIANTS, NOT THREE — no `error` arm, for the reason `blueprints-page.tsx` states: the
 * source is an in-repo fixture array that cannot fail the way a network read can, and an
 * unreachable branch never renders during development. The moment this getter reads the backend,
 * `error` joins the union and this `switch` stops compiling until it is handled.
 */
type TeardownsViewState =
  | { status: "empty"; appliedFilterCount: number }
  | { status: "ready"; teardowns: TeardownBlueprint[] };

function countTagOccurrences(teardowns: readonly TeardownBlueprint[]): FacetBucket[] {
  const countsByTag = new Map<string, number>();
  for (const teardown of teardowns) {
    for (const tag of teardown.tags) countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + 1);
  }
  return [...countsByTag]
    .map(([value, count]) => ({ value, count }))
    .toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function hasRequestedMedia(teardown: TeardownBlueprint, media: TeardownMediaFilter): boolean {
  return media === "video" ? teardown.walkthroughVideo !== null : teardown.documents.length > 0;
}

export default async function TeardownsIndexPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const difficulty = readEnumParam(resolvedSearchParams, "difficulty", BLUEPRINT_DIFFICULTIES);
  const media = readEnumParam(resolvedSearchParams, "media", TEARDOWN_MEDIA_FILTERS);
  const tag = readSingleParam(resolvedSearchParams, "tag");

  const allTeardowns = await listBlueprintsByCategory("teardown");

  // The tag facet counts the WHOLE category, not the filtered result. Counts that shrank as you
  // clicked would make "cold-chain · 3" mean something different on every render.
  const tagBuckets = countTagOccurrences(allTeardowns);

  const matching = allTeardowns.filter(
    (teardown) =>
      (difficulty === undefined || teardown.difficulty === difficulty) &&
      (media === undefined || hasRequestedMedia(teardown, media)) &&
      (tag === undefined || teardown.tags.includes(tag)),
  );

  const appliedFilterCount = [difficulty, media, tag].filter((value) => value !== undefined).length;

  const viewState: TeardownsViewState =
    matching.length === 0
      ? { status: "empty", appliedFilterCount }
      : { status: "ready", teardowns: matching };

  const difficultyOptions: FilterChipOption[] = [
    {
      label: "Any difficulty",
      href: buildFilterHref(resolvedSearchParams, { difficulty: undefined }),
      isSelected: difficulty === undefined,
    },
    ...BLUEPRINT_DIFFICULTIES.map((value) => ({
      label: BLUEPRINT_DIFFICULTY_LABELS[value],
      href: buildFilterHref(resolvedSearchParams, { difficulty: value }),
      isSelected: difficulty === value,
    })),
  ];

  const mediaOptions: FilterChipOption[] = [
    {
      label: "Anything published",
      href: buildFilterHref(resolvedSearchParams, { media: undefined }),
      isSelected: media === undefined,
    },
    ...TEARDOWN_MEDIA_FILTERS.map((value) => ({
      label: TEARDOWN_MEDIA_FILTER_LABELS[value],
      href: buildFilterHref(resolvedSearchParams, { media: value }),
      isSelected: media === value,
    })),
  ];

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">Teardowns</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
          Schematics, CAD breakdowns and bills of materials, pulled apart part by part.
        </p>
      </header>

      <div className="mt-3 space-y-2 px-4 lg:px-6">
        <FilterChipRow options={difficultyOptions} ariaLabel="Filter teardowns by difficulty" />
        <FilterChipRow options={mediaOptions} ariaLabel="Filter teardowns by published media" />
        {/* Single-select rather than multi, deliberately: `FacetChipRow` carries the COUNT on each
            chip, which is what tells a reader whether a click is worth making. A hand-rolled
            multi-select row would have to give that up or re-derive it per combination. */}
        <FacetChipRow
          searchParams={resolvedSearchParams}
          queryKey="tag"
          ariaLabel="Filter teardowns by tag"
          buckets={tagBuckets}
        />
      </div>

      {renderTeardowns(viewState)}
    </div>
  );
}

function renderTeardowns(viewState: TeardownsViewState) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="mt-8 px-4 text-sm text-[#6F7979] lg:px-6">
          {viewState.appliedFilterCount === 0
            ? "No teardowns have been published yet."
            : "No teardown matches these filters."}
        </p>
      );
    case "ready":
      return (
        <div className="mt-5 grid gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
          {viewState.teardowns.map((teardown) => (
            <TeardownGridCard key={teardown.id} teardown={teardown} />
          ))}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
