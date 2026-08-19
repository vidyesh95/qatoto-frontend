import type { CompensationPeriod } from "@/types/research-and-development";

// The worked example the governance page walks through. AUTHORED SAMPLE DATA,
// deliberately: it is not lifted from any project's ledger, and the member
// labels below are role descriptions rather than people. Publishing a real
// member's cash figure on a public cross-project page is the thing this whole
// surface is shaped to avoid — pay data is personal data under the GDPR and
// specially sensitive in several member states, so /governance publishes
// AGGREGATES AND MECHANICS, NEVER PEOPLE. Per-member lines stay on the
// per-project compensation tab, behind membership.
//
// `MOCK_GOVERNANCE_SUMMARY` used to sit above this and was DELETED: the real
// rollup ships from GET /governance/summary and nothing imported the fixture.
//
// It reuses the shipped CompensationPeriod shape so the same
// compensation-format.ts helpers render it, and it shows one of each line kind:
// a retainer, an hourly line with the verified minutes behind it, and a signed
// equity delta that falls because others out-contributed.
export const SAMPLE_STATEMENT_WALKTHROUGH: CompensationPeriod = {
  id: "sample-period-2026-06",
  periodStartDate: "2026-06-01",
  periodEndDate: "2026-06-30",
  timeZone: "Africa/Nairobi",
  status: "finalized",
  statementHash: "b7c41d8e5f0a9236c48d17be250fa9c3e86d40b715cf9238ad6e0c4f13857a92",
  asOf: null,
  finalizedAt: "2026-07-02T06:15:00Z",
  finalizedByName: "The project's founder",
  countersignedAt: "2026-07-03T09:40:00Z",
  countersignedByName: "A second admin",
  supersededByPeriodId: null,
  supersedeReason: null,
  lines: [
    {
      id: "sample-line-designer-retainer",
      memberId: "sample-member-designer",
      kind: "cash_retainer",
      grossAmountInCents: 240_000,
      currency: "USD",
      verificationNote: null,
    },
    {
      id: "sample-line-engineer-hourly",
      memberId: "sample-member-engineer",
      kind: "cash_hourly",
      grossAmountInCents: 198_000,
      currency: "USD",
      verifiedEffortMinutes: 2_640,
      hourlyRateInCents: 4_500,
      // A flagged claim annotates the line and changes no number: verification
      // gates equity, never a wage.
      verificationNote:
        "One claim in this month is flagged for human review. The cash figure is unchanged — the flag gates the equity line only.",
    },
    {
      id: "sample-line-founder-equity",
      memberId: "sample-member-founder",
      kind: "equity_delta",
      openingEquityBasisPoints: 6_250,
      closingEquityBasisPoints: 6_200,
      // Signed and negative: a share falls when others out-contribute you.
      deltaBasisPoints: -50,
      verificationNote: null,
    },
  ],
  payments: [
    {
      id: "sample-payment-designer",
      lineId: "sample-line-designer-retainer",
      paidAmountInCents: 240_000,
      currency: "USD",
      paidOnDate: "2026-07-04",
      methodKey: "bank_transfer",
      recordedByName: "The project's founder",
      recordedAt: "2026-07-04T10:05:00Z",
      confirmedByMemberAt: "2026-07-05T07:20:00Z",
    },
    {
      id: "sample-payment-engineer",
      lineId: "sample-line-engineer-hourly",
      paidAmountInCents: 198_000,
      currency: "USD",
      paidOnDate: "2026-07-04",
      methodKey: "mobile_money",
      recordedByName: "The project's founder",
      recordedAt: "2026-07-04T10:06:00Z",
      // Recorded but not yet confirmed — renders as unconfirmed, never as paid.
      confirmedByMemberAt: null,
    },
  ],
};

// Role descriptions for the sample statement's member ids. Not people — the
// walkthrough teaches the mechanics without publishing anyone's figures.
export const SAMPLE_STATEMENT_MEMBER_LABELS: Record<string, string> = {
  "sample-member-designer": "Designer · retainer",
  "sample-member-engineer": "Engineer · hourly",
  "sample-member-founder": "Founder · equity only",
};
