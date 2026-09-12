// TRANSPORT: server-fetch — async server component. Reads `listPublicTeardowns` from
// `@/lib/blueprints/teardown-public.api`, which calls the Express backend.
//
// FILTERING AND PAGING BOTH HAPPEN IN THE GETTER, not here and never in the browser. This page
// reads three query params, hands them over, and renders what comes back — which is the shape a
// real endpoint answers, so wiring the backend deletes predicates rather than moving them. A page
// that filtered its own results could only ever filter the rows it had already downloaded, and one
// that paged after filtering in the component would have to download every row to find page two.

import TeardownGridCard, {
  EAGER_TEARDOWN_CARD_COUNT,
} from "@/components/home/blueprints/cards/teardown-grid-card";
import CursorPageControl from "@/components/home/shared/cursor-page-control";
import FacetChipRow, { type FacetBucket } from "@/components/home/shared/facet-chip-row";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listPublicTeardowns } from "@/lib/blueprints/teardown-public.api";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DIFFICULTY_LABELS,
  TEARDOWN_MEDIA_FILTER_LABELS,
  TEARDOWN_MEDIA_FILTERS,
  type TeardownBlueprint,
} from "@/lib/blueprints/schemas";
import {
  buildFilterHref,
  type RawSearchParams,
  readEnumParam,
  readSingleParam,
} from "@/lib/filter-href";

/**
 * THE `error` ARM EXISTS BECAUSE THIS PAGE NOW READS A REAL BACKEND — the arm this file's own
 * comment said would arrive the moment the getter stopped being a fixture. Before, every failure
 * resolved to fixtures, so "the server is down" and "no teardown matches these filters" rendered
 * the same page: a visitor saw invented teardowns under a real heading with nothing to say so.
 *
 * ⚠️ THE LIST IS GATED ON `published` AND `flagged`, so a teardown missing from every page here is
 * NOT a teardown whose address 404s — a quarantined one is withheld from the index and still
 * reachable. Nothing on this page may infer "gone" from "absent".
 */
type TeardownsViewState =
  | { status: "empty"; appliedFilterCount: number }
  | { status: "error"; message: string }
  | {
      status: "ready";
      teardowns: readonly TeardownBlueprint[];
      nextCursor: string | null;
      hasMore: boolean;
      tagBuckets: readonly FacetBucket[];
    };

export default async function TeardownsIndexPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const difficulty = readEnumParam(resolvedSearchParams, "difficulty", BLUEPRINT_DIFFICULTIES);
  const media = readEnumParam(resolvedSearchParams, "media", TEARDOWN_MEDIA_FILTERS);
  const tag = readSingleParam(resolvedSearchParams, "tag");
  const requestedCursor = readSingleParam(resolvedSearchParams, "cursor");

  // ONE CALL, not two: the tag counts arrive in the index payload because they are counted over
  // the same population it filters. Two calls could disagree — chips promising teardowns the list
  // never returns — and the second could 200 while the first failed.
  const indexResponse = await listPublicTeardowns({
    difficulty,
    media,
    tag,
    cursor: requestedCursor,
  });

  const appliedFilterCount = [difficulty, media, tag].filter((value) => value !== undefined).length;

  const viewState: TeardownsViewState = !indexResponse.success
    ? { status: "error", message: indexResponse.error.message }
    : indexResponse.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          teardowns: indexResponse.data.items,
          nextCursor: indexResponse.data.page.nextCursor,
          hasMore: indexResponse.data.page.hasMore,
          tagBuckets: indexResponse.data.tagFacets,
        };

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

      {/* Every chip href goes through `buildFilterHref`, which drops `cursor` unless the patch
          names it — so changing a filter starts the new result set at the top instead of resuming
          it partway through. Paging SETS a cursor, filtering CLEARS one. */}
      <div className="mt-3 space-y-2 px-4 lg:px-6">
        <FilterChipRow options={difficultyOptions} ariaLabel="Filter teardowns by difficulty" />
        <FilterChipRow options={mediaOptions} ariaLabel="Filter teardowns by published media" />
        {/* Single-select rather than multi, deliberately: `FacetChipRow` carries the COUNT on each
            chip, which is what tells a reader whether a click is worth making. A hand-rolled
            multi-select row would have to give that up or re-derive it per combination. */}
        {/* The chips come from the payload, so on an error there are no counts to show rather than
            stale ones — a chip promising seven teardowns beside an error message is a worse answer
            than no chip. */}
        <FacetChipRow
          searchParams={resolvedSearchParams}
          queryKey="tag"
          ariaLabel="Filter teardowns by tag"
          buckets={viewState.status === "ready" ? [...viewState.tagBuckets] : []}
        />
      </div>

      {renderTeardowns(viewState, resolvedSearchParams)}
    </div>
  );
}

function renderTeardowns(viewState: TeardownsViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="mt-8 px-4 text-sm text-[#6F7979] lg:px-6">
          {viewState.appliedFilterCount === 0
            ? "No teardowns have been published yet."
            : "No teardown matches these filters."}
        </p>
      );
    /* NAMED AS A FAILURE, never as an empty shelf. The message is the server's own, and the reader
       is told to retry rather than left to conclude the surface is bare. */
    case "error":
      return (
        <div className="mt-8 px-4 lg:px-6">
          <p className="text-sm text-foreground">Teardowns could not be loaded.</p>
          <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">{viewState.message}</p>
        </div>
      );
    case "ready":
      return (
        <>
          <div className="mt-5 grid gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
            {viewState.teardowns.map((teardown, teardownIndex) => (
              <TeardownGridCard
                key={teardown.id}
                teardown={teardown}
                shouldLoadImageEagerly={teardownIndex < EAGER_TEARDOWN_CARD_COUNT}
              />
            ))}
          </div>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more teardowns"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
