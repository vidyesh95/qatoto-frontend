// TRANSPORT: props-only — presentational. Fetches nothing.

import { formatConfidenceBps } from "@/lib/rnd/import-format";
import type {
  LocalizationNarrativeStatus,
  LocalizationPathwaySuggestion,
} from "@/lib/rnd/import-intelligence.schemas";
import {
  LOCALIZATION_NARRATIVE_STATUS_LABELS,
  LOCALIZATION_PATHWAY_STATUS_LABELS,
} from "@/lib/rnd/labels";

/**
 * The AI-written pathway to local production.
 *
 * ⚠️ PROVENANCE IS ALWAYS SHOWN — the model, the prompt version and the confidence. A
 * machine opinion whose origin is hidden reads as a platform ruling, which is the rule
 * `optimization-tab.tsx` states for the other AI surface in this domain and it is unchanged
 * here.
 *
 * ⚠️ THE PROSE SITS BELOW THE SCORE, NEVER BESIDE IT AS AN EQUAL. The score is arithmetic
 * over customs filings; this is a model describing that arithmetic. A layout that gave them
 * the same weight would invite a reader to treat a paragraph as evidence.
 *
 * ⚠️ `skipped_unconfigured` IS NOT AN ERROR STATE. It means the environment has no model
 * key. The score above is real and complete, and rendering a red failure beside it would
 * misreport an operator fact as a problem with the analysis.
 */
export default function LocalizationPathwayPanel({
  narrativeStatus,
  suggestions,
}: {
  narrativeStatus: LocalizationNarrativeStatus;
  suggestions: readonly LocalizationPathwaySuggestion[];
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-serif text-lg">Suggested pathway</h2>
        <p className="text-xs text-muted-foreground">
          Written by a language model over the score above. Advisory — it decides nothing and moves
          no figure.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-[#CAC4D0]/60 px-5 py-6">
          <p className="text-sm text-muted-foreground">
            {LOCALIZATION_NARRATIVE_STATUS_LABELS[narrativeStatus]}.
            {narrativeStatus === "pending"
              ? " The score beside it is already complete; the write-up follows the nightly run."
              : null}
            {narrativeStatus === "skipped_unconfigured"
              ? " The score beside it is real and complete — only the prose is missing."
              : null}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-medium">{suggestion.title}</h3>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {LOCALIZATION_PATHWAY_STATUS_LABELS[suggestion.status]}
                </span>
              </div>

              {/* `whitespace-pre-line` because the body is paragraphs joined by newlines. */}
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {suggestion.bodyText}
              </p>

              {suggestion.decisionNote === null ? null : (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs">
                  Reviewer note: {suggestion.decisionNote}
                </p>
              )}

              {/* Never optional, never collapsed. NULL confidence says so in words. */}
              <p className="border-t border-[#CAC4D0]/60 pt-3 text-xs text-muted-foreground">
                {suggestion.modelName}
                {suggestion.modelVersion === null ? "" : ` (${suggestion.modelVersion})`} · prompt{" "}
                {suggestion.promptVersion} · {formatConfidenceBps(suggestion.confidenceBps)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
