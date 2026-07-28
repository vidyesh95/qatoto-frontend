// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Image from "next/image";
import { useState } from "react";

import { formatIsoInstant } from "@/components/home/research-and-development/sections/compensation-format";
import type {
  ClaimVerificationRun,
  TeamMember,
  VerificationOverrideDecision,
  VerificationOverrideRequest,
} from "@/types/research-and-development";

const DECISION_LABELS: Record<VerificationOverrideDecision, string> = {
  uphold_flag: "Flag upheld",
  override_to_verified: "Overridden → verified",
  override_to_unverified: "Overridden → unverified",
};

const DECISION_CLASSES: Record<VerificationOverrideDecision, string> = {
  uphold_flag: "bg-amber-100 text-amber-800",
  override_to_verified: "bg-[#00696E]/10 text-[#00696E]",
  override_to_unverified: "bg-red-100 text-red-800",
};

const DECISION_ORDER: VerificationOverrideDecision[] = [
  "override_to_verified",
  "uphold_flag",
  "override_to_unverified",
];

type LocalDecision = {
  requestId: string;
  decision: VerificationOverrideDecision;
};

// Human review of an automated verification verdict (§14.1). A maintainer can
// reverse a flag, uphold it, or reverse it against the member — review is not a
// rubber stamp in either direction. Whatever the decision, no cash line moves:
// verification gates equity only. Local state only this phase.
export default function VerificationOverridePanel({
  overrideRequests,
  claimVerificationRuns,
  teamMembers,
}: {
  overrideRequests: VerificationOverrideRequest[];
  claimVerificationRuns: ClaimVerificationRun[];
  teamMembers: TeamMember[];
}) {
  const [localDecisions, setLocalDecisions] = useState<LocalDecision[]>([]);

  const findMember = (memberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === memberId);
  const findRun = (runId: string) =>
    claimVerificationRuns.find((claimVerificationRun) => claimVerificationRun.id === runId);
  const findLocalDecision = (requestId: string) =>
    localDecisions.find((localDecision) => localDecision.requestId === requestId)?.decision;

  const handleDecisionClick = (requestId: string, decision: VerificationOverrideDecision) =>
    setLocalDecisions((currentDecisions) => [
      ...currentDecisions.filter((localDecision) => localDecision.requestId !== requestId),
      { requestId, decision },
    ]);

  if (overrideRequests.length === 0) {
    return (
      <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
        No member has asked for a human to re-examine a verdict.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {overrideRequests.map((overrideRequest) => {
        const requester = findMember(overrideRequest.requestedByMemberId);
        const relatedRun = findRun(overrideRequest.claimVerificationRunId);
        const decision = overrideRequest.decision ?? findLocalDecision(overrideRequest.id);
        const reviewerName =
          overrideRequest.reviewerName ?? (findLocalDecision(overrideRequest.id) ? "You" : null);

        return (
          <div
            key={overrideRequest.id}
            className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              {requester && (
                <Image
                  src={requester.avatarImageSrc}
                  width={32}
                  height={32}
                  alt={requester.name}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium">{requester?.name ?? "A member"}</span>
              <span className="text-xs text-muted-foreground">
                {formatIsoInstant(overrideRequest.requestedAt)}
              </span>
              {decision ? (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${DECISION_CLASSES[decision]}`}
                >
                  {DECISION_LABELS[decision]}
                </span>
              ) : (
                <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Awaiting review
                </span>
              )}
            </div>

            {relatedRun && (
              <p className="text-xs text-muted-foreground">
                On: {relatedRun.claimSummary} · {relatedRun.claimDateLabel}
              </p>
            )}
            <p className="text-sm">{overrideRequest.memberStatement}</p>

            {decision ? (
              <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                Reviewed by {reviewerName ?? "a maintainer"}
                {overrideRequest.reviewedAt
                  ? ` · ${formatIsoInstant(overrideRequest.reviewedAt)}`
                  : ""}
                {overrideRequest.reviewerRationale
                  ? ` — ${overrideRequest.reviewerRationale}`
                  : " — recorded in this session only."}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Maintainer decision:</span>
                {DECISION_ORDER.map((decisionOption) => (
                  <button
                    key={decisionOption}
                    type="button"
                    onClick={() => handleDecisionClick(overrideRequest.id, decisionOption)}
                    className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {DECISION_LABELS[decisionOption]}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
