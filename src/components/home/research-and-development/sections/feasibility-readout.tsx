// TRANSPORT: props-only — presentational. Fetches nothing and computes nothing.

import HairlineDefinitionRow from "@/components/home/shared/hairline-definition-row";
import type { FeasibilityReadout } from "@/lib/rnd/discovery.schemas";
import { formatIsoDate } from "@/lib/rnd/format";
import { formatTradeValueCompact } from "@/lib/rnd/import-format";
import { FEASIBILITY_PILLAR_LABELS, RESEARCH_CATEGORY_DOMAIN_LABELS } from "@/lib/rnd/labels";

const WHOLE_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

/** The date part of an ISO instant, as "Sep 29, 2026". */
function formatInstantAsDate(isoInstant: string): string {
  return formatIsoDate(isoInstant.slice(0, 10));
}

function formatPillarPoints(pillar: { readonly points: number; readonly budget: number }): string {
  return `${String(pillar.points)} / ${String(pillar.budget)}`;
}

/** Tenths of a point as a one-decimal score: 569 → "56.9". */
function formatScoreInTenths(scoreInTenths: number): string {
  return (scoreInTenths / 10).toFixed(1);
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${WHOLE_NUMBER_FORMATTER.format(count)} ${count === 1 ? singular : plural}`;
}

/**
 * One country's feasibility readout — the four pillars of docs/FEASIBILITY_MODEL.md, side by
 * side and NEVER ADDED UP.
 *
 * ⚠️ NOT `feasibility-score-panel.tsx`. That panel is the import-substitution score for one HS6
 * commodity, whose five components a database CHECK sums to a total. Nothing here has a total:
 * need density is Qatoto's own reports, purchasing power the World Bank, manufacturing UN
 * Comtrade plus the supplier directory, the regulatory framework World Bank B-READY, and summing
 * them is the cross-evidence join
 * `R_AND_D_STRUCTURE.md` §7 forbids. So there is no total, no bar a reader could stack, no
 * colour per pillar, and no verdict word.
 *
 * ⚠️ AN ABSENT PILLAR RENDERS NOTHING — an empty cell, not a dash and not a zero. A null means
 * no source covers that cell, which is not a finding about the country (`docs/Design.md`, Stat
 * Readout). Purchasing power and the regulatory framework are country-level, so each is stated
 * once above the table. B-READY does not cover India or Kenya yet, so for them the regulatory
 * block is simply absent.
 *
 * Each figure's source and date sit beside it, not in a footnote (§20): the four sources have
 * four different vintages, and one "as of" would hide three of them.
 */
export default function FeasibilityReadoutSection({ readout }: { readout: FeasibilityReadout }) {
  const { purchasingPower, regulatoryFramework, domains } = readout;
  const firstNeedDensity = domains.find((row) => row.needDensity !== null)?.needDensity ?? null;
  const firstManufacturing =
    domains.find((row) => row.manufacturing !== null)?.manufacturing ?? null;

  if (purchasingPower === null && regulatoryFramework === null && domains.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-foreground">
          Feasibility in {readout.country.displayLabel}, by problem domain
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Up to four separate readouts, each from its own source. They are never added together.
        </p>
      </div>

      {purchasingPower !== null && (
        <div className="space-y-1">
          <HairlineDefinitionRow
            facts={[
              {
                label: FEASIBILITY_PILLAR_LABELS.purchasingPower,
                value: formatPillarPoints(purchasingPower),
              },
              {
                label: "GDP per capita, PPP",
                value: `$${WHOLE_NUMBER_FORMATTER.format(purchasingPower.valueInWholeInternationalDollars)}`,
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {purchasingPower.sourceName} · {purchasingPower.dataYear} data · retrieved{" "}
            {formatInstantAsDate(purchasingPower.sourceRetrievedAt)}
          </p>
        </div>
      )}

      {regulatoryFramework !== null && (
        <div className="space-y-1">
          <HairlineDefinitionRow
            facts={[
              {
                label: FEASIBILITY_PILLAR_LABELS.regulatoryFramework,
                value: formatPillarPoints(regulatoryFramework),
              },
              {
                label: "B-READY score",
                value: `${formatScoreInTenths(regulatoryFramework.scoreInTenths)} / 100`,
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {regulatoryFramework.sourceName} · {regulatoryFramework.editionYear} edition · retrieved{" "}
            {formatInstantAsDate(regulatoryFramework.sourceRetrievedAt)}. It scores regulation as
            written, not how hard it is to operate in practice.
          </p>
        </div>
      )}

      {domains.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl border-y border-border text-sm">
            <thead className="border-b border-border text-left align-bottom text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Domain
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  <span className="block text-foreground">
                    {FEASIBILITY_PILLAR_LABELS.needDensity}
                  </span>
                  {firstNeedDensity !== null && (
                    <span className="block font-normal">
                      {firstNeedDensity.sourceName} · {formatInstantAsDate(firstNeedDensity.asOf)}
                    </span>
                  )}
                </th>
                <th scope="col" className="py-2 font-medium">
                  <span className="block text-foreground">
                    {FEASIBILITY_PILLAR_LABELS.manufacturing}
                  </span>
                  {firstManufacturing !== null && (
                    <span className="block font-normal">
                      {firstManufacturing.sourceName} · {firstManufacturing.tradeDataYear} data
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {domains.map((row) => (
                <tr key={row.domain} className="align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                    {RESEARCH_CATEGORY_DOMAIN_LABELS[row.domain]}
                  </th>
                  <td className="py-2 pr-4">
                    {row.needDensity !== null && (
                      <>
                        <span className="block tabular-nums">
                          {formatPillarPoints(row.needDensity)}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {pluralize(
                            row.needDensity.distinctReporterCount,
                            "reporter",
                            "reporters",
                          )}{" "}
                          · {pluralize(row.needDensity.activeClusterCount, "place", "places")}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2">
                    {row.manufacturing !== null && (
                      <>
                        <span className="block tabular-nums">
                          {formatPillarPoints(row.manufacturing)}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {formatTradeValueCompact(
                            String(row.manufacturing.exportValueInCents),
                            row.manufacturing.currency,
                          )}{" "}
                          exports ·{" "}
                          {pluralize(
                            row.manufacturing.domesticProducerCount,
                            "listed producer",
                            "listed producers",
                          )}
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Computed {formatInstantAsDate(readout.asOf)} · model v{readout.modelVersion}.
        {domains.length > 0 && " An empty cell means no source covers it, not a zero."}
      </p>
    </section>
  );
}
