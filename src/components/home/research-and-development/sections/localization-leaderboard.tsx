// TRANSPORT: props-only — presentational server component. Fetches nothing; the page body
// above it reads and lifts, and every chip here is a Link that rewrites the query string so
// the backend re-applies the filter in SQL.

import CommodityCard from "@/components/home/research-and-development/cards/commodity-card";
import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { formatIsoInstant } from "@/lib/rnd/format";
import type {
  ImportCommodityKindOption,
  LocalizationAssessment,
} from "@/lib/rnd/import-intelligence.schemas";
import { IMPORT_COMMODITY_KIND_LABELS } from "@/lib/rnd/labels";
import type { PaginationMeta } from "@/lib/http";

/**
 * The feasibility leaderboard.
 *
 * ⚠️ IT RENDERS `asOf`, ALWAYS. This is a stored counter recomputed nightly, and a derived
 * number without its freshness is a number a reader will assume is live. The knowledge
 * hub's demand leaderboard follows the same rule for the same reason.
 *
 * ⚠️ AN EMPTY LIST MEANS NO SCORING RUN HAS HAPPENED — not that nothing is feasible. The
 * copy says so, because "no results" beside a filter chip reads as "your filter matched
 * nothing", which is a different and wrong conclusion.
 */
export default function LocalizationLeaderboard({
  assessments,
  pagination,
  commodityKinds,
  searchParams,
}: {
  assessments: readonly LocalizationAssessment[];
  pagination: PaginationMeta | null;
  commodityKinds: readonly ImportCommodityKindOption[];
  searchParams: RawSearchParams;
}) {
  const selectedKind = searchParams["commodityKind"];
  const selectedKindValue = typeof selectedKind === "string" ? selectedKind : undefined;

  const kindChips: FilterChipOption[] = [
    {
      label: "Every kind",
      href: buildFilterHref(searchParams, { commodityKind: undefined }),
      isSelected: selectedKindValue === undefined,
    },
    ...commodityKinds.map((option) => ({
      label: IMPORT_COMMODITY_KIND_LABELS[option.kind],
      href: buildFilterHref(searchParams, { commodityKind: option.kind }),
      isSelected: selectedKindValue === option.kind,
    })),
  ];

  const asOf = assessments[0]?.asOf;

  return (
    <section id="localization-leaderboard" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Most feasible to make here</h2>
        <p className="text-sm text-muted-foreground">
          Ranked by a 0–100 score over import volume, existing exports, published substitutes,
          supplier capacity and lead time.{" "}
          {asOf === undefined ? null : <>Computed {formatIsoInstant(asOf)}.</>}
        </p>
      </div>

      <FilterChipRow options={kindChips} ariaLabel="Filter by commodity kind" />

      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {/* Not "no results": the difference matters to whoever reads this next. */}
          Nothing has been scored yet. The feasibility run happens nightly and writes a ranking once
          there is trade data to rank.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment) => (
              <CommodityCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
          {pagination === null ? null : (
            <p className="text-xs text-muted-foreground">
              {pagination.total} commodit{pagination.total === 1 ? "y" : "ies"} scored
              {pagination.totalPages > 1 ? ` · showing page ${pagination.page}` : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}
