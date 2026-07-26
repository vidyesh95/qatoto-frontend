import type { ProjectOversight } from "@/types/research-and-development";
import { INTEGRATION_SCOPES_BY_PROVIDER } from "@/mocks/research-and-development/oversight/integration-scopes";

// Named so each entry's previousEntryHash is literally the prior entry's hash.
const EWASTE_AUDIT_1_HASH = "6b19d7f402ae83c50d72fb18a396e40c7c48b0e195da236f0b58e7d41c92a306";
const EWASTE_AUDIT_2_HASH = "af03c81b95d24e670e59a3b7d18c02f4396b7e0da2c518f47b02d6e93ca15074";
const EWASTE_AUDIT_3_HASH = "12e8a4c70b9d365f8d40b17ec592a63f05c1e78b34d902af6e15b90c7d38f421";
const EWASTE_AUDIT_4_HASH = "d70bc23e4915af860a1e7c34b98d052f8b34e07c96d1a25f403e8b7c1d69a05e";

// Sankofa Circuits: everything connected, everything locked, no open cases —
// the fixture that shows a bake blocked only by the trigger event itself.
export const E_WASTE_RECYCLING_LINE_OVERSIGHT: ProjectOversight = {
  projectId: "e-waste-recycling-line",
  disputeCases: [
    {
      id: "ewaste-dispute-case-1",
      disputeWindowEntryId: "ewaste-dispute-chidi-jul-4",
      raisedByMemberId: "efua-boateng",
      raisedAt: "2026-07-04T12:00:00Z",
      reason: "Assay run was billed at engineering rate but ran unattended for four of six hours.",
      quorumRequiredVoteCount: 3,
      escrowedSlices: 1200,
      votes: [
        {
          id: "ewaste-vote-1a",
          memberId: "efua-boateng",
          choice: "reduce_allocation",
          castAt: "2026-07-04T12:01:00Z",
          rationale: "Unattended furnace time is elapsed, not worked.",
        },
        {
          id: "ewaste-vote-1b",
          memberId: "kwame-mensah",
          choice: "reduce_allocation",
          castAt: "2026-07-04T14:30:00Z",
          rationale: "Agreed — we set this precedent on the bench process.",
        },
        {
          id: "ewaste-vote-1c",
          memberId: "fatima-diallo",
          choice: "abstain",
          castAt: "2026-07-04T16:10:00Z",
          rationale: "Not close enough to the lab process to judge.",
        },
      ],
      status: "resolved",
      resolutionNote: "Re-verified at 2 hours. 800 of 1,200 escrowed slices returned to the pool.",
      resolvedAt: "2026-07-05T08:00:00Z",
    },
  ],
  verificationOverrideRequests: [
    {
      id: "ewaste-override-1",
      claimVerificationRunId: "ewaste-verify-jul-4",
      requestedByMemberId: "fatima-diallo",
      requestedAt: "2026-07-04T18:00:00Z",
      memberStatement:
        "The regulator meeting is minuted on paper only. The signed minutes are attached to the log.",
      status: "reviewed",
      reviewerName: "Kwame Mensah",
      reviewedAt: "2026-07-05T09:30:00Z",
      decision: "override_to_verified",
      reviewerRationale:
        "Minutes are signed by the EPA officer and dated inside the claim window. Flag overridden.",
    },
  ],
  integrationConnections: [
    {
      providerKey: "google_drive",
      status: "connected",
      connectedByMemberId: "fatima-diallo",
      connectedAt: "2026-02-18T08:00:00Z",
      revokedAt: null,
      lastSyncedAt: "2026-07-26T06:00:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.google_drive,
      grantedScopeKeys: ["drive.metadata.readonly"],
      dataRetentionDays: 400,
      evidenceContributionNote: "Compliance filings and assay sheets carry revision timestamps.",
    },
    {
      providerKey: "jira",
      status: "connected",
      connectedByMemberId: "efua-boateng",
      connectedAt: "2025-12-03T09:00:00Z",
      revokedAt: null,
      lastSyncedAt: "2026-07-25T20:00:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.jira,
      grantedScopeKeys: ["read:issue", "read:worklog"],
      dataRetentionDays: 400,
      evidenceContributionNote: "Plant tickets and work logs ground operations claims.",
    },
    {
      providerKey: "github",
      status: "connected",
      connectedByMemberId: "kwame-mensah",
      connectedAt: "2026-01-15T10:00:00Z",
      revokedAt: null,
      lastSyncedAt: "2026-07-25T19:40:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.github,
      grantedScopeKeys: ["repo:commits", "repo:pulls"],
      dataRetentionDays: 400,
      evidenceContributionNote: "Line-control firmware commits ground automation claims.",
    },
  ],
  rateLockProposals: [
    {
      id: "ewaste-rate-kwame",
      memberId: "kwame-mensah",
      proposedRateInCentsPerHour: 8500,
      currency: "USD",
      status: "locked",
      proposedByName: "Kwame Mensah",
      proposedAt: "2025-10-06T09:00:00Z",
      benchmarkSourceLabel: "Process engineer · West Africa · 2026 band",
      benchmarkLowInCentsPerHour: 6500,
      benchmarkHighInCentsPerHour: 10500,
      reviewerName: "Efua Boateng",
      reviewedAt: "2025-12-02T09:10:00Z",
      lockedAt: "2025-12-02T09:12:00Z",
      supersededByProposalId: null,
    },
    {
      id: "ewaste-rate-efua",
      memberId: "efua-boateng",
      proposedRateInCentsPerHour: 3000,
      currency: "USD",
      status: "locked",
      proposedByName: "Kwame Mensah",
      proposedAt: "2025-12-01T08:30:00Z",
      benchmarkSourceLabel: "Operations manager · West Africa · 2026 band",
      benchmarkLowInCentsPerHour: 2400,
      benchmarkHighInCentsPerHour: 4000,
      reviewerName: "Chidi Nwosu",
      reviewedAt: "2025-12-02T08:00:00Z",
      lockedAt: "2025-12-02T08:01:00Z",
      supersededByProposalId: null,
    },
    {
      id: "ewaste-rate-chidi",
      memberId: "chidi-nwosu",
      proposedRateInCentsPerHour: 2500,
      currency: "USD",
      status: "locked",
      proposedByName: "Kwame Mensah",
      proposedAt: "2026-01-12T11:10:00Z",
      benchmarkSourceLabel: "Metallurgical chemist · West Africa · 2026 band",
      benchmarkLowInCentsPerHour: 2000,
      benchmarkHighInCentsPerHour: 3400,
      reviewerName: "Fatima Diallo",
      reviewedAt: "2026-01-13T07:00:00Z",
      lockedAt: "2026-01-13T07:02:00Z",
      supersededByProposalId: null,
    },
    {
      id: "ewaste-rate-fatima",
      memberId: "fatima-diallo",
      proposedRateInCentsPerHour: 2400,
      currency: "USD",
      status: "locked",
      proposedByName: "Kwame Mensah",
      proposedAt: "2026-02-16T12:50:00Z",
      benchmarkSourceLabel: "Compliance lead · West Africa · 2026 band",
      benchmarkLowInCentsPerHour: 1900,
      benchmarkHighInCentsPerHour: 3300,
      reviewerName: "Efua Boateng",
      reviewedAt: "2026-02-17T08:00:00Z",
      lockedAt: "2026-02-17T08:01:00Z",
      supersededByProposalId: null,
    },
  ],
  pieBakeReadiness: {
    triggerEventLabel: "Cash-flow breakeven",
    checklistItems: [
      {
        key: "breakeven",
        displayLabel: "Cash-flow breakeven reached",
        detailNote: "Two of three trailing months covered; June fell short on scrap prices.",
        status: "not_met",
      },
      {
        key: "rates-locked",
        displayLabel: "Every member's rate is locked",
        detailNote: "All four rates locked since February.",
        status: "met",
      },
      {
        key: "disputes-closed",
        displayLabel: "No open dispute cases",
        detailNote: "The Jul 4 assay case resolved.",
        status: "met",
      },
      {
        key: "claims-verified",
        displayLabel: "No claims awaiting human review",
        detailNote: "The one override request was reviewed and granted.",
        status: "met",
      },
      {
        key: "agreements-accepted",
        displayLabel: "Every compensation agreement accepted",
        detailNote: "All four accepted.",
        status: "met",
      },
    ],
    frozenCapTableRows: [
      { memberId: "kwame-mensah", totalSlices: 120000, equityBasisPoints: 6000 },
      { memberId: "efua-boateng", totalSlices: 17000, equityBasisPoints: 850 },
      { memberId: "chidi-nwosu", totalSlices: 14000, equityBasisPoints: 700 },
      { memberId: "fatima-diallo", totalSlices: 10000, equityBasisPoints: 500 },
    ],
    reservedSlices: 39000,
    totalSlicesInPool: 200000,
  },
  chainVerification: {
    headEntryHash: EWASTE_AUDIT_4_HASH,
    entryCount: 4,
    inputs: [
      {
        auditEntryId: "ewaste-audit-4",
        entryHash: EWASTE_AUDIT_4_HASH,
        previousEntryHash: EWASTE_AUDIT_3_HASH,
        canonicalPayload:
          '{"actionLabel":"Recorded milestone payout","actorName":"Kwame Mensah","eventKind":"payment","occurredAt":"2026-07-07T10:00:00Z","targetLabel":"Safety retrofit"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "ewaste-audit-3",
        entryHash: EWASTE_AUDIT_3_HASH,
        previousEntryHash: EWASTE_AUDIT_2_HASH,
        canonicalPayload:
          '{"actionLabel":"Approved leachate handling change","actorName":"Chidi Nwosu","eventKind":"decision","occurredAt":"2026-07-05T09:00:00Z","targetLabel":"Closed-loop rinse"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "ewaste-audit-2",
        entryHash: EWASTE_AUDIT_2_HASH,
        previousEntryHash: EWASTE_AUDIT_1_HASH,
        canonicalPayload:
          '{"actionLabel":"Assigned collection-network expansion","actorName":"Kwame Mensah","eventKind":"task-assignment","occurredAt":"2026-07-02T08:30:00Z","targetLabel":"Efua Boateng"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "ewaste-audit-1",
        entryHash: EWASTE_AUDIT_1_HASH,
        previousEntryHash: "genesis",
        canonicalPayload:
          '{"actionLabel":"Opened role","actorName":"Kwame Mensah","eventKind":"hire","occurredAt":"2026-06-18T09:00:00Z","targetLabel":"Plant Automation Engineer"}',
        hashAlgorithmLabel: "SHA-256",
      },
    ],
  },
};
