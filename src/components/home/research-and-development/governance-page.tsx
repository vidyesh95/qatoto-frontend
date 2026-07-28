// TRANSPORT: mock — NOT WIRED (phase 5). Reads a static dataset from
// src/mocks/research-and-development*. Every figure here is fabricated; see
// docs/R_AND_D_STRUCTURE.md §18 for what wires it and §19 for the transport map.
import Link from "next/link";

import AccountabilityExplainer from "@/components/home/research-and-development/sections/accountability-explainer";
import CommitmentsOverview from "@/components/home/research-and-development/sections/commitments-overview";
import GovernanceHero from "@/components/home/research-and-development/sections/governance-hero";
import GovernanceRulesBand from "@/components/home/research-and-development/sections/governance-rules-band";
import StatementWalkthrough from "@/components/home/research-and-development/sections/statement-walkthrough";
import {
  MOCK_GOVERNANCE_SUMMARY,
  SAMPLE_STATEMENT_MEMBER_LABELS,
  SAMPLE_STATEMENT_WALKTHROUGH,
} from "@/mocks/research-and-development-compensation-mocks";

// Stage 05 — Funding & Governance (R_AND_D_STRUCTURE.md §4c.3). Public
// accountability across every project, and READ-ONLY on purpose.
//
// Two absences are the design. There is no per-member figure anywhere on this
// page — a statement line names a person and what they are owed, and the
// per-project tab (behind membership) is the only place that belongs. And
// there is no finalize, countersign, record-payment, confirm or export control:
// each is actor-scoped, and a cross-project page has no single actor to resolve
// a role for. Putting them here would mean a second role switch and two places
// to reason about who may sign.
export default function GovernancePage() {
  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <GovernanceHero />
      <GovernanceRulesBand disclosureKeys={MOCK_GOVERNANCE_SUMMARY.disclosureKeys} />
      <CommitmentsOverview rows={MOCK_GOVERNANCE_SUMMARY.rows} />
      <StatementWalkthrough
        period={SAMPLE_STATEMENT_WALKTHROUGH}
        memberLabelsById={SAMPLE_STATEMENT_MEMBER_LABELS}
      />
      <AccountabilityExplainer />
      <section className="mx-4 space-y-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
        <h2 className="text-xl font-semibold md:text-2xl">Act on a project, not on this page</h2>
        <p className="text-sm text-muted-foreground">
          Finalizing, countersigning, recording a payment and confirming that one arrived all happen
          inside the project, by the person whose role allows it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/research-and-development/project/solar-cold-storage"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Open a project&apos;s governance tab
          </Link>
          <Link
            href="/research-and-development/funding"
            className="cursor-pointer rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E]"
          >
            Browse deal flow
          </Link>
        </div>
      </section>
    </div>
  );
}
