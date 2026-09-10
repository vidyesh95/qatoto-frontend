// TRANSPORT: mock — async server component. Reads `listCaseStudies` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Filtering, ordering and paging all live in the getter, for the reason
// `teardowns-index-page.tsx` states at length.
//
// ⚠️ A LIST, NOT A GRID. This page was a grid of discipline-tinted, serif-titled, numbered cards on
// the lawsofux.com model; `case-study-lesson-row.tsx` records the three `docs/Design.md` rules that
// broke. The short version: a lesson is a sentence, and a column of sentences is scannable in a way
// that a grid of equal tiles is not — the reader is looking for the one that matches their problem,
// not browsing.
//
// THE ROWS CARRY THEIR OWN HAIRLINE (`border-t`), so the wrapper closes the list with a single
// `border-b` rather than `divide-y`. Each row is a `<details>` that grows when open, and `divide-y`
// on a container whose children change height puts the rule in the right place but makes the open
// row's own boundary ambiguous.

import CaseStudyLessonRow from "@/components/home/blueprints/cards/case-study-lesson-row";
import CursorPageControl from "@/components/home/shared/cursor-page-control";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listCaseStudies } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  BLUEPRINT_DISCIPLINES,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";
import {
  buildFilterHref,
  type RawSearchParams,
  readEnumParam,
  readSingleParam,
} from "@/lib/filter-href";

type CaseStudiesViewState =
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      caseStudies: readonly CaseStudyBlueprint[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function CaseStudiesIndexPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const discipline = readEnumParam(resolvedSearchParams, "discipline", BLUEPRINT_DISCIPLINES);
  const requestedCursor = readSingleParam(resolvedSearchParams, "cursor");

  const caseStudyPage = await listCaseStudies({ discipline, cursor: requestedCursor });

  const viewState: CaseStudiesViewState =
    caseStudyPage.items.length === 0
      ? { status: "empty", appliedFilterCount: discipline === undefined ? 0 : 1 }
      : {
          status: "ready",
          caseStudies: caseStudyPage.items,
          nextCursor: caseStudyPage.page.nextCursor,
          hasMore: caseStudyPage.page.hasMore,
        };

  const disciplineOptions: FilterChipOption[] = [
    {
      label: "All disciplines",
      href: buildFilterHref(resolvedSearchParams, { discipline: undefined }),
      isSelected: discipline === undefined,
    },
    ...BLUEPRINT_DISCIPLINES.map((value) => ({
      label: BLUEPRINT_DISCIPLINE_LABELS[value],
      href: buildFilterHref(resolvedSearchParams, { discipline: value }),
      isSelected: discipline === value,
    })),
  ];

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">Case studies</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
          What somebody learned the expensive way. Open a lesson to see what they did, or read the
          full record for the figures and where they came from.
        </p>
      </header>

      <div className="mt-3 px-4 lg:px-6">
        <FilterChipRow options={disciplineOptions} ariaLabel="Filter case studies by discipline" />
      </div>

      {renderCaseStudies(viewState, resolvedSearchParams)}
    </div>
  );
}

function renderCaseStudies(viewState: CaseStudiesViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="mt-8 px-4 text-sm text-[#6F7979] lg:px-6">
          {viewState.appliedFilterCount === 0
            ? "No case studies have been published yet."
            : "No case study covers that discipline yet."}
        </p>
      );
    case "ready":
      return (
        <>
          <div className="mt-5 border-b border-black/5">
            {viewState.caseStudies.map((caseStudy) => (
              <CaseStudyLessonRow key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </div>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more case studies"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
