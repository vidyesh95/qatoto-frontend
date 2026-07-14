import Image from "next/image";

import type {
  ClaimVerificationRun,
  TeamMember,
  VerificationStepKind,
  VerificationStepStatus,
  VerificationVerdict,
} from "@/types/research-and-development";

const VERDICT_BADGES: Record<VerificationVerdict, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-[#00696E]/10 text-[#00696E]" },
  "flagged-for-review": { label: "Flagged for review", className: "bg-amber-100 text-amber-800" },
  "unverified-zero-slices": {
    label: "Unverified — 0 slices",
    className: "bg-red-100 text-red-800",
  },
};

const STEP_LABELS: Record<VerificationStepKind, string> = {
  "claim-extraction": "Claim extraction",
  "artifact-grounding": "Artifact grounding",
  "substance-analysis": "Substance analysis",
  "temporal-analysis": "Temporal analysis",
};

const STEP_STATUS_STYLES: Record<
  VerificationStepStatus,
  { label: string; dotClassName: string; chipClassName: string }
> = {
  passed: {
    label: "Passed",
    dotClassName: "bg-[#00696E] text-white",
    chipClassName: "bg-[#00696E]/10 text-[#00696E]",
  },
  flagged: {
    label: "Flagged",
    dotClassName: "bg-amber-100 text-amber-800 ring-2 ring-amber-500",
    chipClassName: "bg-amber-100 text-amber-800",
  },
  "not-run": {
    label: "Not run",
    dotClassName: "bg-muted",
    chipClassName: "bg-muted text-muted-foreground",
  },
};

// One daily-log claim run through the four-step audit pipeline, with the
// stepper collapsed behind native <details>. Verdicts arrive precomputed on
// the mock data — the audit pipeline is backend-owned later.
export default function ClaimVerificationCard({
  run,
  author,
  linkedLogDateLabel,
}: {
  run: ClaimVerificationRun;
  author: TeamMember;
  linkedLogDateLabel?: string;
}) {
  const verdictBadge = VERDICT_BADGES[run.verdict];

  return (
    <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Image
          src={author.avatarImageSrc}
          width={32}
          height={32}
          alt={author.name}
          className="size-8 shrink-0 rounded-full object-cover"
        />
        <span className="text-sm font-medium">{author.name}</span>
        <span className="text-xs text-muted-foreground">{run.claimDateLabel}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${verdictBadge.className}`}
        >
          {verdictBadge.label}
        </span>
      </div>
      <p className="text-sm">{run.claimSummary}</p>
      <p className="text-xs text-muted-foreground">
        {run.claimedHoursLabel}
        {linkedLogDateLabel ? ` · From daily log — ${linkedLogDateLabel}` : ""}
      </p>
      <details>
        <summary className="cursor-pointer text-xs font-medium text-[#00696E]">
          Audit trail — 4 checks
        </summary>
        <ol className="mt-3">
          {run.steps.map((verificationStep, stepIndex) => {
            const stepStatusStyle = STEP_STATUS_STYLES[verificationStep.status];
            const isLastStep = stepIndex === run.steps.length - 1;

            return (
              <li key={verificationStep.kind} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLastStep && (
                  <span
                    aria-hidden
                    className="absolute top-6 left-3 -ml-px h-full border-l border-border"
                  />
                )}
                <span
                  className={`z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs ${stepStatusStyle.dotClassName}`}
                >
                  {verificationStep.status === "passed"
                    ? "✓"
                    : verificationStep.status === "flagged"
                      ? "!"
                      : null}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {STEP_LABELS[verificationStep.kind]}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${stepStatusStyle.chipClassName}`}
                    >
                      {stepStatusStyle.label}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{verificationStep.findingSummary}</p>
                  {verificationStep.evidenceLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {verificationStep.evidenceLabels.map((evidenceLabel) => (
                        <span
                          key={evidenceLabel}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {evidenceLabel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </details>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {run.verdictDetail}
        <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-xs font-medium text-[#191C1C]">
          {run.slicesAwardedLabel}
        </span>
      </p>
    </div>
  );
}
