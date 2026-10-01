// TRANSPORT: client-query — "use client" island. Reads GET …/effort-claims/:claimId
// through React Query when opened, POLLS it while the pipeline is still running, and
// writes PATCH …/steps/:stepId/override and POST …/reverify. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import {
  ClaimEvidenceList,
  ClaimMinutesSummary,
  ClaimReverifyForm,
} from "@/components/home/research-and-development/sections/claim-disclosure-views";
import { VerificationStepItem } from "@/components/home/research-and-development/sections/verification-step-item";
import {
  useEffortClaimQuery,
  useOverrideVerificationStepMutation,
  useReverifyEffortClaimMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { EffortVerificationStatus } from "@/lib/rnd/proof-of-effort.schemas";

/** Maintainer and above. Anyone else gets a 404 from the override route itself. */
const OVERRIDE_ROLES = ["founder", "admin", "maintainer"];

function canOverride(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && OVERRIDE_ROLES.includes(viewerProjectRole);
}

/** The two statuses whose verdict has not landed, and the only ones worth polling. */
const IN_FLIGHT_STATUSES: EffortVerificationStatus[] = ["queued", "running"];

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
  readonly projectSlug: string;
  readonly claimId: string;
  readonly initialVerificationStatus: EffortVerificationStatus;
  readonly projectCurrency: string;
  readonly viewerProjectRole: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [overridingStepId, setOverridingStepId] = useState<string | null>(null);

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
        className="mt-3 cursor-pointer text-xs font-medium text-primary-imprint"
      >
        Show the run history
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-outline-variant/40 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="cursor-pointer text-xs font-medium text-primary-imprint"
      >
        Hide the run history
      </button>

      {claimQuery.isPending && <p className="text-xs text-muted-foreground">Loading the runs…</p>}

      {isVerdictOutstanding && (
        <p className="text-xs text-primary-imprint">
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
          <ClaimMinutesSummary
            extractedMinutes={claimQuery.data.extractedMinutes}
            extractedCashInCents={claimQuery.data.extractedCashInCents}
            groundedMinutes={claimQuery.data.groundedMinutes}
            groundedCashInCents={claimQuery.data.groundedCashInCents}
            projectCurrency={projectCurrency}
          />

          {claimQuery.data.overriddenMinutes !== null && (
            <p className="rounded-xl bg-warning-container p-3 text-xs text-warning-container-foreground">
              A reviewer overrode a step and the formula recomputed this claim to{" "}
              {claimQuery.data.overriddenMinutes} minutes.
              {claimQuery.data.overrideReason !== null &&
                ` Reason: ${claimQuery.data.overrideReason}`}
            </p>
          )}

          {claimQuery.data.runs.map((run) => (
            <section
              key={run.id}
              className="space-y-2 rounded-xl border border-outline-variant/60 p-3"
            >
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
              <ul className="space-y-2">
                {run.steps.map((step) => (
                  <VerificationStepItem
                    key={step.id}
                    step={step}
                    canOverride={canOverride(viewerProjectRole)}
                    isOverriding={overridingStepId === step.id}
                    onToggleOverriding={() =>
                      setOverridingStepId(overridingStepId === step.id ? null : step.id)
                    }
                    onSubmitOverride={(overriddenStatus, reason) =>
                      overrideMutation.mutate({
                        claimId,
                        stepId: step.id,
                        overriddenStatus,
                        overrideReason: reason,
                      })
                    }
                    isOverridePending={overrideMutation.isPending}
                    overrideError={overrideError}
                  />
                ))}
              </ul>
            </section>
          ))}

          <ClaimEvidenceList evidence={claimQuery.data.evidence} />

          {canOverride(viewerProjectRole) && (
            <ClaimReverifyForm
              onSubmit={(reason) => reverifyMutation.mutate({ claimId, reason })}
              isPending={reverifyMutation.isPending}
              isSuccess={reverifyMutation.isSuccess}
              reverifyError={reverifyError}
            />
          )}
        </div>
      )}
    </div>
  );
}
