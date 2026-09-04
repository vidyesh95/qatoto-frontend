// TRANSPORT: props-only — presentational. Fetches nothing.

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { formatIsoInstant } from "@/lib/rnd/format";
import { formatTradeValueCompact } from "@/lib/rnd/import-format";
import type { ImportReporter, LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";
import type { DemandSignal } from "@/lib/rnd/discovery.schemas";

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

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Commodities tracked</dt>
          <dd className="text-xl font-semibold">{totalCommodityCount.toLocaleString("en-US")}</dd>
        </div>

        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">
            Imports across the top {assessments.length}
          </dt>
          <dd className="text-xl font-semibold">
            {assessments.length === 0
              ? "Not scored yet"
              : formatTradeValueCompact(pagedImportCents.toString(), currency)}
          </dd>
        </div>

        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Categories with demand signal</dt>
          <dd className="text-xl font-semibold">
            {demandSignals.length === 0 ? "No run yet" : distinctDemandCategories.size}
          </dd>
          {/* A stored counter renders its freshness, or a reader assumes it is live. */}
          {demandAsOf === undefined ? null : (
            <p className="mt-1 text-xs text-muted-foreground">
              As of {formatIsoInstant(demandAsOf)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Top feasibility score</dt>
          <dd className="text-xl font-semibold">
            {assessments[0] === undefined
              ? "Not scored yet"
              : `${assessments[0].feasibilityScorePoints}/100`}
          </dd>
          {assessmentAsOf === undefined ? null : (
            <p className="mt-1 text-xs text-muted-foreground">
              As of {formatIsoInstant(assessmentAsOf)}
            </p>
          )}
        </div>
      </dl>
    </section>
  );
}
