// TRANSPORT: server-fetch — server component. Reads GET /localization-assessments,
// GET /import-commodities and GET /import-commodity-kinds via @/lib/rnd/import-intelligence.api,
// with the session cookie forwarded by callerRequestOptions(). All three are public.
// No React Query here.

import CommodityDirectory from "@/components/home/research-and-development/sections/commodity-directory";
import LocalizationLeaderboard from "@/components/home/research-and-development/sections/localization-leaderboard";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { readEnumParam, readPatternParam, type RawSearchParams } from "@/lib/filter-href";
import {
  listImportCommodities,
  listImportCommodityKinds,
  listLocalizationAssessments,
} from "@/lib/rnd/import-intelligence.api";
import { IMPORT_COMMODITY_KINDS } from "@/lib/rnd/import-intelligence.schemas";
import { callerRequestOptions } from "@/lib/server-http";
import { rowsOrEmpty, toListViewState } from "@/lib/view-state";

const LEADERBOARD_LIMIT = 24;
const CATALOGUE_LIMIT = 30;

/** ISO-3166 alpha-2, the shape `discovery_region.country_code` stores. */
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/**
 * Import intelligence (§20) — what this country buys from abroad, and what could be made
 * here instead.
 *
 * A SIBLING OF THE KNOWLEDGE HUB, not a pipeline stage. It is a reference surface consulted
 * before and during the early stages rather than a step anyone walks through, which is why
 * it sits beside `/problem-map` instead of inside `pipeline-stages-strip.tsx`.
 *
 * TWO LISTS, DELIBERATELY. The leaderboard answers "where should I look" and is ranked; the
 * catalogue answers "is my thing in here" and is not. Merging them would either hide a
 * commodity nobody has scored yet or invent a rank for it.
 *
 * The two reads use SEPARATE filter keys (`commodityKind` and `catalogueKind`) so a chip in
 * one section does not silently re-filter the other — they are different questions and a
 * shared key would make one of them answer the wrong one.
 */
export default async function ImportIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  // `readPatternParam` already exists for exactly this shape (`src/lib/filter-href.ts`).
  const reporterCountryCode = readPatternParam(
    resolvedSearchParams,
    "reporterCountryCode",
    COUNTRY_CODE_PATTERN,
  );

  const [assessmentsResult, commoditiesResult, kindsResult] = await Promise.all([
    listLocalizationAssessments(
      {
        limit: LEADERBOARD_LIMIT,
        reporterCountryCode,
        commodityKind: readEnumParam(resolvedSearchParams, "commodityKind", IMPORT_COMMODITY_KINDS),
      },
      requestOptions,
    ),
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

  const assessmentsState = toListViewState(assessmentsResult);
  const commoditiesState = toListViewState(commoditiesResult);
  // Secondary read: losing it costs a chip row, not the page.
  const commodityKinds = rowsOrEmpty(kindsResult);

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <section className="space-y-2 px-4 lg:px-6">
        <h1 className="font-serif text-2xl">Import intelligence</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What this country already buys from abroad, and how feasible it looks to make here
          instead. Trade figures come from UN Comtrade; the feasibility score is arithmetic over
          them, and the pathway notes are advisory.
        </p>
      </section>

      {renderLeaderboard()}
      {renderCatalogue()}
    </div>
  );

  function renderLeaderboard() {
    switch (assessmentsState.status) {
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
            assessments={assessmentsState.status === "ready" ? assessmentsState.rows : []}
            pagination={assessmentsResult.success ? assessmentsResult.data.pagination : null}
            commodityKinds={commodityKinds}
            searchParams={resolvedSearchParams}
          />
        );
      default: {
        const exhaustiveCheck: never = assessmentsState;
        return exhaustiveCheck;
      }
    }
  }

  function renderCatalogue() {
    switch (commoditiesState.status) {
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
            commodities={commoditiesState.status === "ready" ? commoditiesState.rows : []}
            pagination={commoditiesResult.success ? commoditiesResult.data.pagination : null}
            commodityKinds={commodityKinds}
            searchParams={resolvedSearchParams}
          />
        );
      default: {
        const exhaustiveCheck: never = commoditiesState;
        return exhaustiveCheck;
      }
    }
  }
}
