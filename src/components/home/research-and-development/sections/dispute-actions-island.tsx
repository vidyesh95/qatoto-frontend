// TRANSPORT: client-query — "use client" island calling the vote / withdraw / resolve
// mutations. Three writes: POST …/disputes/:id/votes, /withdraw and /resolve.
"use client";

import { useState } from "react";

import {
  MutationAcceptedNotice,
  MutationErrorNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useCastDisputeVoteMutation,
  useResolveDisputeMutation,
  useWithdrawDisputeMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import {
  DISPUTE_RESOLUTIONS,
  DISPUTE_VOTE_POSITIONS,
  DisputeResolutionSchema,
  DisputeVotePositionSchema,
  type DisputeResolution,
  type DisputeVotePosition,
} from "@/lib/rnd/proof-of-effort.schemas";

const VOTE_POSITION_LABELS: Record<DisputeVotePosition, string> = {
  uphold: "Uphold — pay the proposed slices in full",
  void: "Void — pay nothing for this claim",
  re_verify: "Re-verify — run the checks again over a scoped window",
};

const RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  upheld: "Upheld — release at the full proposed slices",
  voided: "Voided — release at zero, and record the zero",
  re_verified: "Re-verified — settle at whatever the scoped re-run derives",
};

/** Founder and admin resolve; any active member votes. */
const RESOLVE_ROLES = ["founder", "admin"];

function canResolve(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && RESOLVE_ROLES.includes(viewerProjectRole);
}

/**
 * Vote, withdraw, resolve.
 *
 * ONE VOTE PER VOTER, and a simple majority of the FROZEN quorum auto-resolves — so
 * casting a vote can settle the dispute outright. Nothing here promises otherwise.
 *
 * WITHDRAWING RESUMES THE ORIGINAL WINDOW ON ITS ORIGINAL CLOCK. It does not restart it,
 * and the copy says so: a raiser who could withdraw and re-raise on a fresh clock could
 * stall an allocation indefinitely.
 *
 * `re_verified` ANSWERS `202`. The settled number does not exist at the moment the request
 * returns because a scoped re-verification has to run, so that branch renders an accepted
 * notice rather than an outcome.
 *
 * THERE IS NO ADJUSTED-MINUTES INPUT and there must never be one. §9.12 is settled as
 * option (a): a human-supplied number overruling the formula is majority fiat wearing a
 * quorum. The three resolutions are the whole vocabulary.
 */
export default function DisputeActionsIsland({
  projectSlug,
  disputeId,
  viewerProjectRole,
}: {
  projectSlug: string;
  disputeId: string;
  viewerProjectRole: string | null;
}) {
  const voteMutation = useCastDisputeVoteMutation(projectSlug);
  const withdrawMutation = useWithdrawDisputeMutation(projectSlug);
  const resolveMutation = useResolveDisputeMutation(projectSlug);

  const [votePosition, setVotePosition] = useState<DisputeVotePosition>("uphold");
  const [voteNote, setVoteNote] = useState("");
  const [resolution, setResolution] = useState<DisputeResolution>("upheld");
  const [resolutionNote, setResolutionNote] = useState("");
  const [scopedWindowStart, setScopedWindowStart] = useState("");
  const [scopedWindowEnd, setScopedWindowEnd] = useState("");

  const firstError = [voteMutation.error, withdrawMutation.error, resolveMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  return (
    <div className="mt-3 space-y-3 border-t border-[#CAC4D0]/40 pt-3">
      <form
        className="space-y-2"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          voteMutation.mutate({
            disputeId,
            position: votePosition,
            note: voteNote.length > 0 ? voteNote : undefined,
          });
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Your vote</span>
          <select
            value={votePosition}
            onChange={(changeEvent) => {
              const parsed = DisputeVotePositionSchema.safeParse(changeEvent.target.value);
              if (parsed.success) setVotePosition(parsed.data);
            }}
            className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
          >
            {DISPUTE_VOTE_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {VOTE_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <input
          value={voteNote}
          onChange={(changeEvent) => setVoteNote(changeEvent.target.value)}
          placeholder="Why (optional)"
          className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          One vote each. A simple majority of the frozen quorum settles the dispute immediately, so
          yours may be the one that ends it.
        </p>
        <button
          type="submit"
          disabled={voteMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {voteMutation.isPending ? "Casting…" : "Cast your vote"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => withdrawMutation.mutate(disputeId)}
        disabled={withdrawMutation.isPending}
        className="cursor-pointer text-xs font-medium text-[#00696E] disabled:opacity-50"
      >
        {withdrawMutation.isPending
          ? "Withdrawing…"
          : "Withdraw this dispute — only the raiser can, and the original window resumes on its original clock"}
      </button>

      {canResolve(viewerProjectRole) && (
        <form
          className="space-y-2 rounded-xl bg-muted/50 p-3"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            resolveMutation.mutate({
              disputeId,
              input: {
                resolution,
                resolutionNote,
                scopedWindowStart: scopedWindowStart.length > 0 ? scopedWindowStart : undefined,
                scopedWindowEnd: scopedWindowEnd.length > 0 ? scopedWindowEnd : undefined,
              },
            });
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Resolve it</span>
            <select
              value={resolution}
              onChange={(changeEvent) => {
                const parsed = DisputeResolutionSchema.safeParse(changeEvent.target.value);
                if (parsed.success) setResolution(parsed.data);
              }}
              className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
            >
              {DISPUTE_RESOLUTIONS.map((resolutionOption) => (
                <option key={resolutionOption} value={resolutionOption}>
                  {RESOLUTION_LABELS[resolutionOption]}
                </option>
              ))}
            </select>
          </label>

          <textarea
            required
            rows={2}
            value={resolutionNote}
            onChange={(changeEvent) => setResolutionNote(changeEvent.target.value)}
            placeholder="What did the team decide, and why?"
            className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
          />

          {resolution === "re_verified" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Scope from</span>
                <input
                  type="datetime-local"
                  value={scopedWindowStart}
                  onChange={(changeEvent) => setScopedWindowStart(changeEvent.target.value)}
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Scope to</span>
                <input
                  type="datetime-local"
                  value={scopedWindowEnd}
                  onChange={(changeEvent) => setScopedWindowEnd(changeEvent.target.value)}
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                />
              </label>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            You are choosing between three outcomes, not typing a number. The formula derives the
            slices either way — that is what stops a majority from voting itself a different answer.
          </p>

          <button
            type="submit"
            disabled={resolveMutation.isPending}
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {resolveMutation.isPending ? "Resolving…" : "Record the resolution"}
          </button>

          {/* The 202 branch: a scoped re-run has to happen before there is a number. */}
          {resolveMutation.isSuccess && resolution === "re_verified" && (
            <MutationAcceptedNotice message="Re-verification queued. The allocation settles at whatever the re-run derives — no number exists yet." />
          )}
        </form>
      )}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </div>
  );
}
