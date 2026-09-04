// TRANSPORT: server-fetch — server component. Reads GET /discovery/market-insights,
// GET /discovery/demand-signals, GET /localization-assessments,
// GET /localization-assessment-grid, GET /import-commodities, GET /import-commodity-kinds and
// GET /import-reporters via @/lib/rnd/*.api, with the session cookie forwarded by
// callerRequestOptions(). All seven are public. No React Query here.

import MarketInsightCard from "@/components/home/research-and-development/cards/market-insight-card";
import CommodityDirectory from "@/components/home/research-and-development/sections/commodity-directory";
import LocalizationLeaderboard from "@/components/home/research-and-development/sections/localization-leaderboard";
import MarketResearchOverview from "@/components/home/research-and-development/sections/market-research-overview";
import MarketResearchTabs, {
  MARKET_RESEARCH_TABS,
  type MarketResearchTab,
} from "@/components/home/research-and-development/sections/market-research-tabs";
import OpportunityScatter from "@/components/home/research-and-development/sections/opportunity-scatter";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import RuledOutPanel from "@/components/home/research-and-development/sections/ruled-out-panel";
import SignalAgreementBand from "@/components/home/research-and-development/sections/signal-agreement-band";
import TrendingDemandSignals from "@/components/home/research-and-development/sections/trending-demand-signals";
import { readEnumParam, readPatternParam, type RawSearchParams } from "@/lib/filter-href";
import { listDemandSignals, listMarketInsights } from "@/lib/rnd/discovery.api";
import type { DemandSignal, MarketInsight } from "@/lib/rnd/discovery.schemas";
import {
  listImportCommodities,
  listImportCommodityKinds,
  listImportReporters,
  listLocalizationAssessmentGrid,
  listLocalizationAssessments,
} from "@/lib/rnd/import-intelligence.api";
import { IMPORT_COMMODITY_KINDS } from "@/lib/rnd/import-intelligence.schemas";
import { callerRequestOptions } from "@/lib/server-http";
import { toListViewState, type ListViewState } from "@/lib/view-state";

const INSIGHTS_PAGE_LIMIT = 24;
const DEMAND_SIGNALS_PAGE_LIMIT = 20;
const LEADERBOARD_LIMIT = 24;
/**
 * How many products the picker plots. The backend's `limit` ceiling, deliberately.
 *
 * Fifty manufactured products occupy fifty distinct positions on the log axes and split 33/17
 * across the parity line, so one page carries the reading. A larger set would need paging, and
 * paging a scatter means a chart that shows some of the data without saying which.
 */
const PICKER_LIMIT = 50;
const CATALOGUE_LIMIT = 30;

/** ISO-3166 alpha-2, the shape `discovery_region.country_code` stores. */
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/**
 * Market Research (§20) — stage 02 of the pipeline, and the one surface that answers "what
 * should I build" from both directions.
 *
 * WHY THIS ABSORBED THE KNOWLEDGE HUB. `PIPELINE_STAGES[1]` has always been titled "Market
 * Research"; it pointed at `/knowledge-hub`, which held only half the evidence. Import
 * intelligence's own header called itself "a sibling of the knowledge hub". Two surfaces
 * answering one question, one of them unreachable, was the actual defect — not a missing link.
 *
 * THE TWO EVIDENCE BASES ARE NEVER MERGED INTO ONE NUMBER. Demand signals are keyed
 * `(category × region)` and count people; localization assessments are keyed
 * `(HS6 commodity × country)` and count customs filings. They have identical row SHAPES —
 * rank, 0–100 score, previous score, trend, asOf — which is exactly what makes averaging them
 * tempting and wrong. They are ranked separately and correlated only on the research category,
 * which is the one key both carry.
 *
 * EVERY READ RUNS CONCURRENTLY and gets its own view state, so a failed leaderboard does not
 * blank the insight grid. The tab only decides what renders, not what is fetched — the reads
 * are cheap, the country selector has to work on every tab, and branching the fetch on the tab
 * would make the KPI row disagree with itself between tabs.
 */
export default async function MarketResearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  const activeTab: MarketResearchTab =
    readEnumParam(resolvedSearchParams, "tab", MARKET_RESEARCH_TABS) ?? "overview";

  const reporterCountryCode = readPatternParam(
    resolvedSearchParams,
    "reporterCountryCode",
    COUNTRY_CODE_PATTERN,
  );

  const commodityKind = readEnumParam(
    resolvedSearchParams,
    "commodityKind",
    IMPORT_COMMODITY_KINDS,
  );

  const [
    reportersResult,
    insightsResult,
    demandSignalsResult,
    assessmentsResult,
    pickerAssessmentsResult,
    assessmentGridResult,
    commoditiesResult,
    kindsResult,
  ] = await Promise.all([
    listImportReporters(requestOptions),
    listMarketInsights({ limit: INSIGHTS_PAGE_LIMIT }, requestOptions),
    listDemandSignals({ limit: DEMAND_SIGNALS_PAGE_LIMIT }, requestOptions),
    listLocalizationAssessments(
      { limit: LEADERBOARD_LIMIT, reporterCountryCode, commodityKind },
      requestOptions,
    ),
    // The PICKER's own read: manufactured kinds only, and a full page of them.
    //
    // ⚠️ A SEPARATE READ FROM THE LEADERBOARD ABOVE, ON PURPOSE. The leaderboard is the
    // ranking as it stands, petroleum and unwrought gold included, because that is what the
    // ranking says. The chart is a "what should I build" surface and must not open with five
    // answers that are not manufacturing, so it asks the backend to drop fuel, gems, ores and
    // crops. Filtering the leaderboard's page client-side instead would return 33 rows and
    // call them a top-50.
    listLocalizationAssessments(
      { limit: PICKER_LIMIT, reporterCountryCode, commodityKind, manufacturedOnly: true },
      requestOptions,
    ),
    // The SAME filters as the leaderboard above, and that is load-bearing: the scatter's
    // quadrant counts and the ranked list beneath it must describe one population, or the
    // chart says 5,469 while the list says something else and neither is wrong on its face.
    listLocalizationAssessmentGrid({ reporterCountryCode, commodityKind }, requestOptions),
    listImportCommodities(
      {
        limit: CATALOGUE_LIMIT,
        reporterCountryCode,
        commodityKind: readEnumParam(resolvedSearchParams, "catalogueKind", IMPORT_COMMODITY_KINDS),
      },
      requestOptions,
    ),
    listImportCommodityKinds(requestOptions),
  ]);

  // Secondary reads: losing one costs a section or a chip row, not the page.
  const reporters = reportersResult.success ? reportersResult.data : [];
  const commodityKinds = kindsResult.success ? kindsResult.data : [];
  const assessments = assessmentsResult.success ? assessmentsResult.data.rows : [];
  const assessmentGridCells = assessmentGridResult.success ? assessmentGridResult.data : [];
  const pickerAssessments = pickerAssessmentsResult.success
    ? pickerAssessmentsResult.data.rows
    : [];
  const demandSignals = demandSignalsResult.success ? demandSignalsResult.data.rows : [];
  const commodities = commoditiesResult.success ? commoditiesResult.data.rows : [];

  // The agreement band's join key. Built from the catalogue page the surface already has —
  // the assessment rows carry an `hsCode` but not a category, and inventing a second read to
  // fetch one would buy a join the copy already says is approximate.
  const commodityCategoryByHsCode = new Map(
    commodities.map((commodity) => [commodity.hsCode, commodity.researchCategorySlug]),
  );

  const catalogueTotal = commoditiesResult.success ? commoditiesResult.data.pagination.total : 0;
  const rankedTotal = assessmentsResult.success ? assessmentsResult.data.pagination.total : 0;

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="space-y-1 px-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Market Research</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Two ways to find something worth building: what people are reporting as problems, and what
          this country is paying foreigners for. Both are ranked; neither is combined into the
          other.
        </p>
      </header>

      <MarketResearchTabs activeTab={activeTab} searchParams={resolvedSearchParams} />

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <MarketResearchOverview
            reporters={reporters}
            selectedCountryCode={reporterCountryCode}
            assessments={assessments}
            demandSignals={demandSignals}
            totalCommodityCount={catalogueTotal}
            searchParams={resolvedSearchParams}
          />

          <div className="px-4 lg:px-6">
            {pickerAssessments.length === 0 ? (
              <RndStatusPanel message="Nothing has been scored for this country yet." />
            ) : (
              <OpportunityScatter
                assessments={pickerAssessments}
                reporterCountryCode={reporterCountryCode}
                scoredCommodityCount={assessmentGridCells.reduce(
                  (running, cell) => running + cell.commodityCount,
                  0,
                )}
              />
            )}
          </div>

          <div className="px-4 lg:px-6">
            <SignalAgreementBand
              demandSignals={demandSignals}
              assessments={assessments}
              commodityCategoryByHsCode={commodityCategoryByHsCode}
            />
          </div>

          <div className="px-4 lg:px-6">
            <RuledOutPanel
              catalogueTotal={catalogueTotal}
              rankedTotal={rankedTotal}
              hasDemandRun={demandSignals.length > 0}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "demand" ? (
        <div className="space-y-8 px-4 lg:px-6">
          <section className="space-y-4">
            <h2 className="font-serif text-xl">Market insights</h2>
            {renderInsights(toListViewState(insightsResult))}
          </section>
          {renderDemandSignals(toListViewState(demandSignalsResult))}
        </div>
      ) : null}

      {activeTab === "import-substitution" ? (
        <div className="space-y-8">
          <MarketResearchOverview
            reporters={reporters}
            selectedCountryCode={reporterCountryCode}
            assessments={assessments}
            demandSignals={demandSignals}
            totalCommodityCount={catalogueTotal}
            searchParams={resolvedSearchParams}
          />
          {renderLeaderboard()}
          {renderCatalogue()}
        </div>
      ) : null}
    </div>
  );

  function renderLeaderboard() {
    const state = toListViewState(assessmentsResult);
    switch (state.status) {
      case "error":
        return (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the feasibility ranking." />
          </div>
        );
      case "empty":
      case "ready":
        return (
          <LocalizationLeaderboard
            assessments={state.status === "ready" ? state.rows : []}
            pagination={assessmentsResult.success ? assessmentsResult.data.pagination : null}
            commodityKinds={commodityKinds}
            searchParams={resolvedSearchParams}
          />
        );
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }

  function renderCatalogue() {
    const state = toListViewState(commoditiesResult);
    switch (state.status) {
      case "error":
        return (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the commodity catalogue." />
          </div>
        );
      case "empty":
      case "ready":
        return (
          <CommodityDirectory
            commodities={state.status === "ready" ? state.rows : []}
            pagination={commoditiesResult.success ? commoditiesResult.data.pagination : null}
            commodityKinds={commodityKinds}
            searchParams={resolvedSearchParams}
          />
        );
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }
}

// Exhaustive switches with a `never` default (CLAUDE.md Pattern 1): adding a variant to
// `ListViewState` becomes a compile error here rather than a silently unhandled state.
function renderInsights(state: ListViewState<MarketInsight>) {
  switch (state.status) {
    case "error":
      return <RndErrorPanel message="Couldn't load market insights." />;
    case "empty":
      return <RndStatusPanel message="No market insights published yet." />;
    case "ready":
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.rows.map((insight) => (
            <MarketInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function renderDemandSignals(state: ListViewState<DemandSignal>) {
  switch (state.status) {
    case "error":
      return <RndErrorPanel message="Couldn't load the demand leaderboard." />;
    // No rows means no scoring run has completed. That is a real, distinct state — not a
    // zeroed table, which would publish "no demand anywhere" as a finding about the world
    // rather than about the job.
    case "empty":
      return <RndStatusPanel message="No demand snapshot has been computed yet." />;
    case "ready":
      return <TrendingDemandSignals signals={state.rows} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
