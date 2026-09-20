// TRANSPORT: props-only — presentational. Fetches nothing.

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import HairlineDefinitionRow, {
  type HairlineDefinitionFact,
} from "@/components/home/shared/hairline-definition-row";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { formatIsoInstant } from "@/lib/rnd/format";
import { formatTradeValueCompact } from "@/lib/rnd/import-format";
import type { ImportReporter, LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";
import type { DemandSignal } from "@/lib/rnd/discovery.schemas";

/**
 * The facts the row renders, in reading order.
 *
 * ⚠️ **THE TWO `… as of` CELLS ARE NEW LABELS, AND THAT IS THE POINT OF PROMOTING THEM.** They were
 * `<p>As of …</p>` nested inside the `<dl>`, which is invalid markup — a `dl` takes only
 * `dt`/`dd`/`div`. Flattened into a row, a bare "As of" cell would float free of the figure it
 * describes, so the label carries the association the box carried visually. Behaviour is unchanged:
 * both already rendered nothing when their snapshot was missing, and `null` drops the cell.
 *
 * ⚠️ **EVERY OTHER STRING IS THE ONE THIS COMPONENT ALREADY PRINTED** — "Not scored yet" twice and
 * "No run yet" — so the rest is layout only.
 *
 * ⚠️ **THE CALLER CONVERTS `undefined` TO `null`, NOT THIS SIGNATURE.** `assessments[0]?.asOf` is
 * `string | undefined`; a fact's value is `string | null`. The contract is right and the call site
 * was loose, so `?? null` belongs there rather than widening this to accept both.
 *
 * ⚠️ This is the fourth local `build…Facts`; if a fifth appears, extract the pattern.
 */
function buildOverviewFacts(input: {
  readonly totalCommodityCount: number;
  readonly assessmentCount: number;
  /** `null` when nothing is scored — the page's existing "Not scored yet" is applied below. */
  readonly pagedImportLabel: string | null;
  readonly demandCategoryCount: number | null;
  readonly topFeasibilityPoints: number | null;
  readonly demandAsOf: string | null;
  readonly assessmentAsOf: string | null;
}): readonly HairlineDefinitionFact[] {
  return [
    {
      label: "Commodities tracked",
      value: input.totalCommodityCount.toLocaleString("en-US"),
    },
    {
      label: `Imports across the top ${String(input.assessmentCount)}`,
      value: input.pagedImportLabel ?? "Not scored yet",
    },
    {
      label: "Categories with demand signal",
      value: input.demandCategoryCount === null ? "No run yet" : String(input.demandCategoryCount),
    },
    // A stored counter renders its freshness, or a reader assumes it is live.
    {
      label: "Demand as of",
      value: input.demandAsOf === null ? null : formatIsoInstant(input.demandAsOf),
    },
    {
      label: "Top feasibility score",
      value:
        input.topFeasibilityPoints === null
          ? "Not scored yet"
          : `${String(input.topFeasibilityPoints)}/100`,
    },
    {
      label: "Feasibility as of",
      value: input.assessmentAsOf === null ? null : formatIsoInstant(input.assessmentAsOf),
    },
  ];
}

/**
 * The country picker and the KPI row.
 *
 * ⚠️ THE PICKER IS BUILT FROM `/import-reporters`, NOT FROM THE REGION TAXONOMY. Eighteen
 * countries are seeded in `discovery_region` and one has been ingested; a picker over the
 * taxonomy would offer seventeen dead ends. Every chip carries its commodity count, so a
 * reader can see how much is behind a country before clicking it.
 *
 * ⚠️ ONE SELECTION DRIVES BOTH TABS. `?reporterCountryCode=IN` filters the import reads
 * directly, and the page maps it onto the matching `discovery_region` slug to filter the
 * demand reads through the `region` param the backend already accepts. Two pickers for one
 * question would let a reader put the surface into a state where its halves disagree.
 */
export default function MarketResearchOverview({
  reporters,
  selectedCountryCode,
  assessments,
  demandSignals,
  totalCommodityCount,
  searchParams,
}: {
  reporters: readonly ImportReporter[];
  selectedCountryCode: string | undefined;
  assessments: readonly LocalizationAssessment[];
  demandSignals: readonly DemandSignal[];
  totalCommodityCount: number;
  searchParams: RawSearchParams;
}) {
  const countryChips: FilterChipOption[] = reporters.map((reporter) => ({
    label: `${reporter.displayLabel} · ${reporter.commodityCount.toLocaleString("en-US")}`,
    href: buildFilterHref(searchParams, { reporterCountryCode: reporter.countryCode }),
    isSelected: selectedCountryCode === reporter.countryCode,
  }));

  const selectedReporter =
    selectedCountryCode === undefined
      ? reporters[0]
      : reporters.find((reporter) => reporter.countryCode === selectedCountryCode);

  // The import bill of what is ON THIS PAGE, not of the whole catalogue — the leaderboard is
  // one page of the ranking, and claiming a national total from it would be wrong by orders of
  // magnitude. The label says "top N" for that reason.
  const pagedImportCents = assessments.reduce(
    (runningTotal, assessment) => runningTotal + BigInt(assessment.observedImportValueInCents),
    BigInt(0),
  );
  const currency = assessments[0]?.currency ?? "USD";

  const distinctDemandCategories = new Set(demandSignals.map((signal) => signal.category.slug));
  const assessmentAsOf = assessments[0]?.asOf;
  const demandAsOf = demandSignals[0]?.asOf;

  return (
    <section className="space-y-4 px-4 lg:px-6">
      {reporters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {/* Absence, stated. Not an error, and not a country list with nothing behind it. */}
          No country has trade data yet. The import ingest runs weekly and this picker lists only
          countries it has actually pulled.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Country{" "}
            {selectedReporter === undefined ? null : (
              <>
                · {selectedReporter.earliestPeriodYear}–{selectedReporter.latestPeriodYear} ·{" "}
                {selectedReporter.flowCount.toLocaleString("en-US")} trade records
              </>
            )}
          </p>
          <FilterChipRow options={countryChips} ariaLabel="Choose a country" />
        </div>
      )}

      {/* ⚠️ **ONE HAIRLINE ROW, AND THIS ONE IS NOT PURELY A CONTAINER SWAP.** Two `As of …` lines
          used to render as `<p>` INSIDE the `<dl>` — invalid, since a `dl` may only contain
          `dt`/`dd`/`div`. They are now peer cells, which is the `Score computed` precedent from the
          cluster detail. That required NAMING them: in a flat row only a label can tie a timestamp
          to the figure it qualifies, which the box used to do visually. So "Demand as of" and
          "Feasibility as of" are new labels, and the literal "As of " left the value. Every other
          string is unchanged. */}
      <HairlineDefinitionRow
        facts={buildOverviewFacts({
          totalCommodityCount,
          assessmentCount: assessments.length,
          pagedImportLabel:
            assessments.length === 0
              ? null
              : formatTradeValueCompact(pagedImportCents.toString(), currency),
          demandCategoryCount: demandSignals.length === 0 ? null : distinctDemandCategories.size,
          topFeasibilityPoints: assessments[0]?.feasibilityScorePoints ?? null,
          demandAsOf: demandAsOf ?? null,
          assessmentAsOf: assessmentAsOf ?? null,
        })}
      />
    </section>
  );
}
