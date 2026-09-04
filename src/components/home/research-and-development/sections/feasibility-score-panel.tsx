// TRANSPORT: props-only — presentational. Fetches nothing and computes nothing.

import { formatIsoInstant } from "@/lib/rnd/format";
import { formatLeadTimeDays, formatTradeValueExact } from "@/lib/rnd/import-format";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";
import { LOCALIZATION_SCORE_COMPONENT_LABELS } from "@/lib/rnd/labels";

/**
 * The feasibility score, broken into the five components that make it.
 *
 * ⚠️ IT RE-DERIVES NOTHING. Every number here is read straight off the assessment row, and
 * a database CHECK already guarantees the five components sum to the total — so this panel
 * displays a breakdown rather than computing one. If it added them up itself, a future
 * scoring change would produce a page that silently disagreed with its own database.
 *
 * ⚠️ THE COMPONENTS ARE SHOWN EVEN WHEN THEY ARE ZERO. A zero here is a finding — "the
 * country exports none of this" is exactly the sort of thing a founder is looking for — and
 * hiding empty rows would turn the most informative case into a blank.
 */
export default function FeasibilityScorePanel({
  assessment,
}: {
  assessment: LocalizationAssessment;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#CAC4D0]/60 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg">Feasibility to make here</h2>
          <p className="text-xs text-muted-foreground">
            Rank #{assessment.rank} · computed {formatIsoInstant(assessment.asOf)} · algorithm v
            {assessment.scoreAlgorithmVersion}
          </p>
        </div>
        <p className="shrink-0 text-3xl font-semibold text-[#00696E]">
          {assessment.feasibilityScorePoints}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </p>
      </div>

      <ul className="space-y-3">
        {LOCALIZATION_SCORE_COMPONENT_LABELS.map((component) => {
          const points = assessment[component.key];
          const filledPercent = Math.round((points / component.budget) * 100);
          return (
            <li key={component.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{component.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {points} of {component.budget}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-[#00696E]"
                  style={{ width: `${filledPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{component.explanation}</p>
            </li>
          );
        })}
      </ul>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#CAC4D0]/60 pt-4 text-xs">
        <dt className="text-muted-foreground">Annual imports</dt>
        <dd className="text-right tabular-nums">
          {formatTradeValueExact(assessment.observedImportValueInCents, assessment.currency)}
        </dd>
        <dt className="text-muted-foreground">Annual exports</dt>
        <dd className="text-right tabular-nums">
          {formatTradeValueExact(assessment.observedExportValueInCents, assessment.currency)}
        </dd>
        <dt className="text-muted-foreground">Published substitutes</dt>
        <dd className="text-right tabular-nums">{assessment.substituteCount}</dd>
        <dt className="text-muted-foreground">Matching suppliers</dt>
        <dd className="text-right tabular-nums">
          {assessment.matchedSupplierCount}
          {assessment.verifiedSupplierCount > 0
            ? ` (${assessment.verifiedSupplierCount} verified)`
            : ""}
        </dd>
        <dt className="text-muted-foreground">Domestic lead time</dt>
        {/* NULL is "no supplier published one", never zero days. */}
        <dd className="text-right">{formatLeadTimeDays(assessment.medianSupplierLeadTimeDays)}</dd>
      </dl>
    </section>
  );
}
