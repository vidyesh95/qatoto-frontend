// TRANSPORT: client-query — "use client" island. Writes the funding-round lifecycle and
// the milestone lifecycle: POST/PATCH/DELETE …/funding-rounds, /open, /close, and
// POST/PATCH/DELETE …/milestones, /complete, PUT …/variance.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useCreateFundingRoundMutation,
  useCreateMilestoneMutation,
  useFundingRoundLifecycleMutation,
  useMilestoneLifecycleMutation,
} from "@/hooks/rnd/funding";
import { ApiRequestError } from "@/lib/http";
import { formatIsoDate, formatMoneyFromCents } from "@/lib/rnd/format";
import {
  FUNDING_ROUND_TYPES,
  type FundingRound,
  type FundingRoundType,
  type Milestone,
} from "@/lib/rnd/funding.schemas";

/**
 * Only these two reach the round and milestone endpoints; anyone else gets a `404` from
 * the route itself, which is the real check.
 */
const FUNDING_ROLES = ["founder", "admin"];

function canManageFunding(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && FUNDING_ROLES.includes(viewerProjectRole);
}

const ROUND_TYPE_LABELS: Record<FundingRoundType, string> = {
  crowdfunding: "Crowdfunding",
  equity: "Equity (disabled)",
  venture: "Venture (disabled)",
};

/**
 * The founder's side of funding.
 *
 * **EQUITY AND VENTURE ROUNDS ARE DISABLED AT THE API AND IN SQL**, because they are
 * securities offerings. They are shown here, labelled, rather than hidden: hiding them
 * would suggest the restriction is a UI choice, and a founder who selects one gets a
 * `403 ROUND_TYPE_DISABLED` that says what is actually true. The gate is re-checked again
 * at open, not only at create.
 *
 * **A DRAFT ROUND IS THE ONLY EDITABLE ONE.** `409 ROUND_NOT_EDITABLE` once it has ever
 * opened, and `409 ROUND_HAS_REFERENCES` on delete once it carries a pledge — a round
 * somebody backed is a record rather than a draft, and the copy says so instead of
 * offering a control that will refuse.
 *
 * **`plannedPayoutInCents` RECORDS INTENT AND INSTRUCTS NO PAYMENT RAIL.** It replaced
 * `escrowReleaseAmountInCents` when escrow left this contract; completing a milestone
 * moves no money and nothing on this page may imply it does.
 *
 * **VARIANCE TAKES SIX INTEGERS AND NO PERCENTAGE.** `varianceBasisPoints` is computed
 * server-side from them and clamped — a client-supplied variance would be the one figure
 * on the page nobody derived.
 */
export default function FundingManagementIsland({
  projectSlug,
  rounds,
  milestones,
  projectCurrency,
  viewerProjectRole,
}: {
  projectSlug: string;
  rounds: FundingRound[];
  milestones: Milestone[];
  projectCurrency: string;
  viewerProjectRole: string | null;
}) {
  const createRoundMutation = useCreateFundingRoundMutation(projectSlug);
  const roundLifecycleMutation = useFundingRoundLifecycleMutation(projectSlug);
  const createMilestoneMutation = useCreateMilestoneMutation(projectSlug);
  const milestoneLifecycleMutation = useMilestoneLifecycleMutation(projectSlug);

  const [roundType, setRoundType] = useState<FundingRoundType>("crowdfunding");
  const [roundTitle, setRoundTitle] = useState("");
  const [goalAmountInCents, setGoalAmountInCents] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [plannedPayoutInCents, setPlannedPayoutInCents] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  const firstError = [
    createRoundMutation.error,
    roundLifecycleMutation.error,
    createMilestoneMutation.error,
    milestoneLifecycleMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  if (!canManageFunding(viewerProjectRole)) return null;

  return (
    <div className="space-y-6 border-t border-[#CAC4D0]/40 pt-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Your rounds</h3>

        {rounds.length > 0 && (
          <ul className="space-y-2">
            {rounds.map((round) => (
              <li
                key={round.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
              >
                <span>
                  {round.title}
                  <span className="block text-xs text-muted-foreground">
                    {round.status} ·{" "}
                    {formatMoneyFromCents(BigInt(round.goalAmountInCents), round.currency)} goal
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {round.status === "draft" && (
                    <button
                      type="button"
                      disabled={roundLifecycleMutation.isPending}
                      onClick={() =>
                        roundLifecycleMutation.mutate({ roundId: round.id, action: "open" })
                      }
                      className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Open it
                    </button>
                  )}
                  {round.status === "open" && (
                    <button
                      type="button"
                      disabled={roundLifecycleMutation.isPending}
                      onClick={() =>
                        roundLifecycleMutation.mutate({ roundId: round.id, action: "close" })
                      }
                      className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      Close it
                    </button>
                  )}
                  {round.status === "draft" && (
                    <button
                      type="button"
                      disabled={roundLifecycleMutation.isPending}
                      onClick={() =>
                        roundLifecycleMutation.mutate({ roundId: round.id, action: "delete" })
                      }
                      className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      Discard
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            createRoundMutation.mutate(
              { type: roundType, title: roundTitle.trim(), goalAmountInCents },
              { onSuccess: () => setRoundTitle("") },
            );
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Open a new round</span>
            <input
              required
              value={roundTitle}
              onChange={(changeEvent) => setRoundTitle(changeEvent.target.value)}
              placeholder="What is this round for?"
              className={INPUT_CLASS}
            />
          </label>
          <select
            value={roundType}
            onChange={(changeEvent) => {
              const candidate = FUNDING_ROUND_TYPES.find(
                (roundTypeOption) => roundTypeOption === changeEvent.target.value,
              );
              if (candidate) setRoundType(candidate);
            }}
            className={INPUT_CLASS}
          >
            {FUNDING_ROUND_TYPES.map((option) => (
              <option key={option} value={option}>
                {ROUND_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={goalAmountInCents}
            onChange={(changeEvent) => setGoalAmountInCents(changeEvent.target.value)}
            placeholder="Goal in whole cents"
            className={INPUT_CLASS}
          />
          <p className="text-xs text-muted-foreground">
            Equity and venture rounds are securities offerings and are refused by the API — the
            option is shown so the reason is visible rather than hidden. A round records
            commitments; Qatoto never takes or holds the money.
          </p>
          <button
            type="submit"
            disabled={createRoundMutation.isPending}
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Create it as a draft
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Milestones</h3>

        {milestones.length > 0 && (
          <ul className="space-y-2">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
              >
                <span>
                  {milestone.title}
                  <span className="block text-xs text-muted-foreground">
                    {milestone.status}
                    {milestone.dueDate !== null &&
                      ` · due ${formatIsoDate(milestone.dueDate)}`} ·{" "}
                    {formatMoneyFromCents(
                      BigInt(milestone.plannedPayoutInCents),
                      milestone.currency,
                    )}{" "}
                    planned
                  </span>
                </span>
                {milestone.status !== "done" && (
                  <button
                    type="button"
                    disabled={milestoneLifecycleMutation.isPending}
                    onClick={() =>
                      milestoneLifecycleMutation.mutate({
                        milestoneId: milestone.id,
                        action: "complete",
                      })
                    }
                    className="cursor-pointer rounded-full border border-[#00696E]/40 px-3 py-1.5 text-xs font-medium text-[#00696E] disabled:opacity-50"
                  >
                    Mark it done
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            createMilestoneMutation.mutate(
              {
                title: milestoneTitle.trim(),
                plannedPayoutInCents,
                dueDate: milestoneDueDate || undefined,
              },
              { onSuccess: () => setMilestoneTitle("") },
            );
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Plan a milestone</span>
            <input
              required
              value={milestoneTitle}
              onChange={(changeEvent) => setMilestoneTitle(changeEvent.target.value)}
              placeholder="What has to be true?"
              className={INPUT_CLASS}
            />
          </label>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={plannedPayoutInCents}
            onChange={(changeEvent) => setPlannedPayoutInCents(changeEvent.target.value)}
            placeholder={`Planned payout in whole cents (${projectCurrency})`}
            className={INPUT_CLASS}
          />
          <input
            type="date"
            value={milestoneDueDate}
            onChange={(changeEvent) => setMilestoneDueDate(changeEvent.target.value)}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-muted-foreground">
            A planned payout records intent. Completing a milestone moves no money — there is no
            payment rail behind this figure, and there is deliberately no escrow.
          </p>
          <button
            type="submit"
            disabled={createMilestoneMutation.isPending}
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Add it
          </button>
        </form>
      </section>

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </div>
  );
}
