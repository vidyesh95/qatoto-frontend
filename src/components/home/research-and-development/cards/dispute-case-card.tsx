// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Image from "next/image";
import { useState } from "react";

import { formatIsoInstant } from "@/components/home/research-and-development/sections/compensation-format";
import type {
  DisputeCase,
  DisputeCaseStatus,
  DisputeVote,
  DisputeVoteChoice,
  TeamMember,
} from "@/types/research-and-development";

const CASE_STATUS_BADGES: Record<DisputeCaseStatus, { label: string; className: string }> = {
  collecting_votes: { label: "Collecting votes", className: "bg-blue-100 text-blue-800" },
  quorum_reached: { label: "Quorum reached", className: "bg-amber-100 text-amber-800" },
  resolved: { label: "Resolved", className: "bg-[#00696E]/10 text-[#00696E]" },
};

const VOTE_CHOICE_LABELS: Record<DisputeVoteChoice, string> = {
  uphold_allocation: "Uphold",
  reduce_allocation: "Reduce",
  abstain: "Abstain",
};

const VOTE_CHOICE_CLASSES: Record<DisputeVoteChoice, string> = {
  uphold_allocation: "bg-[#00696E]/10 text-[#00696E]",
  reduce_allocation: "bg-red-100 text-red-800",
  abstain: "bg-muted text-muted-foreground",
};

const VOTE_CHOICE_ORDER: DisputeVoteChoice[] = [
  "uphold_allocation",
  "reduce_allocation",
  "abstain",
];

// One raised dispute and the team's vote on it (§14.1). This is the
// contestability path an automated slice decision owes the person it was made
// about — a backend that offers human intervention through an endpoint no
// screen calls does not, in practice, offer it. Voting here is local state only.
export default function DisputeCaseCard({
  disputeCase,
  teamMembers,
  allocationSummary,
}: {
  disputeCase: DisputeCase;
  teamMembers: TeamMember[];
  allocationSummary: string | undefined;
}) {
  const [viewerVote, setViewerVote] = useState<DisputeVote | null>(null);

  const findMember = (memberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === memberId);
  const raiser = findMember(disputeCase.raisedByMemberId);

  const allVotes = viewerVote ? [...disputeCase.votes, viewerVote] : disputeCase.votes;
  const castVoteCount = allVotes.length;
  const quorumPercent = Math.min(
    100,
    Math.round((castVoteCount / disputeCase.quorumRequiredVoteCount) * 100),
  );
  const hasReachedQuorum = castVoteCount >= disputeCase.quorumRequiredVoteCount;
  const effectiveStatus: DisputeCaseStatus =
    disputeCase.status === "collecting_votes" && hasReachedQuorum
      ? "quorum_reached"
      : disputeCase.status;
  const statusBadge = CASE_STATUS_BADGES[effectiveStatus];
  const canVote = disputeCase.status !== "resolved" && viewerVote === null;

  const handleVoteClick = (choice: DisputeVoteChoice) =>
    setViewerVote({
      id: `local-vote-${disputeCase.id}`,
      memberId: "viewer",
      choice,
      castAt: new Date().toISOString(),
      rationale: "Cast in this session — nothing is sent.",
    });

  return (
    <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {raiser && (
          <Image
            src={raiser.avatarImageSrc}
            width={32}
            height={32}
            alt={raiser.name}
            className="size-8 shrink-0 rounded-full object-cover"
          />
        )}
        <span className="text-sm">
          <span className="font-medium">{raiser?.name ?? "A member"}</span> raised a dispute
        </span>
        <span className="text-xs text-muted-foreground">
          {formatIsoInstant(disputeCase.raisedAt)}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {allocationSummary && (
        <p className="text-xs text-muted-foreground">On: {allocationSummary}</p>
      )}
      <p className="text-sm">{disputeCase.reason}</p>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>
            Quorum {castVoteCount} of {disputeCase.quorumRequiredVoteCount} votes
          </span>
          <span>{disputeCase.escrowedSlices.toLocaleString()} slices frozen</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${quorumPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Frozen slices sit outside the pie while the case runs. They are a pool of slices, never
          money — Qatoto holds no funds here.
        </p>
      </div>

      <ul className="space-y-2">
        {allVotes.map((vote) => {
          const voter = findMember(vote.memberId);
          return (
            <li key={vote.id} className="flex flex-wrap items-start gap-2 text-xs">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${VOTE_CHOICE_CLASSES[vote.choice]}`}
              >
                {VOTE_CHOICE_LABELS[vote.choice]}
              </span>
              <span className="font-medium">{voter?.name ?? "You"}</span>
              <span className="min-w-0 flex-1 text-muted-foreground">{vote.rationale}</span>
            </li>
          );
        })}
      </ul>

      {canVote && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Your vote:</span>
          {VOTE_CHOICE_ORDER.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => handleVoteClick(choice)}
              className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              {VOTE_CHOICE_LABELS[choice]}
            </button>
          ))}
        </div>
      )}

      {disputeCase.resolutionNote && (
        <p className="rounded-xl bg-[#00696E]/5 p-3 text-xs text-[#00696E]">
          {disputeCase.resolutionNote}
          {disputeCase.resolvedAt ? ` · ${formatIsoInstant(disputeCase.resolvedAt)}` : ""}
        </p>
      )}
    </div>
  );
}
