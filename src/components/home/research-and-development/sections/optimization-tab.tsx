// TRANSPORT: client-query — "use client" island. Suggestions arrive as a view state from
// the server page (GET …/optimization-suggestions); accept and dismiss write
// POST …/optimization-suggestions/:id/accept and /dismiss.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { useDecideOptimizationSuggestionMutation } from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import type {
  OptimizationSuggestion,
  OptimizationSuggestionStatus,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedListViewState } from "@/lib/view-state";

const SUGGESTION_STATUS_LABELS: Record<OptimizationSuggestionStatus, string> = {
  open: "Open",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

/**
 * Advisory suggestions about how the team is spending its effort.
 *
 * ADVISORY IS THE WHOLE STATUS. Nothing here changes a slice, a rate or an allocation —
 * accepting one records that the team agreed, and that is all it does. A suggestion that
 * silently moved a number would be the model deciding equity.
 *
 * PROVENANCE IS ALWAYS SHOWN — model, prompt version and confidence. A machine opinion
 * whose origin is hidden reads as a platform ruling, and `confidenceBps` being null means
 * NO CONFIDENCE WAS RECORDED rather than zero confidence.
 *
 * The evidence list cites ledger sequence numbers, so a reader can go and check the entry
 * the suggestion is talking about instead of taking its word.
 */
export default function OptimizationTab({
  suggestionsState,
  projectSlug,
}: {
  suggestionsState: MemberScopedListViewState<OptimizationSuggestion>;
  projectSlug: string;
}) {
  const decideMutation = useDecideOptimizationSuggestionMutation(projectSlug);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const decideError =
    decideMutation.error instanceof ApiRequestError ? decideMutation.error.apiError : null;

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Optimization suggestions</h3>
        <p className="text-xs text-muted-foreground">
          Advice only. Accepting or dismissing one records what the team decided; it never moves a
          slice, a rate or an allocation.
        </p>
      </div>

      {renderSuggestions()}
      {decideError !== null && <MutationErrorNotice error={decideError} />}
    </div>
  );

  function renderSuggestions() {
    switch (suggestionsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the suggestions." />;
      case "restricted":
        return suggestionsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's suggestions." />
        ) : (
          <RndMembersOnlyPanel message="Suggestions are visible to this project's team." />
        );
      case "empty":
        return <RndStatusPanel message="No suggestions have been generated yet." />;
      case "ready":
        return (
          <ul className="space-y-3">
            {suggestionsState.rows.map((suggestion) => (
              <li
                key={suggestion.id}
                className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{suggestion.title}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {SUGGESTION_STATUS_LABELS[suggestion.status]}
                  </span>
                </div>

                <p className="text-sm">{suggestion.bodyText}</p>

                <p className="text-xs text-muted-foreground">
                  {suggestion.modelName}
                  {suggestion.modelVersion !== null && ` ${suggestion.modelVersion}`} · prompt{" "}
                  {suggestion.promptVersion} ·{" "}
                  {suggestion.confidenceBps === null
                    ? "no confidence recorded"
                    : `${(suggestion.confidenceBps / 100).toFixed(0)}% confidence`}{" "}
                  · as of {formatIsoInstant(suggestion.asOf)}
                </p>

                {suggestion.evidence.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {suggestion.evidence.map((evidence) => (
                      <li key={`${suggestion.id}-${evidence.sequenceNumber}`}>
                        Ledger #{evidence.sequenceNumber} — {evidence.label}
                      </li>
                    ))}
                  </ul>
                )}

                {suggestion.decidedAt !== null && (
                  <p className="text-xs text-muted-foreground">
                    Decided {formatIsoInstant(suggestion.decidedAt)}
                    {suggestion.decisionNote !== null && ` — ${suggestion.decisionNote}`}
                  </p>
                )}

                {suggestion.status === "open" && (
                  <div className="space-y-2">
                    <input
                      value={decisionNotes[suggestion.id] ?? ""}
                      onChange={(changeEvent) =>
                        setDecisionNotes((previousNotes) => ({
                          ...previousNotes,
                          [suggestion.id]: changeEvent.target.value,
                        }))
                      }
                      placeholder="Note (optional)"
                      className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={decideMutation.isPending}
                        onClick={() =>
                          decideMutation.mutate({
                            suggestionId: suggestion.id,
                            decision: "accept",
                            note: decisionNotes[suggestion.id],
                          })
                        }
                        className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={decideMutation.isPending}
                        onClick={() =>
                          decideMutation.mutate({
                            suggestionId: suggestion.id,
                            decision: "dismiss",
                            note: decisionNotes[suggestion.id],
                          })
                        }
                        className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = suggestionsState;
        return exhaustiveCheck;
      }
    }
  }
}
