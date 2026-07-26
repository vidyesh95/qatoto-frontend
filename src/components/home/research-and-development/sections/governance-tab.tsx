import Link from "next/link";

import CompensationAgreementsPanel from "@/components/home/research-and-development/sections/compensation-agreements-panel";
import { formatIsoDate } from "@/components/home/research-and-development/sections/compensation-format";
import CompensationStatementPanel from "@/components/home/research-and-development/sections/compensation-statement-panel";
import { MOCK_PROJECT_COMPENSATION_LEDGERS } from "@/mocks/research-and-development-compensation-mocks";
import type { ResearchProject } from "@/types/research-and-development";

// Compensation & governance tab (§5.5): the month-end statement, not an escrow
// ledger. Qatoto computes what each member is owed in cash and equity; the
// parties settle it between themselves. There is no pool to allocate from, no
// hold, and no release — so there are no allocated / released / held cards here
// and no client copy may imply a payment rail exists.
export default function GovernanceTab({ project }: { project: ResearchProject }) {
  const compensationLedger = MOCK_PROJECT_COMPENSATION_LEDGERS.find(
    (candidateLedger) => candidateLedger.projectId === project.id,
  );
  const openFundingRound = project.fundingRounds.find(
    (fundingRound) => fundingRound.status === "open",
  );

  return (
    <div className="space-y-8 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">
        Every month, Qatoto computes what each member is owed — cash and equity — and both sides
        sign off on the result. Qatoto holds no funds, charges nobody and moves no money.
      </p>

      {compensationLedger ? (
        <>
          <CompensationAgreementsPanel
            agreements={compensationLedger.agreements}
            teamMembers={project.teamMembers}
          />
          <CompensationStatementPanel
            projectName={project.name}
            periods={compensationLedger.periods}
            teamMembers={project.teamMembers}
          />
        </>
      ) : (
        <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
          No compensation period has been computed for this project yet.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Funding commitments</h3>
        <p className="text-xs text-muted-foreground">
          A pledge is a <span className="font-medium text-foreground">commitment</span>, not a
          charge. Nothing is collected, held or escrowed by Qatoto — the totals below are records of
          intent.
        </p>
        {openFundingRound ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
              <p className="text-xs text-muted-foreground">Committed so far</p>
              <p className="text-xl font-semibold">{openFundingRound.raisedAmount}</p>
            </div>
            <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
              <p className="text-xs text-muted-foreground">Round goal</p>
              <p className="text-xl font-semibold">{openFundingRound.goalAmount}</p>
            </div>
            <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
              <p className="text-xs text-muted-foreground">Backers committed</p>
              <p className="text-xl font-semibold">{openFundingRound.backersCount}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
            No open round right now.
          </p>
        )}
        {openFundingRound && (
          <p className="text-xs text-muted-foreground">
            Round closes {openFundingRound.closesOnDate}.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Planned milestone payouts</h3>
        <p className="text-xs text-muted-foreground">
          What the team plans to pay on each milestone. A plan, not an instruction to a payment rail
          — nothing here releases money.
        </p>
        <ul className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
          {project.milestones
            .filter((milestone) => milestone.escrowReleaseAmount)
            .map((milestone) => (
              <li key={milestone.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate text-sm">{milestone.title}</span>
                <span className="text-xs text-muted-foreground">Target {milestone.targetDate}</span>
                <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-xs font-medium text-[#191C1C]">
                  {milestone.escrowReleaseAmount}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <div>
        <Link
          href={`/research-and-development/project/${project.id}/proof-of-effort`}
          className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E] transition hover:bg-[#00696E]/20"
        >
          Slice-by-slice equity breakdown on the Proof of Effort ledger →
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Statement generated for the period ending{" "}
        {compensationLedger?.periods[0]
          ? formatIsoDate(compensationLedger.periods[0].periodEndDate)
          : "—"}
        . Every figure is a static mock this phase and entirely server-owned once integration
        starts.
      </p>
    </div>
  );
}
