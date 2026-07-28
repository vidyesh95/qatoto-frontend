// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import type { AiSummaryChipKind } from "@/types/research-and-development";

// The four chip kinds the AI pass can attach to a log, with the exact colors
// daily-log-card.tsx renders. Colorblind-safe by construction: the kind is
// carried by the word as well as the color.
const AI_SUMMARY_CHIP_LEGEND: Record<AiSummaryChipKind, { label: string; meaning: string }> = {
  progress: { label: "Progress", meaning: "Something shipped, moved or got measurably closer." },
  velocity: { label: "Velocity", meaning: "How the pace compares to the days before it." },
  blocker: { label: "Blocker", meaning: "Something is stopping the work and needs a decision." },
  suggestion: {
    label: "Suggestion",
    meaning: "A next step the analysis proposes — never an order.",
  },
};

const AI_SUMMARY_CHIP_COLOR_CLASSES: Record<AiSummaryChipKind, string> = {
  blocker: "bg-red-100 text-red-800",
  progress: "bg-green-100 text-green-800",
  velocity: "bg-blue-100 text-blue-800",
  suggestion: "bg-amber-100 text-amber-800",
};

const AI_SUMMARY_CHIP_ORDER: AiSummaryChipKind[] = [
  "progress",
  "velocity",
  "blocker",
  "suggestion",
];

// Verification is a pipeline with six outcomes, not a yes/no. The feed cards
// still render today's single "verified" badge, so this list is where the rest
// of the vocabulary is stated — a log with no badge has not necessarily failed
// anything, it may simply not have been analyzed yet.
const VERIFICATION_STATES: { key: string; label: string; meaning: string }[] = [
  { key: "not_run", label: "Not run", meaning: "No verification has been attempted on this log." },
  { key: "queued", label: "Queued", meaning: "Waiting for a verification run to pick it up." },
  { key: "running", label: "Running", meaning: "A run is in progress; there is no verdict yet." },
  {
    key: "verified",
    label: "Verified",
    meaning: "The claim matched the evidence. This is the badge on a card.",
  },
  {
    key: "flagged_for_review",
    label: "Flagged for review",
    meaning: "A human decides, in writing, and can reverse the flag. Cash is untouched either way.",
  },
  {
    key: "unverified",
    label: "Unverified",
    meaning: "The run finished without enough evidence to confirm the claim.",
  },
];

// Stage 04 legend. Spelled out once here so every card in the feed below can
// stay compact.
export default function LogLegend() {
  return (
    <section className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
      <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <h2 className="text-sm font-medium tracking-wide">What the AI tags</h2>
        <ul className="space-y-2">
          {AI_SUMMARY_CHIP_ORDER.map((chipKind) => (
            <li key={chipKind} className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${AI_SUMMARY_CHIP_COLOR_CLASSES[chipKind]}`}
              >
                {AI_SUMMARY_CHIP_LEGEND[chipKind].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {AI_SUMMARY_CHIP_LEGEND[chipKind].meaning}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <h2 className="text-sm font-medium tracking-wide">What verification can say</h2>
        <ul className="space-y-2">
          {VERIFICATION_STATES.map((verificationState) => (
            <li key={verificationState.key} className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {verificationState.label}
              </span>
              <span className="text-xs text-muted-foreground">{verificationState.meaning}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Six outcomes, not two. A log without a verified badge has not been rejected — it may
          simply be waiting its turn.
        </p>
      </div>
    </section>
  );
}
