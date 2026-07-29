// TRANSPORT: server-fetch — server component. Reads GET /governance/summary via
// @/lib/rnd/compensation.api, forwarding the session cookie through
// callerRequestOptions(). The endpoint is `attachOptionalUser`, so this page renders
// signed out — with the aggregates and the disclosure rules, and an empty own-lines
// section. See docs/R_AND_D_STRUCTURE.md §19.
import Link from "next/link";

import AccountabilityExplainer from "@/components/home/research-and-development/sections/accountability-explainer";
import CallerOpenLines from "@/components/home/research-and-development/sections/caller-open-lines";
import CommitmentsOverview from "@/components/home/research-and-development/sections/commitments-overview";
import GovernanceHero from "@/components/home/research-and-development/sections/governance-hero";
import GovernanceRulesBand from "@/components/home/research-and-development/sections/governance-rules-band";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import StatementWalkthrough from "@/components/home/research-and-development/sections/statement-walkthrough";
import { getGovernanceSummary } from "@/lib/rnd/compensation.api";
import {
  SAMPLE_STATEMENT_MEMBER_LABELS,
  SAMPLE_STATEMENT_WALKTHROUGH,
} from "@/mocks/research-and-development-compensation-mocks";
import { callerRequestOptions } from "@/lib/server-http";

const GOVERNANCE_PAGE_LIMIT = 24;

/**
 * Stage 05 — Funding & Governance (§4c.3). Public accountability across every project, and
 * READ-ONLY on purpose.
 *
 * TWO ABSENCES ARE THE DESIGN, and both survived wiring unchanged. There is no per-member
 * figure for anyone but the caller — a statement line names a person and what they are
 * owed, and the per-project tab behind membership is the only place that belongs. And
 * there is no finalize, countersign, record-payment, confirm or export control: each is
 * actor-scoped, and a cross-project page has no single actor to resolve a role for. The
 * backend agrees — none of those five verbs exists on the governance router at all.
 *
 * THE DISCLOSURE RULES ARRIVE AS KEYS AND ARE LOCALIZED HERE. The server ships
 * `disclosureKeys`, never English sentences, so three native clients render the same three
 * promises in their own locale and the wording cannot drift between them.
 *
 * THE WORKED EXAMPLE IS THE ONE PIECE OF AUTHORED DATA LEFT ON THIS SURFACE, and it is
 * labelled as such inside `StatementWalkthrough`. The backend deliberately does not serve
 * a sample statement (§11h): a real member's row on a public page is exactly what the rest
 * of this design exists to prevent. Recorded in R_AND_D_BACKEND_STRUCTURE.md Appendix D so
 * it stays a decision rather than a stray mock.
 */
export default async function GovernancePage() {
  const requestOptions = await callerRequestOptions();
  const summaryResult = await getGovernanceSummary(
    { limit: GOVERNANCE_PAGE_LIMIT },
    requestOptions,
  );

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <GovernanceHero />
      {renderSummary()}
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
            href="/research-and-development"
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

  function renderSummary() {
    // A single object read, so there is no list view state to lift: it either arrived or
    // it did not. A failure must NOT render as "no projects have statements yet", which
    // would report an outage as a finding about the platform's accountability.
    if (!summaryResult.success) {
      return (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load the governance rollup." />
        </div>
      );
    }

    const summary = summaryResult.data;

    return (
      <>
        <GovernanceRulesBand disclosureKeys={summary.disclosureKeys} />
        <CallerOpenLines lines={summary.callerOpenLines} />
        {summary.projects.length === 0 ? (
          <div className="px-4 lg:px-6">
            <RndStatusPanel message="No project has opened a compensation statement yet." />
          </div>
        ) : (
          <CommitmentsOverview
            rows={summary.projects}
            platformTotals={summary.platformTotals}
            asOf={summary.asOf}
          />
        )}
        {/* The gross-only notice travels with the payload rather than living in a client
            string table, precisely so no client can drop it. */}
        <p className="px-4 text-xs text-muted-foreground lg:px-6">{summary.grossOnlyNotice}</p>
      </>
    );
  }
}
