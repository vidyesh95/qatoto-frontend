import type { CompensationPeriod, GovernanceSummary } from "@/types/research-and-development";

// Cross-project governance rollup for the /research-and-development/governance
// stage page (R_AND_D_STRUCTURE.md §4c.3, backend §11h). Static mock only.
//
// The whole shape of this file is a privacy decision, not a convenience. A
// month-end statement line names a person and what they are owed; pay data is
// personal data under the GDPR and specially sensitive in several member
// states. So the cross-project surface publishes AGGREGATES AND MECHANICS,
// NEVER PEOPLE — there is no member id, no user id, no name and no per-member
// amount anywhere below. Per-member lines stay on the per-project governance
// tab (§5.5), behind membership, together with the finalize / countersign /
// record-payment / confirm / export actions.
//
// Counts are derived by hand from the six ledgers in
// research-and-development-compensation-mocks.ts and the funding rounds in
// research-and-development-mocks.ts. `committedFundingInCents` is the sum of
// COMMITTED pledges across every round: no card is charged, no funds are held,
// and no label rendered from it may imply a rail, a hold, a charge or a fee.
export const MOCK_GOVERNANCE_SUMMARY: GovernanceSummary = {
  rows: [
    {
      projectId: "solar-cold-storage",
      projectName: "SolarChill Cold Storage",
      openPeriodCount: 1,
      finalizedPeriodCount: 2,
      supersededPeriodCount: 1,
      countersignedPeriodCount: 2,
      committedFundingInCents: 145_000,
      currency: "USD",
      investorConfidencePoints: 78,
    },
    {
      projectId: "modular-water-purification",
      projectName: "ClearFlow Modular Purification",
      openPeriodCount: 1,
      finalizedPeriodCount: 1,
      supersededPeriodCount: 0,
      countersignedPeriodCount: 1,
      committedFundingInCents: 490_000,
      currency: "USD",
      investorConfidencePoints: 64,
    },
    {
      projectId: "agricultural-drone-kits",
      projectName: "AgriFly Drone Kits",
      openPeriodCount: 1,
      finalizedPeriodCount: 1,
      supersededPeriodCount: 0,
      countersignedPeriodCount: 1,
      committedFundingInCents: 1_240_000,
      currency: "USD",
      investorConfidencePoints: 71,
    },
    {
      projectId: "prefab-housing-panels",
      projectName: "Bayanihan Build Panels",
      openPeriodCount: 1,
      finalizedPeriodCount: 1,
      supersededPeriodCount: 0,
      // Finalized but never countersigned — a second admin has not signed it.
      countersignedPeriodCount: 0,
      committedFundingInCents: 10_300_000,
      currency: "USD",
      // The confidence job has never run for this project. Null, never 0 —
      // a 0 would publish "no confidence" as a finding about the project
      // rather than about the job.
      investorConfidencePoints: null,
    },
    {
      projectId: "e-waste-recycling-line",
      projectName: "Sankofa Circuits Recovery",
      openPeriodCount: 1,
      finalizedPeriodCount: 1,
      supersededPeriodCount: 0,
      countersignedPeriodCount: 1,
      committedFundingInCents: 22_250_000,
      currency: "USD",
      investorConfidencePoints: 76,
    },
    {
      projectId: "medical-cold-chain-packaging",
      projectName: "ThermaSure Med Packaging",
      openPeriodCount: 1,
      finalizedPeriodCount: 1,
      supersededPeriodCount: 0,
      countersignedPeriodCount: 1,
      committedFundingInCents: 94_000_000,
      currency: "USD",
      investorConfidencePoints: 91,
    },
  ],
  // Keys, not English sentences — the client owns the copy so the web, Android
  // and iOS clients each render it in their own locale.
  disclosureKeys: [
    "platform_holds_no_funds",
    "verification_never_reduces_cash",
    "statement_is_gross_only",
  ],
  asOf: "2026-07-26T04:00:00Z",
};

// The worked example the governance page walks through. AUTHORED SAMPLE DATA,
// deliberately: it is not lifted from any project's ledger, and the member
// labels below are role descriptions rather than people, because publishing a
// real member's cash figure on a public cross-project page is exactly what the
// rollup above exists to avoid.
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
