// TRANSPORT: mock — async server component. Reads `listBlueprintsByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Filtering is server-side over the whole set, for the reason `teardowns-index-page.tsx` states
// at length.

import CaseStudyIndexCard from "@/components/home/blueprints/cards/case-study-index-card";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { listBlueprintsByCategory } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  BLUEPRINT_DISCIPLINES,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";
import { buildFilterHref, type RawSearchParams, readEnumParam } from "@/lib/filter-href";

type CaseStudiesViewState =
  | { status: "empty"; appliedFilterCount: number }
  | { status: "ready"; caseStudies: CaseStudyBlueprint[] };

/**
 * BY CONCEPT NUMBER, NOT BY DATE. The numeral is the index's spine — a reader who saw 03 yesterday
 * expects it in the same place today, which a newest-first order would break on every publish.
 */
function byConceptNumber(left: CaseStudyBlueprint, right: CaseStudyBlueprint): number {
  return left.conceptNumber - right.conceptNumber;
}

export default async function CaseStudiesIndexPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const discipline = readEnumParam(resolvedSearchParams, "discipline", BLUEPRINT_DISCIPLINES);

  const allCaseStudies = await listBlueprintsByCategory("case_study");
  const matching = allCaseStudies
    .filter((caseStudy) => discipline === undefined || caseStudy.discipline === discipline)
    .toSorted(byConceptNumber);

  const viewState: CaseStudiesViewState =
    matching.length === 0
      ? { status: "empty", appliedFilterCount: discipline === undefined ? 0 : 1 }
      : { status: "ready", caseStudies: matching };

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
          What happened after the build — volumes, unit economics, go-to-market.
        </p>
      </header>

      <div className="mt-3 px-4 lg:px-6">
        <FilterChipRow options={disciplineOptions} ariaLabel="Filter case studies by discipline" />
      </div>

      {renderCaseStudies(viewState)}
    </div>
  );
}

function renderCaseStudies(viewState: CaseStudiesViewState) {
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
        <div className="mt-5 grid gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-3">
          {viewState.caseStudies.map((caseStudy) => (
            <CaseStudyIndexCard key={caseStudy.id} caseStudy={caseStudy} />
          ))}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
