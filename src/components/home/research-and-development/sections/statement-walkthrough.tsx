import {
  derivePaymentState,
  formatEffortFromMinutes,
  formatHourlyRateFromCents,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatPeriodRange,
  formatSignedEquityFromBasisPoints,
  shortenHashForDisplay,
  PAYMENT_STATE_BADGES,
} from "@/components/home/research-and-development/sections/compensation-format";
import type { CompensationPeriod, CompensationPeriodLine } from "@/types/research-and-development";

const LINE_KIND_LABELS: Record<CompensationPeriodLine["kind"], string> = {
  cash_retainer: "Cash · retainer",
  cash_hourly: "Cash · hourly",
  equity_delta: "Equity delta",
};

// Composes the amount cell from the typed integers on the line. The union is
// what stops an equity delta being summed into a cash total: the equity branch
// carries no money field at all.
function describeLineAmount(line: CompensationPeriodLine): string {
  switch (line.kind) {
    case "cash_retainer":
      return formatMoneyFromCents(line.grossAmountInCents, line.currency);
    case "cash_hourly":
      return formatMoneyFromCents(line.grossAmountInCents, line.currency);
    case "equity_delta":
      return formatSignedEquityFromBasisPoints(line.deltaBasisPoints);
    default: {
      const exhaustiveCheck: never = line;
      return exhaustiveCheck;
    }
  }
}

type StatementWalkthroughProps = {
  period: CompensationPeriod;
  memberLabelsById: Record<string, string>;
};

// One worked month-end statement, read-only and deliberately so.
//
// Two things about it are load-bearing. It is AUTHORED SAMPLE DATA — the rows
// describe roles, not people, because a real member's cash figure has no place
// on a public cross-project page. And it carries no actions: finalize,
// countersign, record-payment, confirm and export are actor-scoped and live on
// the per-project governance tab, where the actor's role is already resolved.
export default function StatementWalkthrough({
  period,
  memberLabelsById,
}: StatementWalkthroughProps) {
  return (
    <section id="statement-walkthrough" className="scroll-mt-20 space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          What a month-end statement looks like
        </h2>
        <p className="text-xs text-muted-foreground">
          A worked example, not a real team&apos;s figures. Each project&apos;s own members see
          their real statement on the project&apos;s governance tab.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-semibold">
              {formatPeriodRange(period.periodStartDate, period.periodEndDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatIsoDate(period.periodStartDate)} – {formatIsoDate(period.periodEndDate)} ·{" "}
              {period.timeZone}
            </p>
          </div>
          <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs font-medium text-[#00696E]">
            Finalized
          </span>
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p>
            Finalized by {period.finalizedByName} ·{" "}
            {period.finalizedAt === null ? "—" : formatIsoInstant(period.finalizedAt)}
          </p>
          <p>
            Countersigned by {period.countersignedByName} ·{" "}
            {period.countersignedAt === null ? "—" : formatIsoInstant(period.countersignedAt)}
          </p>
          {/* Display only — a 64-char hash is never a key, a cache key or an
              equality test, because a short form collides. */}
          <p>
            Statement hash{" "}
            {period.statementHash === null ? "—" : shortenHashForDisplay(period.statementHash)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Member
                </th>
                <th scope="col" className="py-2 font-medium">
                  Line
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody>
              {period.lines.map((line) => {
                const paymentState = derivePaymentState(line, period.payments);
                return (
                  <tr key={line.id} className="border-t border-[#CAC4D0]/40 align-top">
                    <td className="py-3 pr-3">
                      {memberLabelsById[line.memberId] ?? "A team member"}
                    </td>
                    <td className="py-3 pr-3">
                      <p>{LINE_KIND_LABELS[line.kind]}</p>
                      {line.kind === "cash_hourly" && (
                        <p className="text-xs text-muted-foreground">
                          {formatEffortFromMinutes(line.verifiedEffortMinutes)} verified at{" "}
                          {formatHourlyRateFromCents(line.hourlyRateInCents, line.currency)}
                        </p>
                      )}
                      {line.verificationNote && (
                        <p className="mt-1 text-xs text-amber-800">{line.verificationNote}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium">{describeLineAmount(line)}</td>
                    <td className="py-3 text-right">
                      {line.kind === "equity_delta" ? (
                        <span className="text-xs text-muted-foreground">Not a payment</span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATE_BADGES[paymentState].className}`}
                        >
                          {PAYMENT_STATE_BADGES[paymentState].label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Every cash figure here is gross. A recorded payment the member has not confirmed reads as
          unconfirmed, never as paid — and a correction supersedes the whole statement rather than
          editing a line in place.
        </p>
      </div>
    </section>
  );
}
