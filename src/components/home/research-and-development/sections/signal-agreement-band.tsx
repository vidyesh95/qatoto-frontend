// TRANSPORT: props-only — presentational. Fetches nothing.

import Link from "next/link";

import type { DemandSignal } from "@/lib/rnd/discovery.schemas";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";

/**
 * Research categories where BOTH evidence bases point the same way.
 *
 * ⚠️ THIS IS A CORRELATION, NOT A SCORE, AND THE COPY SAYS SO. There is no join on the wire:
 * demand signals are keyed `(category × region)` and localization assessments are keyed
 * `(HS6 commodity × country)`, and nothing the backend returns relates them. What is joinable
 * is the research category — `commodity-detail-page.tsx` already links a commodity to
 * `/problem-map?category={researchCategorySlug}` on exactly that basis.
 *
 * So this band says "people are reporting problems in this category AND the country imports a
 * lot of it", which is a real and useful coincidence. It does NOT say the two numbers combine,
 * because they do not — one counts people, the other counts customs filings, and averaging them
 * would produce a figure that means nothing and looks like it means something.
 *
 * ⚠️ THE CATEGORY IS THE COARSEST POSSIBLE JOIN. Eight categories cover 5,668 commodities, so
 * an agreement here is a hint about where to look, not a match between a problem and a product.
 * The copy has to carry that or the surface overclaims.
 */

/** A demand cell below this is not a signal worth pairing with anything. */
const MINIMUM_DEMAND_SCORE = 30;
/** Likewise for the localization side. */
const MINIMUM_FEASIBILITY_SCORE = 30;
const MAXIMUM_ROWS = 6;

interface AgreementRow {
  readonly categorySlug: string;
  readonly categoryLabel: string;
  readonly demandScorePoints: number;
  readonly regionLabel: string;
  readonly topCommodityLabel: string;
  readonly topCommodityHsCode: string;
  readonly topFeasibilityScorePoints: number;
  readonly commodityCount: number;
}

function buildAgreementRows(
  demandSignals: readonly DemandSignal[],
  assessments: readonly LocalizationAssessment[],
  commodityCategoryByHsCode: ReadonlyMap<string, string>,
): readonly AgreementRow[] {
  // The strongest assessment per category, and how many cleared the bar.
  const bestByCategory = new Map<string, { best: LocalizationAssessment; count: number }>();
  for (const assessment of assessments) {
    if (assessment.feasibilityScorePoints < MINIMUM_FEASIBILITY_SCORE) continue;
    const categorySlug = commodityCategoryByHsCode.get(assessment.hsCode);
    if (categorySlug === undefined) continue;

    const existing = bestByCategory.get(categorySlug);
    if (existing === undefined) {
      bestByCategory.set(categorySlug, { best: assessment, count: 1 });
      continue;
    }
    bestByCategory.set(categorySlug, {
      best:
        assessment.feasibilityScorePoints > existing.best.feasibilityScorePoints
          ? assessment
          : existing.best,
      count: existing.count + 1,
    });
  }

  const rows: AgreementRow[] = [];
  const seenCategories = new Set<string>();

  for (const signal of demandSignals) {
    if (signal.demandScorePoints < MINIMUM_DEMAND_SCORE) continue;
    const categorySlug = signal.category.slug;
    if (seenCategories.has(categorySlug)) continue;

    const paired = bestByCategory.get(categorySlug);
    if (paired === undefined) continue;

    seenCategories.add(categorySlug);
    rows.push({
      categorySlug,
      categoryLabel: signal.category.displayLabel,
      demandScorePoints: signal.demandScorePoints,
      regionLabel: signal.region.displayLabel,
      topCommodityLabel: paired.best.commodityLabel,
      topCommodityHsCode: paired.best.hsCode,
      topFeasibilityScorePoints: paired.best.feasibilityScorePoints,
      commodityCount: paired.count,
    });
  }

  return rows.slice(0, MAXIMUM_ROWS);
}

export default function SignalAgreementBand({
  demandSignals,
  assessments,
  commodityCategoryByHsCode,
}: {
  demandSignals: readonly DemandSignal[];
  assessments: readonly LocalizationAssessment[];
  commodityCategoryByHsCode: ReadonlyMap<string, string>;
}) {
  const rows = buildAgreementRows(demandSignals, assessments, commodityCategoryByHsCode);

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Both signals agree</h2>
        <p className="text-sm text-muted-foreground">
          Categories where people are reporting problems <em>and</em> the country imports heavily. A
          coincidence worth looking at — not a combined score. The two numbers count different
          things and are shown separately for that reason.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {/* Not an error and not zero — the two datasets simply do not overlap right now. */}
          No category currently clears the bar on both sides. That is a real finding: it means the
          problems people are reporting and the goods the country buys abroad are not pointing at
          the same place yet.
        </p>
      ) : (
        <ul className="divide-y divide-[#CAC4D0]/60">
          {rows.map((row) => (
            <li key={row.categorySlug} className="flex flex-wrap gap-x-4 gap-y-1 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.categoryLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Demand {row.demandScorePoints}/100 in {row.regionLabel} · {row.commodityCount}{" "}
                  commodit{row.commodityCount === 1 ? "y" : "ies"} scoring 30+
                </p>
              </div>
              <div className="min-w-0 sm:max-w-[45%] sm:text-right">
                <Link
                  href={`/research-and-development/import-intelligence/${row.topCommodityHsCode}`}
                  className="line-clamp-1 text-sm text-[#00696E] hover:underline"
                >
                  {row.topCommodityLabel}
                </Link>
                <p className="text-xs text-muted-foreground">
                  strongest here, {row.topFeasibilityScorePoints}/100
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-[#CAC4D0]/60 pt-3 text-xs text-muted-foreground">
        Joined on the research category, which is the coarsest link available — eight categories
        cover every commodity. Treat it as a hint about where to look, not as a match between a
        reported problem and a product.
      </p>
    </section>
  );
}
