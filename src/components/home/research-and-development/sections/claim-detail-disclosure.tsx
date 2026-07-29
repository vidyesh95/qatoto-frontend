// TRANSPORT: client-query — "use client" island. Reads GET …/effort-claims/:claimId
// through React Query when opened, POLLS it while the pipeline is still running, and
// writes PATCH …/steps/:stepId/override and POST …/reverify. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useEffortClaimQuery,
  useOverrideVerificationStepMutation,
  useReverifyEffortClaimMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant, formatMoneyFromCents, shortenHashForDisplay } from "@/lib/rnd/format";
import {
  VERIFICATION_STEP_STATUSES,
  VerificationStepStatusSchema,
  type EffortVerificationStatus,
  type VerificationStep,
  type VerificationStepStatus,
} from "@/lib/rnd/proof-of-effort.schemas";

const STEP_KIND_LABELS: Record<string, string> = {
  claim_extraction: "What was claimed",
  artifact_grounding: "Do the artifacts back it",
  substance_analysis: "Is the work substantive",
  temporal_analysis: "Do the timestamps line up",
};

const STEP_STATUS_LABELS: Record<VerificationStepStatus, string> = {
  pending: "Pending",
  passed: "Passed",
  flagged: "Flagged",
  failed: "Failed",
  skipped: "Skipped",
};

/**
 * `skipped` is grey, not red. When grounding flags without a connected provider, substance
 * and temporal analysis skip DELIBERATELY so review has one gate rather than three —
 * rendering that as a failure would triple the apparent problem.
 */
const STEP_STATUS_BADGE_CLASS: Record<VerificationStepStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  passed: "bg-[#00696E]/10 text-[#00696E]",
  flagged: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-muted text-muted-foreground",
};

/** The two statuses whose verdict has not landed, and the only ones worth polling. */
const IN_FLIGHT_STATUSES: EffortVerificationStatus[] = ["queued", "running"];

/** Maintainer and above. Anyone else gets a 404 from the override route itself. */
const OVERRIDE_ROLES = ["founder", "admin", "maintainer"];

function canOverride(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && OVERRIDE_ROLES.includes(viewerProjectRole);
}

/**
 * One claim's full history: every run, every step in order, and the evidence behind it.
 *
 * `runs` IS A LIST BECAUSE RE-VERIFICATION PRODUCES ATTEMPT 2, 3, … Rendering only the
 * latest would show a stale verdict the moment anyone asks for a re-check, which is
 * exactly the bug §13 warns about.
 *
 * WHAT THE MEMBER SAID AND WHAT THE ARTIFACTS PROVE ARE DIFFERENT ROWS.
 * `extractedMinutes` pays nobody; `groundedMinutes` — or its override — is what the ledger
 * prices. They are labelled apart here on purpose.
 *
 * THE OVERRIDE IS THE HUMAN-OVERSIGHT CONTROL (EU AI Act Art. 14), and it edits a STEP
 * STATUS. There is no minutes input anywhere in this component and there must never be
 * one: the formula recomputes the number from the corrected judgement. A human typing an
 * outcome is founder fiat with extra steps.
 */
export default function ClaimDetailDisclosure({
  projectSlug,
  claimId,
  initialVerificationStatus,
  projectCurrency,
  viewerProjectRole,
}: {
  projectSlug: string;
  claimId: string;
  initialVerificationStatus: EffortVerificationStatus;
  projectCurrency: string;
  viewerProjectRole: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [overridingStepId, setOverridingStepId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overriddenStatus, setOverriddenStatus] = useState<VerificationStepStatus>("passed");
  const [reverifyReason, setReverifyReason] = useState("");

  // The query polls itself while the verdict is outstanding and stops the moment the
  // status turns terminal — that decision lives in the hook because only the fetched
  // claim knows it.
  const claimQuery = useEffortClaimQuery(projectSlug, isOpen ? claimId : undefined);
  const overrideMutation = useOverrideVerificationStepMutation(projectSlug);
  const reverifyMutation = useReverifyEffortClaimMutation(projectSlug);

  const isVerdictOutstanding = IN_FLIGHT_STATUSES.includes(
    claimQuery.data?.verificationStatus ?? initialVerificationStatus,
  );

  const overrideError =
    overrideMutation.error instanceof ApiRequestError ? overrideMutation.error.apiError : null;
  const reverifyError =
    reverifyMutation.error instanceof ApiRequestError ? reverifyMutation.error.apiError : null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 cursor-pointer text-xs font-medium text-[#00696E]"
      >
        Show the run history
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[#CAC4D0]/40 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="cursor-pointer text-xs font-medium text-[#00696E]"
      >
        Hide the run history
      </button>

      {claimQuery.isPending && <p className="text-xs text-muted-foreground">Loading the runs…</p>}

      {/* The 202 state, made visible. The claim exists; the number does not yet. */}
      {isVerdictOutstanding && (
        <p className="text-xs text-[#00696E]">
          The pipeline is still checking this claim. No minutes and no slices exist for it yet —
          this updates itself when the verdict lands.
        </p>
      )}

      {claimQuery.isError && (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load this claim&apos;s history.
        </p>
      )}

      {claimQuery.data && (
        <div className="space-y-3">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">What the member said</dt>
              <dd className="text-sm">
                {claimQuery.data.extractedMinutes === null
                  ? "Nothing extracted"
                  : `${claimQuery.data.extractedMinutes} minutes`}
                {claimQuery.data.extractedCashInCents !== null &&
                  ` · ${formatMoneyFromCents(BigInt(claimQuery.data.extractedCashInCents), projectCurrency)}`}
              </dd>
              <dd className="text-xs text-muted-foreground">This pays nobody on its own.</dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">What the artifacts prove</dt>
              <dd className="text-sm">
                {claimQuery.data.groundedMinutes === null
                  ? "Not graded yet"
                  : `${claimQuery.data.groundedMinutes} minutes`}
                {claimQuery.data.groundedCashInCents !== null &&
                  ` · ${formatMoneyFromCents(BigInt(claimQuery.data.groundedCashInCents), projectCurrency)}`}
              </dd>
              <dd className="text-xs text-muted-foreground">This is what the ledger prices.</dd>
            </div>
          </dl>

          {claimQuery.data.overriddenMinutes !== null && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              A reviewer overrode a step and the formula recomputed this claim to{" "}
              {claimQuery.data.overriddenMinutes} minutes.
              {claimQuery.data.overrideReason !== null &&
                ` Reason: ${claimQuery.data.overrideReason}`}
            </p>
          )}

          {claimQuery.data.runs.map((run) => (
            <section key={run.id} className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  Attempt {run.attemptNumber} — {run.verdict.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {run.completedAt === null
                    ? "Still running"
                    : `Finished ${formatIsoInstant(run.completedAt)}`}
                </p>
              </div>
              {run.triggerReason !== null && (
                <p className="text-xs text-muted-foreground">Triggered by: {run.triggerReason}</p>
              )}
              <ul className="space-y-2">{run.steps.map((step) => renderStep(step))}</ul>
            </section>
          ))}

          {claimQuery.data.evidence.length > 0 && (
            <section className="space-y-1">
              <p className="text-sm font-medium">Evidence</p>
              <ul className="space-y-1 text-xs">
                {claimQuery.data.evidence.map((evidence) => (
                  <li key={evidence.payloadSha256}>
                    <span className="text-muted-foreground">{evidence.provider}:</span>{" "}
                    {evidence.externalUrl === null ? (
                      evidence.label
                    ) : (
                      <a
                        href={evidence.externalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#00696E] underline underline-offset-2"
                      >
                        {evidence.label}
                      </a>
                    )}{" "}
                    · hash {shortenHashForDisplay(evidence.payloadSha256)} · signature{" "}
                    {evidence.signatureStatus}
                    {!evidence.countsTowardSlices && " · does not count toward slices"}
                    {/* The proof survives a revocation; the copy does not. Saying which
                        is which is the difference between "deleted" and "never was". */}
                    {!evidence.evidenceRetained &&
                      " · the stored copy was purged when consent was revoked; the hash stands"}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canOverride(viewerProjectRole) && (
            <form
              className="space-y-2 rounded-xl bg-muted/50 p-3"
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                reverifyMutation.mutate({ claimId, reason: reverifyReason });
              }}
            >
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">
                  Ask for a fresh run — this adds an attempt, it does not replace one
                </span>
                <input
                  required
                  value={reverifyReason}
                  onChange={(changeEvent) => setReverifyReason(changeEvent.target.value)}
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                  placeholder="Why re-verify?"
                />
              </label>
              <button
                type="submit"
                disabled={reverifyMutation.isPending}
                className="cursor-pointer rounded-full border border-[#00696E]/40 px-3 py-1.5 text-xs font-medium text-[#00696E] disabled:opacity-50"
              >
                {reverifyMutation.isPending ? "Requesting…" : "Re-verify this claim"}
              </button>
              {/* 202: the run is queued, the number does not exist yet. */}
              {reverifyMutation.isSuccess && (
                <p className="text-xs text-[#00696E]">
                  Queued. The new attempt appears above when it finishes — nothing has changed yet.
                </p>
              )}
              {reverifyError !== null && <MutationErrorNotice error={reverifyError} />}
            </form>
          )}
        </div>
      )}
    </div>
  );

  function renderStep(step: VerificationStep) {
    // The override REPLACES the status for the verdict when present, so it is what the
    // badge must show — otherwise a reviewed step keeps advertising the machine's opinion.
    const effectiveStatus = step.overriddenStatus ?? step.status;
    const isOverriding = overridingStepId === step.id;

    return (
      <li key={step.id} className="space-y-1 rounded-lg bg-white/60 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">{STEP_KIND_LABELS[step.stepKind] ?? step.stepKind}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STEP_STATUS_BADGE_CLASS[effectiveStatus]}`}
          >
            {STEP_STATUS_LABELS[effectiveStatus]}
            {step.overriddenStatus !== null && " (reviewed)"}
          </span>
        </div>

        {step.findingSummary !== null && (
          <p className="text-xs text-muted-foreground">{step.findingSummary}</p>
        )}

        {/* Provenance, always. A judgement whose model and confidence are hidden reads as
            a platform ruling rather than as a machine opinion a human may overrule. */}
        <p className="text-xs text-muted-foreground">
          {step.modelName !== null && `${step.modelName} `}
          {step.promptVersion !== null && `· prompt ${step.promptVersion} `}
          {step.confidenceBps !== null && `· ${(step.confidenceBps / 100).toFixed(0)}% confidence`}
        </p>

        {step.overrideReason !== null && (
          <p className="text-xs text-amber-800">Reviewer&apos;s reason: {step.overrideReason}</p>
        )}

        {canOverride(viewerProjectRole) && step.overriddenStatus === null && (
          <>
            <button
              type="button"
              onClick={() => setOverridingStepId(isOverriding ? null : step.id)}
              className="cursor-pointer text-xs font-medium text-[#00696E]"
            >
              {isOverriding ? "Cancel" : "Override this judgement"}
            </button>

            {isOverriding && (
              <form
                className="space-y-2"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  overrideMutation.mutate({
                    claimId,
                    stepId: step.id,
                    overriddenStatus,
                    overrideReason,
                  });
                }}
              >
                <select
                  value={overriddenStatus}
                  onChange={(changeEvent) => {
                    // Parsed, not cast: an unrecognized value reaching a `.strict()` body
                    // schema is a 422 rather than an ignored field.
                    const parsed = VerificationStepStatusSchema.safeParse(changeEvent.target.value);
                    if (parsed.success) setOverriddenStatus(parsed.data);
                  }}
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                >
                  {VERIFICATION_STEP_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STEP_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(changeEvent) => setOverrideReason(changeEvent.target.value)}
                  placeholder="Why is the machine wrong here?"
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  You are correcting a judgement, not a number. The formula recomputes the minutes
                  from the corrected step.
                </p>
                <button
                  type="submit"
                  disabled={overrideMutation.isPending}
                  className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {overrideMutation.isPending ? "Recording…" : "Record the override"}
                </button>
                {overrideError !== null && <MutationErrorNotice error={overrideError} />}
              </form>
            )}
          </>
        )}
      </li>
    );
  }
}
