// TRANSPORT: props-only — presentational. Fetches nothing.

import {
  describeEstimation,
  formatNetWeight,
  formatTradePeriod,
  formatTradeQuantity,
  formatTradeValueCompact,
} from "@/lib/rnd/import-format";
import type { CommodityTradeFlow } from "@/lib/rnd/import-intelligence.schemas";
import { TRADE_FLOW_KIND_LABELS } from "@/lib/rnd/labels";

/**
 * One commodity's traded magnitudes, year by year, in both directions.
 *
 * ⚠️ EVERY ROW SHOWS HOW ITS FIGURE WAS ARRIVED AT. A UNSD aggregate and a country-reported
 * figure are both legitimate data and are not the same claim; showing only the number
 * invites a reader to treat them alike. The provenance sits in the row, not in a footnote.
 *
 * ⚠️ THE SOURCE IS NAMED ON EVERY ROW for the same reason. A country-level import figure
 * with no visible provenance reads as something this platform asserts.
 *
 * Wide content scrolls inside its own container — the page body must never scroll
 * horizontally.
 */
export default function TradeFlowTable({ flows }: { flows: readonly CommodityTradeFlow[] }) {
  if (flows.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="font-serif text-lg">Trade history</h2>
        <p className="text-sm text-muted-foreground">
          {/* Not "0" — nobody filed a figure, which is different from trading none. */}
          No import data recorded for this commodity.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg">Trade history</h2>

      <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-[#CAC4D0]/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Year
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Direction
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Value
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Quantity
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Net weight
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                How it was measured
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CAC4D0]/60">
            {flows.map((flow) => (
              <tr key={flow.id}>
                <td className="px-4 py-2 tabular-nums">
                  {formatTradePeriod(flow.periodStartsDate)}
                </td>
                <td className="px-4 py-2">{TRADE_FLOW_KIND_LABELS[flow.flowKind]}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatTradeValueCompact(flow.tradeValueInCents, flow.currency)}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                  {formatTradeQuantity(flow.quantityMilli, flow.quantityUnit)}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                  {formatNetWeight(flow.netWeightMilliKilograms)}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {describeEstimation(flow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Source: {flows[0]?.sourceName}
        {flows[0]?.sourceUrl === null || flows[0]?.sourceUrl === undefined ? null : (
          <>
            {" · "}
            <a
              href={flows[0].sourceUrl}
              className="underline hover:text-[#00696E]"
              rel="noreferrer noopener"
              target="_blank"
            >
              {flows[0].sourceUrl}
            </a>
          </>
        )}
        . Figures are for all trading partners combined.
      </p>
    </section>
  );
}
