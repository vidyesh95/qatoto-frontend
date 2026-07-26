"use client";

import { useState } from "react";

import {
  formatHourlyRateFromCents,
  formatIsoInstant,
} from "@/components/home/research-and-development/sections/compensation-format";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type {
  RateLockProposal,
  RateLockStatus,
  TeamMember,
} from "@/types/research-and-development";

const RATE_STATUS_BADGES: Record<RateLockStatus, { label: string; className: string }> = {
  proposed: { label: "Proposed", className: "bg-blue-100 text-blue-800" },
  under_review: { label: "Under review", className: "bg-amber-100 text-amber-800" },
  locked: { label: "Locked", className: "bg-[#00696E]/10 text-[#00696E]" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
};

const CENTS_PER_UNIT = 100;

// Rate lock (§14.4): the fair market rate every time slice is multiplied by.
// It is proposed against a benchmark band, reviewed by someone other than the
// member, then locked — never typed straight into a ledger — because one number
// here rewrites every figure on the Proof of Effort page. Local state only.
export default function RateLockPanel({
  proposals,
  teamMembers,
}: {
  proposals: RateLockProposal[];
  teamMembers: TeamMember[];
}) {
  const [locallyLockedIds, setLocallyLockedIds] = useState<string[]>([]);
  const [draftMemberId, setDraftMemberId] = useState(teamMembers[0]?.id ?? "");
  const [draftRateInUnits, setDraftRateInUnits] = useState("");
  const [draftBenchmarkSource, setDraftBenchmarkSource] = useState("");
  const [draftProposals, setDraftProposals] = useState<RateLockProposal[]>([]);

  const allProposals = [...draftProposals, ...proposals];
  const currentProposals = allProposals.filter((proposal) => proposal.status !== "superseded");
  const supersededProposals = allProposals.filter((proposal) => proposal.status === "superseded");

  const resolveStatus = (proposal: RateLockProposal): RateLockStatus =>
    locallyLockedIds.includes(proposal.id) ? "locked" : proposal.status;

  const handleLockClick = (proposalId: string) =>
    setLocallyLockedIds((currentIds) =>
      currentIds.includes(proposalId) ? currentIds : [...currentIds, proposalId],
    );

  const handleProposeSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    const parsedRate = Number(draftRateInUnits);
    if (!draftMemberId || !Number.isFinite(parsedRate) || parsedRate <= 0) return;
    setDraftProposals((currentDrafts) => [
      {
        id: `local-rate-${draftMemberId}-${currentDrafts.length}`,
        memberId: draftMemberId,
        proposedRateInCentsPerHour: Math.round(parsedRate * CENTS_PER_UNIT),
        currency: "USD",
        status: "proposed",
        proposedByName: "You",
        proposedAt: new Date().toISOString(),
        benchmarkSourceLabel: draftBenchmarkSource.trim() || "Benchmark not cited",
        benchmarkLowInCentsPerHour: Math.round(parsedRate * CENTS_PER_UNIT * 0.8),
        benchmarkHighInCentsPerHour: Math.round(parsedRate * CENTS_PER_UNIT * 1.2),
        reviewerName: null,
        reviewedAt: null,
        lockedAt: null,
        supersededByProposalId: null,
      },
      ...currentDrafts,
    ]);
    setDraftRateInUnits("");
    setDraftBenchmarkSource("");
  };

  const renderProposal = (proposal: RateLockProposal) => {
    const member = teamMembers.find((teamMember) => teamMember.id === proposal.memberId);
    const resolvedStatus = resolveStatus(proposal);
    const statusBadge = RATE_STATUS_BADGES[resolvedStatus];
    const isInsideBenchmarkBand =
      proposal.proposedRateInCentsPerHour >= proposal.benchmarkLowInCentsPerHour &&
      proposal.proposedRateInCentsPerHour <= proposal.benchmarkHighInCentsPerHour;
    const canLock = resolvedStatus === "proposed" || resolvedStatus === "under_review";

    return (
      <div key={proposal.id} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{member?.name ?? proposal.memberId}</span>
          <span className="text-base font-semibold">
            {formatHourlyRateFromCents(proposal.proposedRateInCentsPerHour, proposal.currency)}
          </span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Benchmark{" "}
          {formatHourlyRateFromCents(proposal.benchmarkLowInCentsPerHour, proposal.currency)} –{" "}
          {formatHourlyRateFromCents(proposal.benchmarkHighInCentsPerHour, proposal.currency)} ·{" "}
          {proposal.benchmarkSourceLabel}
        </p>
        {!isInsideBenchmarkBand && (
          <p className="text-xs text-amber-800">
            Outside the cited band — a reviewer has to justify this before it locks.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Proposed by {proposal.proposedByName} · {formatIsoInstant(proposal.proposedAt)}
          {proposal.reviewerName ? ` · reviewed by ${proposal.reviewerName}` : ""}
          {proposal.lockedAt ? ` · locked ${formatIsoInstant(proposal.lockedAt)}` : ""}
        </p>
        {canLock && (
          <button
            type="button"
            onClick={() => handleLockClick(proposal.id)}
            className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium text-[#00696E]"
          >
            Review &amp; lock
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Fair market rate locks</h3>
      <p className="text-xs text-muted-foreground">
        Every time slice on this page is verified minutes × a locked rate. A rate is proposed
        against a benchmark band, reviewed by someone other than the member, then locked — it is
        never editable afterwards, only superseded.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">{currentProposals.map(renderProposal)}</div>

      {supersededProposals.length > 0 && (
        <details className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <summary className="cursor-pointer text-xs font-medium text-[#00696E]">
            Rate history — {supersededProposals.length} superseded
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {supersededProposals.map(renderProposal)}
          </div>
        </details>
      )}

      <form
        onSubmit={handleProposeSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#CAC4D0] p-4 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>Member</span>
          <select
            value={draftMemberId}
            onChange={(changeEvent) => setDraftMemberId(changeEvent.target.value)}
            className={INPUT_CLASS}
          >
            {teamMembers.map((teamMember) => (
              <option key={teamMember.id} value={teamMember.id}>
                {teamMember.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>Rate per hour (USD)</span>
          <input
            type="text"
            inputMode="decimal"
            value={draftRateInUnits}
            onChange={(changeEvent) => setDraftRateInUnits(changeEvent.target.value)}
            placeholder="85"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={LABEL_CLASS}>Benchmark source</span>
          <input
            type="text"
            value={draftBenchmarkSource}
            onChange={(changeEvent) => setDraftBenchmarkSource(changeEvent.target.value)}
            placeholder="Role · region · year"
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Propose rate
        </button>
      </form>
    </section>
  );
}
