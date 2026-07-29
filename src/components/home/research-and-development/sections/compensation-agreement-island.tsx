// TRANSPORT: client-query — "use client" island. Writes
// POST …/members/:memberUserId/compensation-agreement and the accept / decline / withdraw
// decisions on an existing one.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useDecideCompensationAgreementMutation,
  useProposeCompensationAgreementMutation,
} from "@/hooks/rnd/compensation";
import { ApiRequestError } from "@/lib/http";
import {
  ENGAGEMENT_KINDS,
  EngagementKindSchema,
  type CompensationAgreement,
  type EngagementKind,
} from "@/lib/rnd/compensation.schemas";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";

const ENGAGEMENT_KIND_LABELS: Record<EngagementKind, string> = {
  employee: "Employee",
  independent_contractor: "Independent contractor",
  unpaid_founder: "Unpaid founder",
};

/** Two bases exist and exactly one may be set. A third option would be a 422 generator. */
type CompensationBasis = "monthly" | "hourly";

/**
 * Propose a cash agreement, and respond to one.
 *
 * **THREE ACTORS, AND THE SPLIT IS THE SAFEGUARD.** The founder proposes; THE MEMBER
 * accepts or declines — never the proposer, which the backend enforces with a `403`; and
 * the proposer withdraws. A single "approve" button available to whoever is looking would
 * collapse a two-party agreement into one person's decision.
 *
 * **EXACTLY ONE BASIS.** Monthly or hourly, never both and never neither for a paying
 * engagement — a DB CHECK enforces it and the propose endpoint answers `422` on a body
 * carrying two. The radio makes the illegal combination unreachable rather than merely
 * discouraged.
 *
 * **NO `currencyCode` IS SENT.** It is derived from the project, because a client-chosen
 * currency would let a $4,000/month agreement be re-read as ¥4,000/month.
 *
 * A DECLINE WRITES `withdrawn`, not `declined` — the status enum has four values and that
 * is not one of them. The audit entry is what distinguishes a member's refusal from a
 * founder's retraction, so the copy here avoids claiming the row will say which.
 */
export default function CompensationAgreementIsland({
  projectSlug,
  team,
  agreements,
  viewerProjectRole,
}: {
  projectSlug: string;
  team: ProjectTeamMember[];
  agreements: CompensationAgreement[];
  viewerProjectRole: string | null;
}) {
  const proposeMutation = useProposeCompensationAgreementMutation(projectSlug);
  const decideMutation = useDecideCompensationAgreementMutation(projectSlug);

  const [memberUserId, setMemberUserId] = useState(team[0]?.userId ?? "");
  const [engagementKind, setEngagementKind] = useState<EngagementKind>("independent_contractor");
  const [basis, setBasis] = useState<CompensationBasis>("monthly");
  const [amountInCents, setAmountInCents] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [rationaleNote, setRationaleNote] = useState("");

  const firstError = [proposeMutation.error, decideMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isFounder = viewerProjectRole === "founder";
  const proposedAgreements = agreements.filter((agreement) => agreement.status === "proposed");

  if (viewerProjectRole === null) return null;

  return (
    <div className="space-y-4 border-t border-[#CAC4D0]/40 pt-6">
      {proposedAgreements.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Waiting on a decision</h3>
          <ul className="space-y-2">
            {proposedAgreements.map((agreement) => (
              <li
                key={agreement.id}
                className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
              >
                <p>
                  <span className="font-medium">{agreement.memberName}</span> —{" "}
                  {ENGAGEMENT_KIND_LABELS[agreement.engagementKind]}
                </p>
                <p className="text-xs text-muted-foreground">{agreement.rationaleNote}</p>
                <div className="flex flex-wrap gap-2">
                  {/* Offered to everyone; the backend refuses the wrong actor with a
                      403 rather than this component guessing who may press what. */}
                  <button
                    type="button"
                    disabled={decideMutation.isPending}
                    onClick={() =>
                      decideMutation.mutate({ agreementId: agreement.id, decision: "accept" })
                    }
                    className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Accept it (only the member can)
                  </button>
                  <button
                    type="button"
                    disabled={decideMutation.isPending}
                    onClick={() =>
                      decideMutation.mutate({ agreementId: agreement.id, decision: "decline" })
                    }
                    className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    Decline it
                  </button>
                  {isFounder && (
                    <button
                      type="button"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({
                          agreementId: agreement.id,
                          decision: "withdraw",
                          note: "Withdrawn by the proposer",
                        })
                      }
                      className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      Withdraw the offer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isFounder && team.length > 0 && (
        <form
          className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            proposeMutation.mutate({
              memberUserId,
              input: {
                engagementKind,
                ...(basis === "monthly"
                  ? { monthlyAmountInCents: amountInCents }
                  : { hourlyRateCentsPerHour: amountInCents }),
                effectiveFrom,
                rationaleNote: rationaleNote.trim(),
              },
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Propose cash for</span>
            <select
              value={memberUserId}
              onChange={(changeEvent) => setMemberUserId(changeEvent.target.value)}
              className={INPUT_CLASS}
            >
              {team.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <select
            value={engagementKind}
            onChange={(changeEvent) => {
              const parsed = EngagementKindSchema.safeParse(changeEvent.target.value);
              if (parsed.success) setEngagementKind(parsed.data);
            }}
            className={INPUT_CLASS}
          >
            {ENGAGEMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ENGAGEMENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>

          <fieldset className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="compensation-basis"
                checked={basis === "monthly"}
                onChange={() => setBasis("monthly")}
              />
              Monthly retainer
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="compensation-basis"
                checked={basis === "hourly"}
                onChange={() => setBasis("hourly")}
              />
              Hourly rate
            </label>
          </fieldset>

          <input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={amountInCents}
            onChange={(changeEvent) => setAmountInCents(changeEvent.target.value)}
            placeholder={
              basis === "monthly"
                ? "Amount per month, in whole cents"
                : "Rate per hour, in whole cents"
            }
            className={INPUT_CLASS}
          />

          <input
            required
            type="date"
            value={effectiveFrom}
            onChange={(changeEvent) => setEffectiveFrom(changeEvent.target.value)}
            className={INPUT_CLASS}
          />

          <textarea
            required
            rows={2}
            value={rationaleNote}
            onChange={(changeEvent) => setRationaleNote(changeEvent.target.value)}
            placeholder="Why this figure?"
            className={INPUT_CLASS}
          />

          <p className="text-xs text-muted-foreground">
            One basis or the other, never both. The currency comes from the project. An hourly rate
            that disagrees with the member&apos;s locked §9 rate is refused — the same cash cannot
            be described two ways.
          </p>

          <button
            type="submit"
            disabled={proposeMutation.isPending}
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {proposeMutation.isPending ? "Proposing…" : "Propose it"}
          </button>
        </form>
      )}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </div>
  );
}
