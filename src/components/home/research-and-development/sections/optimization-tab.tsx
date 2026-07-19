import type {
  OptimizationImpact,
  OptimizationSuggestion,
  OptimizationSuggestionKind,
} from "@/types/research-and-development";

const OPTIMIZATION_KIND_BADGES: Record<
  OptimizationSuggestionKind,
  { label: string; className: string }
> = {
  "time-reduction": { label: "Time reduction", className: "bg-blue-100 text-blue-800" },
  parallelization: { label: "Parallelization", className: "bg-[#00696E]/10 text-[#00696E]" },
  resequencing: { label: "Resequencing", className: "bg-violet-100 text-violet-800" },
  quality: { label: "Quality", className: "bg-amber-100 text-amber-800" },
};

const OPTIMIZATION_IMPACT_BADGES: Record<OptimizationImpact, { label: string; className: string }> =
  {
    high: { label: "High impact", className: "bg-green-100 text-green-800" },
    medium: { label: "Medium impact", className: "bg-muted text-muted-foreground" },
    low: { label: "Low impact", className: "bg-muted text-muted-foreground" },
  };

// Optimization tab: the AI build-process optimization engine (idea 1) surfaced
// as a first-class panel. It watches every logged build step and proposes time
// reduction, parallelization, resequencing, or quality wins — a promotion of
// the daily-log `suggestion` chip. Every suggestion is a display-only mock;
// the engine (critical-path analysis over the verification pipeline) is
// backend-owned later.
export default function OptimizationTab({
  suggestions,
}: {
  suggestions: OptimizationSuggestion[];
}) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Optimization suggestions</h3>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No optimization suggestions yet — they land as the team logs more build steps.
          </p>
        ) : (
          <ul className="space-y-4">
            {suggestions.map((suggestion) => {
              const kindBadge = OPTIMIZATION_KIND_BADGES[suggestion.kind];
              const impactBadge = OPTIMIZATION_IMPACT_BADGES[suggestion.impact];

              return (
                <li
                  key={suggestion.id}
                  className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${kindBadge.className}`}
                    >
                      {kindBadge.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${impactBadge.className}`}
                    >
                      {impactBadge.label}
                    </span>
                    {suggestion.estimatedTimeSavedLabel && (
                      <span className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
                        Saves {suggestion.estimatedTimeSavedLabel}
                      </span>
                    )}
                  </div>
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
                  {suggestion.evidenceLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.evidenceLabels.map((evidenceLabel) => (
                        <span
                          key={evidenceLabel}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {evidenceLabel}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Display-only mock — AI optimization is backend-owned later.
        </p>
      </section>
    </div>
  );
}
