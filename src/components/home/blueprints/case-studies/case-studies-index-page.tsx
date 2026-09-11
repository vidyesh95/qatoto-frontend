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
// THE LIST DRAWS THE HAIRLINES AND STOPS AT THE GUTTER. The rows used to carry their own full-bleed
// `border-t` over a `border-b` wrapper, because `divide-y` on rows that grow when opened made the
// open row's boundary ambiguous. That ambiguity is gone now that an open row has a rounded fill of
// its own inset between the rules, so the list is `divide-y` inside `border-y` — the same
// construction as the hub's case-study lane, with the rules ending where the heading starts rather
// than running under the sidebar edge.

import Link from "next/link";

import CaseStudyLessonRow from "@/components/home/blueprints/cards/case-study-lesson-row";
import CursorPageControl from "@/components/home/shared/cursor-page-control";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listCaseStudies } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  BLUEPRINT_DISCIPLINES,
  buildBlueprintHref,
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
      {/* THE SHOWCASE FEED'S HEADER ROW, for the same reason: one way to write, beside the title,
          as an outline pill because this page is for reading. It wraps under the title on a phone. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-4 lg:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-medium text-foreground lg:text-2xl">Case studies</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
            What somebody learned the expensive way. Open a lesson to see what they did, or read the
            full record for the figures and where they came from.
          </p>
        </div>
        <Link
          href="/blueprints/case-studies/new"
          className="shrink-0 rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Write a case study
        </Link>
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
          <ul className="mx-4 mt-5 divide-y divide-border border-y border-border lg:mx-6">
            {viewState.caseStudies.map((caseStudy) => (
              <li key={caseStudy.id}>
                <CaseStudyLessonRow lesson={caseStudy} recordHref={buildBlueprintHref(caseStudy)} />
              </li>
            ))}
          </ul>
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
