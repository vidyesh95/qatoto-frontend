// TRANSPORT: client-query — calls `useLogProgramEffortMutation` and
// `useRecordProgramContributionMutation`. Both carry a body-level idempotency key.
"use client";

import { useState, type FormEvent } from "react";

import {
  useLogProgramEffortMutation,
  useRecordProgramContributionMutation,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { newIdempotencyKey } from "@/lib/rnd/idempotency";
import { RESEARCH_CONTRIBUTION_KIND_LABELS } from "@/lib/rnd/labels";
import {
  RESEARCH_CONTRIBUTION_KINDS,
  ResearchContributionKindSchema,
  type ResearchBranch,
  type ResearchContributionKind,
} from "@/lib/rnd/research-programs.schemas";

import BranchPickerField from "./branch-picker-field";
import { MutationAcceptedNotice, MutationErrorNotice } from "./mutation-feedback";

type ProgramContributorToolsProps = {
  programSlug: string;
  branches: ResearchBranch[];
  /** Only a participant can log effort — the backend answers 422 NOT_A_PARTICIPANT otherwise. */
  isViewerParticipant: boolean;
  /** `published && signed in` — the precondition for `POST /branches`. Passed explicitly rather
   *  than assumed from this section's own gating, so a page refactor cannot silently offer a
   *  create control that 403s. */
  canCreateBranch: boolean;
};

/**
 * What a contributor records about their own work: time, and everything that is not time.
 *
 * NEITHER OF THESE MINTS ANYTHING. §9's Slicing Pie ledger is project-scoped, verified against
 * artifacts, and moves equity; this is self-reported and moves nothing. The copy says so at the top
 * rather than in a footnote, because the surface it sits on is about research integrity and a
 * reader guessing wrong here would guess in the direction of "I am being paid".
 *
 * THE CASH FIELD SAYS "COMMITTED", NEVER "PAID" OR "ESCROWED". Escrow left the backend entirely and
 * no program-scoped money rail exists — the mock's "$250K escrowed" described a mechanism that is
 * gone. A commitment is a statement of intent, and that is all this records.
 *
 * BOTH KEYS ARE MINTED ONCE PER ATTEMPT and rotated only on success, so a retry after a network
 * timeout returns the FIRST row instead of double-counting.
 */
export default function ProgramContributorTools({
  programSlug,
  branches,
  isViewerParticipant,
  canCreateBranch,
}: ProgramContributorToolsProps) {
  const effortMutation = useLogProgramEffortMutation(programSlug);
  const contributionMutation = useRecordProgramContributionMutation(programSlug);

  const [minutes, setMinutes] = useState("60");
  const [effortBranchId, setEffortBranchId] = useState("");
  const [loggedForDate, setLoggedForDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [effortNote, setEffortNote] = useState("");
  const [effortIdempotencyKey, setEffortIdempotencyKey] = useState(newIdempotencyKey);

  const [contributionKind, setContributionKind] =
    useState<ResearchContributionKind>("cash_commitment");
  const [amountInMajorUnits, setAmountInMajorUnits] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [contributionDescription, setContributionDescription] = useState("");
  const [contributionIdempotencyKey, setContributionIdempotencyKey] = useState(newIdempotencyKey);

  const firstError = [effortMutation.error, contributionMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  if (!isViewerParticipant) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        Join this programme above to log effort or record a contribution.
      </p>
    );
  }

  const isCashCommitment = contributionKind === "cash_commitment";

  function handleEffortSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedMinutes = Number(minutes);
    if (!Number.isSafeInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440) return;
    if (!effortNote.trim()) return;

    effortMutation.mutate(
      {
        minutes: parsedMinutes,
        branchId: effortBranchId === "" ? null : effortBranchId,
        loggedForDate,
        note: effortNote.trim(),
        idempotencyKey: effortIdempotencyKey,
      },
      {
        onSuccess: () => {
          setEffortNote("");
          // Rotated on SUCCESS only: a failed attempt must be retryable under the same key.
          setEffortIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  }

  function handleContributionSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!contributionDescription.trim()) return;
    if (isCashCommitment && amountInMajorUnits.trim() === "") return;

    contributionMutation.mutate(
      {
        kind: contributionKind,
        // Major units → a DECIMAL STRING OF CENTS, which is what the wire takes. Rounded here
        // rather than sent as a float: the column is a bigint and a float would introduce a
        // fractional cent nobody asked for.
        amountInCents: isCashCommitment
          ? String(Math.round(Number(amountInMajorUnits) * 100))
          : null,
        currencyCode: isCashCommitment ? currencyCode.toUpperCase() : null,
        description: contributionDescription.trim(),
        idempotencyKey: contributionIdempotencyKey,
      },
      {
        onSuccess: () => {
          setContributionDescription("");
          setAmountInMajorUnits("");
          setContributionIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Record what you have put in. Both of these are{" "}
        <span className="font-medium text-foreground">self-reported records</span> — nothing here is
        verified, nothing mints equity, and no money changes hands.
      </p>

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleEffortSubmit}
          className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <h3 className="text-sm font-medium">Log effort</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium">Minutes</span>
              <input
                required
                type="number"
                min={1}
                max={1440}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
              <span className="text-[10px] text-muted-foreground">Up to 1440 — one day.</span>
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-medium">Date</span>
              <input
                required
                type="date"
                value={loggedForDate}
                // A future date is a 422 from the backend; `max` stops the common case here.
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setLoggedForDate(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* No `branches.length > 0` gate: an empty tree is exactly when creating one matters. */}
          <BranchPickerField
            programSlug={programSlug}
            branches={branches}
            selectedBranchId={effortBranchId}
            onBranchSelect={setEffortBranchId}
            labelText="Branch (optional)"
            noBranchOptionLabel="Not branch-specific"
            helpText="Type a name that does not exist yet to create the branch."
            canCreateBranch={canCreateBranch}
          />

          <label className="block space-y-1 text-xs">
            <span className="font-medium">What did you do?</span>
            <textarea
              required
              value={effortNote}
              onChange={(event) => setEffortNote(event.target.value)}
              maxLength={2000}
              rows={2}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={effortMutation.isPending || !effortNote.trim()}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {effortMutation.isPending ? "Logging…" : "Log effort"}
          </button>

          {effortMutation.isSuccess && (
            <MutationAcceptedNotice
              message={
                // A replay is a different fact from a create, and saying so is the whole point of
                // the idempotency key being visible in the response.
                effortMutation.data.wasReplay
                  ? "This effort log was already recorded — nothing was added."
                  : "Effort logged."
              }
            />
          )}
        </form>

        <form
          onSubmit={handleContributionSubmit}
          className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <h3 className="text-sm font-medium">Record a contribution</h3>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">What kind?</span>
            <select
              value={contributionKind}
              onChange={(event) => {
                const parsed = ResearchContributionKindSchema.safeParse(event.target.value);
                if (parsed.success) setContributionKind(parsed.data);
              }}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            >
              {RESEARCH_CONTRIBUTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {RESEARCH_CONTRIBUTION_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>

          {/* The amount belongs to a cash commitment and to nothing else — the backend's CHECK
              refuses it on any other kind, so the field only exists for that one. */}
          {isCashCommitment && (
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <label className="space-y-1 text-xs">
                <span className="font-medium">Amount committed</span>
                <input
                  required
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amountInMajorUnits}
                  onChange={(event) => setAmountInMajorUnits(event.target.value)}
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-medium">Currency</span>
                <input
                  required
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(event.target.value)}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm uppercase"
                />
              </label>
            </div>
          )}

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Describe it</span>
            <textarea
              required
              value={contributionDescription}
              onChange={(event) => setContributionDescription(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Senolytics assay data from our Q3 run"
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          {isCashCommitment && (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              This records a <span className="font-medium">commitment</span>. Qatoto does not
              collect or hold the money, and nothing here transfers funds.
            </p>
          )}

          <button
            type="submit"
            disabled={contributionMutation.isPending || !contributionDescription.trim()}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {contributionMutation.isPending ? "Recording…" : "Record contribution"}
          </button>

          {contributionMutation.isSuccess && (
            <MutationAcceptedNotice
              message={
                contributionMutation.data.wasReplay
                  ? "This contribution was already recorded — nothing was added."
                  : "Contribution recorded as a commitment. No payment was collected."
              }
            />
          )}
        </form>
      </div>
    </div>
  );
}
