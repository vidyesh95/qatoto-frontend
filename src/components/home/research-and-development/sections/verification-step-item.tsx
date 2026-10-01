"use client";

import { useState } from "react";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { LABEL_CLASS } from "@/components/ui/field-classes";
import type { ApiError } from "@/lib/http";
import {
  VERIFICATION_STEP_STATUSES,
  VerificationStepStatusSchema,
  type VerificationStep,
  type VerificationStepStatus,
} from "@/lib/rnd/proof-of-effort.schemas";
import { VERIFICATION_STEP_KIND_LABELS } from "@/lib/rnd/labels";

const STEP_STATUS_LABELS: Record<VerificationStepStatus, string> = {
  pending: "Pending",
  passed: "Passed",
  flagged: "Flagged",
  failed: "Failed",
  skipped: "Skipped",
};

const STEP_STATUS_BADGE_CLASS: Record<VerificationStepStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  passed: "bg-primary-imprint/10 text-primary-imprint",
  flagged: "bg-warning-container text-warning-container-foreground",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

function StepOverrideForm({
  onSubmit,
  isPending,
  overrideError,
}: {
  readonly onSubmit: (overriddenStatus: VerificationStepStatus, reason: string) => void;
  readonly isPending: boolean;
  readonly overrideError: ApiError | null;
}) {
  const [overriddenStatus, setOverriddenStatus] = useState<VerificationStepStatus>("passed");
  const [overrideReason, setOverrideReason] = useState("");

  return (
    <form
      className="space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onSubmit(overriddenStatus, overrideReason);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Corrected status</span>
        <select
          value={overriddenStatus}
          onChange={(changeEvent) => {
            const parsed = VerificationStepStatusSchema.safeParse(changeEvent.target.value);
            if (parsed.success) setOverriddenStatus(parsed.data);
          }}
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        >
          {VERIFICATION_STEP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STEP_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Reason for the override</span>
        <textarea
          required
          rows={2}
          value={overrideReason}
          onChange={(changeEvent) => setOverrideReason(changeEvent.target.value)}
          placeholder="Why is the machine wrong here?"
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        You are correcting a judgement, not a number. The formula recomputes the minutes from the
        corrected step.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
      >
        {isPending ? "Recording…" : "Record the override"}
      </button>
      {overrideError !== null && <MutationErrorNotice error={overrideError} />}
    </form>
  );
}

export function VerificationStepItem({
  step,
  canOverride,
  isOverriding,
  onToggleOverriding,
  onSubmitOverride,
  isOverridePending,
  overrideError,
}: {
  readonly step: VerificationStep;
  readonly canOverride: boolean;
  readonly isOverriding: boolean;
  readonly onToggleOverriding: () => void;
  readonly onSubmitOverride: (overriddenStatus: VerificationStepStatus, reason: string) => void;
  readonly isOverridePending: boolean;
  readonly overrideError: ApiError | null;
}) {
  const effectiveStatus = step.overriddenStatus ?? step.status;

  return (
    <li className="space-y-1 rounded-lg bg-card/60 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">{VERIFICATION_STEP_KIND_LABELS[step.stepKind]}</span>
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

      <p className="text-xs text-muted-foreground">
        {step.modelName !== null && `${step.modelName} `}
        {step.promptVersion !== null && `· prompt ${step.promptVersion} `}
        {step.confidenceBps !== null && `· ${(step.confidenceBps / 100).toFixed(0)}% confidence`}
      </p>

      {step.overrideReason !== null && (
        <p className="text-xs text-warning">Reviewer&apos;s reason: {step.overrideReason}</p>
      )}

      {canOverride && step.overriddenStatus === null && (
        <>
          <button
            type="button"
            onClick={onToggleOverriding}
            className="cursor-pointer text-xs font-medium text-primary-imprint"
          >
            {isOverriding ? "Cancel" : "Override this judgement"}
          </button>

          {isOverriding && (
            <StepOverrideForm
              onSubmit={onSubmitOverride}
              isPending={isOverridePending}
              overrideError={overrideError}
            />
          )}
        </>
      )}
    </li>
  );
}
