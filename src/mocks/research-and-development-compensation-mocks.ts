// Cross-project governance rollup (§4c.3) — aggregates and an authored sample
// statement, never a real member's row. Re-exported here so the governance stage
// page imports one compensation-family composer.
//
// THE SIX PER-PROJECT LEDGERS ARE GONE. `MOCK_PROJECT_COMPENSATION_LEDGERS` and
// src/mocks/research-and-development/compensation/** were read by exactly one
// component, the project detail page's Governance tab, which was deleted when that
// page wired up: it rendered an escrow ledger the backend contract retired (nine
// escrow routes now 404) off a project shape that no longer exists.
//
// Per-project compensation statements are phase 5 and land against the shipped
// `…/compensation-agreements` and `…/compensation-periods` reads, not against a
// fixture. What survives here is only what the /governance stage page still renders.
export {
  MOCK_GOVERNANCE_SUMMARY,
  SAMPLE_STATEMENT_MEMBER_LABELS,
  SAMPLE_STATEMENT_WALKTHROUGH,
} from "@/mocks/research-and-development/governance-summary";
