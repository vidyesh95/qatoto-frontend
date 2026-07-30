// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import { formatMoneyFromCents } from "@/lib/rnd/format";
import type { ResearchOpportunity } from "@/lib/rnd/research-programs.schemas";

type ResearchProgramProductsProps = {
  opportunities: ResearchOpportunity[];
};

/**
 * Research only pays for itself if something shippable comes out of it, so the program names the
 * products each branch could unlock.
 *
 * TWO MOCK STRINGS BECAME NUMBERS, and both are formatted here rather than on the wire:
 *
 *   `marketPotentialLabel: "$12B est. market"` → `estimatedMarketSizeInCents`, a bigint-scale
 *       integer. Formatted compactly below.
 *   `readinessLabel: "Monetizable in 2–4 yrs"` → `readinessMinMonths` + `readinessMaxMonths`,
 *       which is why the backend can sort this rail by market size and a sentence could not.
 *
 * THE PROJECTION IS THE PROGRAM'S OWN CLAIM, not Qatoto's finding — which is why the chip says
 * "est." and the eyebrow no longer reads "QATOTO HIGHLIGHTED". Only the program's creator or a
 * moderator can add one, so attributing it to the platform would be wrong.
 */
export default function ResearchProgramProducts({ opportunities }: ResearchProgramProductsProps) {
  if (opportunities.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <p className="max-w-2xl text-sm text-muted-foreground">
          No products have been derived from this research yet. The program&apos;s organisers add
          these as branches mature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Products the programme has identified as monetizable from this research. Building one funds
        the next round.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.opportunityId}
            className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
          >
            <p className="text-[10px] tracking-widest text-[#00696E]">DERIVED FROM RESEARCH</p>
            <p className="text-sm font-medium">{opportunity.productName}</p>
            <p className="text-xs text-muted-foreground">{opportunity.productDescription}</p>
            <p className="text-xs text-muted-foreground">
              From: {opportunity.derivedFromBranchTitle}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-[#00696E]/10 px-2.5 py-0.5 text-xs text-[#00696E]">
                {formatCompactMarketSize(opportunity.estimatedMarketSizeInCents)} est. market
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {formatReadinessWindow(
                  opportunity.readinessMinMonths,
                  opportunity.readinessMaxMonths,
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Whole years render as an integer; anything else keeps one decimal. */
function toYears(months: number): string {
  return months % 12 === 0 ? String(months / 12) : (months / 12).toFixed(1);
}

/**
 * Cents → a compact figure like "$12B".
 *
 * Rounded deliberately: a market projection accurate to the cent would imply a precision nobody
 * has. `formatMoneyFromCents` is used for the sub-billion tail, where the exact figure is at
 * least plausible.
 */
function formatCompactMarketSize(amountInCents: number): string {
  const amountInDollars = amountInCents / 100;
  if (amountInDollars >= 1_000_000_000) return `$${(amountInDollars / 1_000_000_000).toFixed(1)}B`;
  if (amountInDollars >= 1_000_000) return `$${(amountInDollars / 1_000_000).toFixed(1)}M`;
  return formatMoneyFromCents(amountInCents, "USD");
}

/**
 * Two month integers → a readable window.
 *
 * `0`–`0` is "Monetizable now", which is what makes the sort order useful: the readiest thing
 * sorts first without a special case anywhere else.
 */
function formatReadinessWindow(minMonths: number, maxMonths: number): string {
  if (maxMonths === 0) return "Monetizable now";
  if (minMonths === maxMonths) return `Monetizable in ${toYears(maxMonths)} yrs`;
  if (maxMonths < 12) return `Monetizable in ${String(minMonths)}–${String(maxMonths)} mo`;
  return `Monetizable in ${toYears(minMonths)}–${toYears(maxMonths)} yrs`;
}
