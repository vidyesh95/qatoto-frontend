"use client";

import { useState } from "react";

import {
  formatEffortFromMinutes,
  formatHourlyRateFromCents,
  formatIsoInstant,
  formatMoneyFromCents,
} from "@/components/home/research-and-development/sections/compensation-format";
import type {
  CompensationAgreement,
  CompensationAgreementStatus,
  TeamMember,
} from "@/types/research-and-development";

const AGREEMENT_STATUS_BADGES: Record<
  CompensationAgreementStatus,
  { label: string; className: string }
> = {
  proposed: { label: "Awaiting the member", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", className: "bg-[#00696E]/10 text-[#00696E]" },
  declined: { label: "Declined", className: "bg-red-100 text-red-800" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
};

const ENGAGEMENT_KIND_LABELS: Record<CompensationAgreement["engagementKind"], string> = {
  retainer: "Monthly retainer",
  hourly: "Hourly",
  equity_only: "Equity only",
};

// Composed from the typed integers on the agreement rather than a pre-rendered
// string, so the currency and the cap read correctly in any locale.
function describeTerms(agreement: CompensationAgreement): string {
  switch (agreement.engagementKind) {
    case "retainer":
      return `${formatMoneyFromCents(agreement.monthlyRetainerInCents, agreement.currency)} per month, gross`;
    case "hourly":
      return `${formatHourlyRateFromCents(agreement.hourlyRateInCents, agreement.currency)}, gross${
        agreement.monthlyCapMinutes === null
          ? " · uncapped"
          : ` · capped at ${formatEffortFromMinutes(agreement.monthlyCapMinutes)}/month`
      }`;
    case "equity_only":
      return "No cash. Equity accrues from verified effort only.";
    default: {
      const exhaustiveCheck: never = agreement;
      return exhaustiveCheck;
    }
  }
}

// Standing compensation agreements (§14.3): what each member is owed *before*
// any month is computed. A proposal is only a proposal — accepting or declining
// is the member's decision and nobody else's, so both buttons live behind the
// member view. Local state only this phase.
export default function CompensationAgreementsPanel({
  agreements,
  teamMembers,
}: {
  agreements: CompensationAgreement[];
  teamMembers: TeamMember[];
}) {
  const [locallyAcceptedIds, setLocallyAcceptedIds] = useState<string[]>([]);
  const [locallyDeclinedIds, setLocallyDeclinedIds] = useState<string[]>([]);

  const resolveStatus = (agreement: CompensationAgreement): CompensationAgreementStatus => {
    if (locallyAcceptedIds.includes(agreement.id)) return "accepted";
    if (locallyDeclinedIds.includes(agreement.id)) return "declined";
    return agreement.status;
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Compensation agreements</h3>
      <p className="text-xs text-muted-foreground">
        What each member is owed before any month is computed. A statement can only pay what an
        accepted agreement describes.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {agreements.map((agreement) => {
          const member = teamMembers.find((teamMember) => teamMember.id === agreement.memberId);
          const resolvedStatus = resolveStatus(agreement);
          const statusBadge = AGREEMENT_STATUS_BADGES[resolvedStatus];
          const isAwaitingResponse = resolvedStatus === "proposed";

          return (
            <div
              key={agreement.id}
              className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{member?.name ?? agreement.memberId}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {ENGAGEMENT_KIND_LABELS[agreement.engagementKind]}
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-sm">{describeTerms(agreement)}</p>
              <p className="text-xs text-muted-foreground">{agreement.equityPolicyNote}</p>
              <p className="text-xs text-muted-foreground">
                Proposed by {agreement.proposedByName} · {formatIsoInstant(agreement.proposedAt)}
                {agreement.respondedAt
                  ? ` · answered ${formatIsoInstant(agreement.respondedAt)}`
                  : ""}
              </p>
              {isAwaitingResponse && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLocallyAcceptedIds((currentIds) => [...currentIds, agreement.id])
                    }
                    className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Accept as {member?.name ?? "member"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLocallyDeclinedIds((currentIds) => [...currentIds, agreement.id])
                    }
                    className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
