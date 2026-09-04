// TRANSPORT: server-fetch — server component. Reads GET /import-commodities/:hsCode first,
// then GET …/trade-flows and GET …/substitutes concurrently, via
// @/lib/rnd/import-intelligence.api with the session cookie forwarded by
// callerRequestOptions(). All three are public. No React Query here.

import { notFound } from "next/navigation";
import Link from "next/link";

import FeasibilityScorePanel from "@/components/home/research-and-development/sections/feasibility-score-panel";
import LocalizationPathwayPanel from "@/components/home/research-and-development/sections/localization-pathway-panel";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import SubstituteList from "@/components/home/research-and-development/sections/substitute-list";
import TradeFlowTable from "@/components/home/research-and-development/sections/trade-flow-table";
import {
  getImportCommodity,
  listCommoditySubstitutes,
  listCommodityTradeFlows,
} from "@/lib/rnd/import-intelligence.api";
import { IMPORT_COMMODITY_KIND_LABELS } from "@/lib/rnd/labels";
import { callerRequestOptions } from "@/lib/server-http";

const TRADE_FLOW_LIMIT = 24;
const SUBSTITUTE_LIMIT = 20;

/**
 * One commodity: what the country trades of it, what could replace it, and how feasible
 * making it here looks.
 *
 * ⚠️ THE COMMODITY READ RUNS FIRST AND ALONE. Its 404 is `notFound()` — the page does not
 * exist. Every other read on this page is about a commodity that already exists, so running
 * them concurrently with a read that might 404 would fetch three things for a page nobody
 * can see. Same ordering rule `project-detail.tsx` and `proof-of-effort-page.tsx` follow.
 *
 * ⚠️ A NULL ASSESSMENT IS NOT A 404. It means nothing has scored this commodity yet, and
 * the page renders the trade history without a score rather than pretending the commodity
 * is missing. "Not scored" and "no such commodity" are different facts.
 */
export default async function CommodityDetailPage({
  hsCode,
  reporterCountryCode,
}: {
  hsCode: string;
  reporterCountryCode?: string;
}) {
  const requestOptions = await callerRequestOptions();

  const detailResult = await getImportCommodity(hsCode, reporterCountryCode, requestOptions);

  if (!detailResult.success) {
    if (detailResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <RndErrorPanel message="Couldn't load this commodity." />
      </div>
    );
  }

  const { commodity, assessment, pathwaySuggestions } = detailResult.data;

  const [tradeFlowsResult, substitutesResult] = await Promise.all([
    listCommodityTradeFlows(hsCode, { limit: TRADE_FLOW_LIMIT }, requestOptions),
    listCommoditySubstitutes(hsCode, { limit: SUBSTITUTE_LIMIT }, requestOptions),
  ]);

  // Secondary reads: losing either costs a section, not the page. `rowsOrEmpty` takes a
  // bare array, and these are paginated envelopes — so the rows come off `.data.rows`.
  const tradeFlows = tradeFlowsResult.success ? tradeFlowsResult.data.rows : [];
  const substitutes = substitutesResult.success ? substitutesResult.data.rows : [];

  return (
    <div className="space-y-8 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/research-and-development/import-intelligence" className="hover:text-[#00696E]">
          Import intelligence
        </Link>
      </nav>

      <header className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">HS {commodity.hsCode}</p>
        <h1 className="font-serif text-2xl">{commodity.displayLabel}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {IMPORT_COMMODITY_KIND_LABELS[commodity.commodityKind]}
          </span>
          <Link
            href={`/research-and-development/problem-map?category=${commodity.researchCategorySlug}`}
            className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs text-[#00696E] hover:underline"
          >
            {commodity.researchCategorySlug}
          </Link>
        </div>
        {commodity.descriptionText === null ? null : (
          <p className="max-w-2xl text-sm text-muted-foreground">{commodity.descriptionText}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <TradeFlowTable flows={tradeFlows} />
          <SubstituteList substitutes={substitutes} />
          {assessment === null ? null : (
            <LocalizationPathwayPanel
              narrativeStatus={assessment.narrativeStatus}
              suggestions={pathwaySuggestions}
            />
          )}
        </div>

        <aside className="space-y-4">
          {assessment === null ? (
            <section className="rounded-2xl border border-[#CAC4D0]/60 px-5 py-6">
              <h2 className="font-serif text-lg">Feasibility to make here</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {/* Absence, not zero. A score of 0 would be a claim; this is its lack. */}
                Not scored yet. The feasibility run happens nightly and covers commodities the
                country actually imports.
              </p>
            </section>
          ) : (
            <FeasibilityScorePanel assessment={assessment} />
          )}
        </aside>
      </div>
    </div>
  );
}
