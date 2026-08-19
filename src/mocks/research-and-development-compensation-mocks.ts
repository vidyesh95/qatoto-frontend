// The authored sample statement the /governance stage page walks through — never a real
// member's row. Re-exported here so that page imports one compensation-family composer.
//
// TWO FIXTURE SETS THAT USED TO LIVE BEHIND THIS BARREL ARE GONE.
// `MOCK_PROJECT_COMPENSATION_LEDGERS` went when the project detail page's Governance tab was
// deleted: it rendered an escrow ledger the backend contract retired, off a project shape that
// no longer exists. `MOCK_GOVERNANCE_SUMMARY` went later, unimported — the real rollup ships
// from `GET /governance/summary` and `governance-page.tsx` reads it.
//
// Per-project compensation is no longer a fixture at all: `compensation-tab.tsx` +
// `compensation-agreement-island.tsx` + `compensation-period-island.tsx` read the shipped
// `…/compensation-agreements` and `…/compensation-periods`. What survives here is ONLY the
// worked example, which is deliberate authored data and labelled as such on the page.
export {
  SAMPLE_STATEMENT_MEMBER_LABELS,
  SAMPLE_STATEMENT_WALKTHROUGH,
} from "@/mocks/research-and-development/governance-summary";
