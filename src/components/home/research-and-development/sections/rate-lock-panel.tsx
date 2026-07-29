// TRANSPORT: client-query — "use client" island. Reads GET …/members/:memberUserId/
// fair-market-rate for one member at a time and writes propose → accept → lock.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useAcceptFairMarketRateMutation,
  useLockFairMarketRateMutation,
  useMemberFairMarketRatesQuery,
  useProposeFairMarketRateMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatHourlyRateFromCents, formatIsoDate, formatIsoInstant } from "@/lib/rnd/format";
import { RATE_LOCK_ACKNOWLEDGEMENT } from "@/lib/rnd/proof-of-effort.schemas";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";

/**
 * The fair-market rate: proposed, accepted, locked.
 *
 * **THREE STEPS, RENDERED AS THREE STEPS, BECAUSE THE SPLIT IS THE ENTIRE SAFEGUARD.** The
 * founder proposes a number; THE MEMBER ACCEPTS IT; only then can either party lock it.
 * Without the accept, the founder both sets and ratifies what an hour of someone else's
 * work is worth — which is founder fiat wearing a process. A combined "set and lock"
 * button would erase the one step that makes this an agreement.
 *
 * **LOCKING IS IRREVERSIBLE AND TRIGGER-ENFORCED.** After it the row cannot be updated at
 * all: a rate that moved retroactively would re-price every hour already logged against
 * it. `409 RATE_ALREADY_LOCKED` on a second attempt.
 *
 * **NOTHING CAN BE CLAIMED UNTIL A RATE IS LOCKED** — `POST …/effort-claims` answers
 * `409 RATE_NOT_LOCKED` — which is why this panel sits above the claim form rather than
 * beside it.
 *
 * `409 RETROACTIVE_RATE_CHANGE` means the proposed `effectiveFrom` would re-price hours
 * that already exist. It is a finding about the date, not a transient failure.
 *
 * ONE MEMBER AT A TIME, because there is no project-wide rate read — only
 * `GET …/members/:memberUserId/fair-market-rate`. Recorded in
 * R_AND_D_BACKEND_STRUCTURE.md Appendix D.
 */
export default function RateLockPanel({
  projectSlug,
  team,
  viewerProjectRole,
}: {
  projectSlug: string;
  team: ProjectTeamMember[];
  viewerProjectRole: string | null;
}) {
  const [selectedMemberUserId, setSelectedMemberUserId] = useState(team[0]?.userId ?? "");
  const [fairMarketRateCentsPerHour, setFairMarketRateCentsPerHour] = useState("");
  const [paidCashRateCentsPerHour, setPaidCashRateCentsPerHour] = useState("0");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [rationaleNote, setRationaleNote] = useState("");
  const [typedAcknowledgement, setTypedAcknowledgement] = useState("");

  const ratesQuery = useMemberFairMarketRatesQuery(projectSlug, selectedMemberUserId || undefined);
  const proposeMutation = useProposeFairMarketRateMutation(projectSlug);
  const acceptMutation = useAcceptFairMarketRateMutation(projectSlug);
  const lockMutation = useLockFairMarketRateMutation(projectSlug);

  const firstError = [proposeMutation.error, acceptMutation.error, lockMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isFounder = viewerProjectRole === "founder";
  if (viewerProjectRole === null || team.length === 0) return null;

  const rates = ratesQuery.data ?? [];
  const acknowledgementMatches = typedAcknowledgement === RATE_LOCK_ACKNOWLEDGEMENT;

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Fair market rates</h3>
        <p className="text-xs text-muted-foreground">
          What an hour of someone&apos;s work is worth here. The founder proposes it, the member
          accepts it, and only then can it be locked — nothing can be claimed against an unlocked
          rate.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Whose rate</span>
        <select
          value={selectedMemberUserId}
          onChange={(changeEvent) => setSelectedMemberUserId(changeEvent.target.value)}
          className={INPUT_CLASS}
        >
          {team.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      {rates.length > 0 ? (
        <ul className="space-y-2">
          {rates.map((rate) => (
            <li key={rate.id} className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3">
              <p className="text-sm">
                {formatHourlyRateFromCents(
                  BigInt(rate.fairMarketRateCentsPerHour),
                  rate.currencyCode,
                )}{" "}
                fair market ·{" "}
                {formatHourlyRateFromCents(
                  BigInt(rate.paidCashRateCentsPerHour),
                  rate.currencyCode,
                )}{" "}
                paid in cash
                <span className="block text-xs text-muted-foreground">
                  {/* The number the ledger actually prices — returned by the server so
                      nobody re-derives it and gets the subtraction backwards. */}
                  {formatHourlyRateFromCents(
                    BigInt(rate.unpaidRateCentsPerHour),
                    rate.currencyCode,
                  )}{" "}
                  of it is unpaid, and that is what mints slices
                </span>
              </p>

              <p className="text-xs text-muted-foreground">
                {rate.status} · from {formatIsoDate(rate.effectiveFrom)}
                {rate.acceptedAt !== null && ` · accepted ${formatIsoInstant(rate.acceptedAt)}`}
                {rate.lockedAt !== null && ` · locked ${formatIsoInstant(rate.lockedAt)}`}
              </p>

              <p className="text-xs text-muted-foreground">{rate.rationaleNote}</p>

              {rate.status === "proposed" && (
                <button
                  type="button"
                  disabled={acceptMutation.isPending}
                  onClick={() =>
                    acceptMutation.mutate({
                      memberUserId: rate.memberUserId,
                      rateId: rate.id,
                    })
                  }
                  className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Accept it — only {rate.memberName} can
                </button>
              )}

              {rate.status === "accepted" && (
                <div className="space-y-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Type {RATE_LOCK_ACKNOWLEDGEMENT} to lock it permanently
                    </span>
                    <input
                      value={typedAcknowledgement}
                      onChange={(changeEvent) => setTypedAcknowledgement(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    A locked rate can never be changed. Every hour logged from here is priced
                    against it, which is why moving it afterwards is impossible rather than
                    discouraged.
                  </p>
                  <button
                    type="button"
                    disabled={!acknowledgementMatches || lockMutation.isPending}
                    onClick={() =>
                      lockMutation.mutate({
                        memberUserId: rate.memberUserId,
                        rateId: rate.id,
                        acknowledgement: RATE_LOCK_ACKNOWLEDGEMENT,
                      })
                    }
                    className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Lock it
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No rate has been proposed for this member. Until one is locked, their effort cannot be
          priced and no claim against it will be accepted.
        </p>
      )}

      {isFounder && (
        <form
          className="space-y-2 border-t border-[#CAC4D0]/40 pt-3"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            proposeMutation.mutate({
              memberUserId: selectedMemberUserId,
              input: {
                fairMarketRateCentsPerHour,
                paidCashRateCentsPerHour,
                effectiveFrom,
                rationaleNote: rationaleNote.trim(),
              },
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Propose a rate (cents per hour)</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]*"
              value={fairMarketRateCentsPerHour}
              onChange={(changeEvent) => setFairMarketRateCentsPerHour(changeEvent.target.value)}
              placeholder="What the market would pay them"
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Of which, paid in cash (cents per hour)</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]*"
              value={paidCashRateCentsPerHour}
              onChange={(changeEvent) => setPaidCashRateCentsPerHour(changeEvent.target.value)}
              className={INPUT_CLASS}
            />
            <span className="text-xs text-muted-foreground">
              The difference is what goes unpaid — and that difference is what mints slices. Zero
              cash means every hour is equity.
            </span>
          </label>
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
            placeholder="How was this number arrived at?"
            className={INPUT_CLASS}
          />
          {/* No currency field: it comes from the project, because a client-chosen one
              would let a $120/h rate be re-read as ¥120/h. */}
          <p className="text-xs text-muted-foreground">
            Backdating it past hours that already exist is refused — a rate cannot re-price work
            already logged.
          </p>
          <button
            type="submit"
            disabled={proposeMutation.isPending}
            className="cursor-pointer rounded-full border border-[#00696E]/40 px-3 py-1.5 text-xs font-medium text-[#00696E] disabled:opacity-50"
          >
            {proposeMutation.isPending ? "Proposing…" : "Propose it"}
          </button>
        </form>
      )}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </section>
  );
}
