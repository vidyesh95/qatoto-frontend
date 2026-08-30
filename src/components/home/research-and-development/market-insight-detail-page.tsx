// TRANSPORT: server-fetch — server component. Reads GET /discovery/market-insights/:insightId
// via @/lib/rnd/discovery.api, with the session cookie forwarded by callerRequestOptions().
// The read is public. Fetches nothing else.
import Link from "next/link";
import { notFound } from "next/navigation";

import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { getMarketInsight } from "@/lib/rnd/discovery.api";
import { formatMarketInsightStat } from "@/lib/rnd/discovery-format";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { TrendDirection } from "@/lib/rnd/shared.schemas";
import { callerRequestOptions } from "@/lib/server-http";

/** Mirrors `market-insight-card.tsx`. The two render the same row and must not disagree. */
const TREND_INDICATORS: Record<
  TrendDirection,
  { glyph: string; label: string; className: string }
> = {
  up: { glyph: "▲", label: "Trending up", className: "text-green-600" },
  down: { glyph: "▼", label: "Trending down", className: "text-red-600" },
  flat: { glyph: "—", label: "Flat", className: "text-muted-foreground" },
};

/**
 * One published market insight.
 *
 * ADDRESSED BY ID, NOT SLUG — insights have no slug column, the same shape as a problem
 * cluster, so every link in carries the id the backend minted.
 *
 * A `404` becomes `notFound()` with no explanation. The backend answers 404 both for "no
 * such insight" and for one that is still an unpublished draft, and the two are
 * deliberately indistinguishable; a "this exists but isn't published" hint would make a
 * moderator's work in progress discoverable by id.
 *
 * ⚠️ SO DOES A `422`, AND THAT IS NOT THE USUAL RULE. `MarketInsightIdParamSchema` is
 * `z.uuid()`, so an id that is not a UUID is refused by shape BEFORE the lookup runs —
 * measured live: `/discovery/market-insights/__none__` answers 422, not 404. The only input
 * this route validates is the path segment, so a 422 here means the URL is a typo, and a
 * typo is a 404 rather than "couldn't load". Without this arm the SENTINEL PARAM that
 * `withSentinelValues` prerenders would serve an error panel — the one outcome
 * `@/lib/static-params` says it must not.
 *
 * THE STATISTIC IS COMPOSED HERE, not printed. `statKind` + `statValueMilli` +
 * `statUnitKey` are three typed fields and the sign, the `×` and the thousands separator
 * belong to the reader's locale — `formatMarketInsightStat` is the one place that decides,
 * shared with the card so a figure cannot read differently on the two surfaces.
 *
 * THE PROJECTS CITING THIS INSIGHT ARE NOT SHOWN. The link is published on the project —
 * `relatedInsights` on the project detail — and `MarketInsightView` exposes no inverse, so
 * there is nothing to render. This page links back to the hub rather than forward.
 */
export default async function MarketInsightDetailPage({ insightId }: { insightId: string }) {
  const requestOptions = await callerRequestOptions();
  const insightResult = await getMarketInsight(insightId, requestOptions);

  if (!insightResult.success) {
    if (insightResult.error.code === "404" || insightResult.error.code === "422") notFound();
    return (
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <RndErrorPanel message="Couldn't load this market insight." />
      </div>
    );
  }

  const insight = insightResult.data;
  const trendIndicator = TREND_INDICATORS[insight.trendDirection];

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-2">
        <Link
          href="/research-and-development/knowledge-hub"
          className="text-xs font-medium text-[#00696E]"
        >
          ← Knowledge Hub
        </Link>
        <p className="flex items-baseline gap-2 text-4xl font-semibold">
          {formatMarketInsightStat(insight)}
          <span className={`text-xl ${trendIndicator.className}`}>{trendIndicator.glyph}</span>
          <span className="text-xs font-normal text-muted-foreground">{trendIndicator.label}</span>
        </p>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">{insight.headline}</h1>
        <p className="text-sm text-muted-foreground">
          {insight.category.displayLabel} · {insight.region.displayLabel}
        </p>
      </header>

      {/* A summary is optional on the row and its absence renders as nothing — an
          insight is its statistic, and padding one with placeholder prose would imply
          the moderator wrote something they did not. */}
      {insight.summary !== null && (
        <p className="max-w-prose text-sm leading-6">{insight.summary}</p>
      )}

      <section className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <h2 className="text-sm font-medium tracking-wide">Source</h2>
        <p className="text-sm">
          {insight.sourceUrl === null ? (
            insight.sourceName
          ) : (
            <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {insight.sourceName}
            </a>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Published by the source on {insight.sourcePublishedDate} · moderated and published on
          Qatoto {formatIsoInstant(insight.publishedAt)}
        </p>
        <p className="text-xs text-muted-foreground">
          Qatoto publishes this figure as the source stated it. It is evidence a founder may cite,
          not a claim Qatoto measured.
        </p>
      </section>
    </div>
  );
}
