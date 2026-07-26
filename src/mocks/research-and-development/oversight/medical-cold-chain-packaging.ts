import type { ProjectOversight } from "@/types/research-and-development";
import { INTEGRATION_SCOPES_BY_PROVIDER } from "@/mocks/research-and-development/oversight/integration-scopes";

// Named so each entry's previousEntryHash is literally the prior entry's hash.
const MED_AUDIT_1_HASH = "8c05e91b6d3a274f0e5b8a03c619d7f42b06e5c39d81a70f5c3e28b9146da70b";
const MED_AUDIT_2_HASH = "34fb70a9c1e5d82609ac3b47f6d15e802c9a7b0e34d16f58a027ce9b41d370a6";
const MED_AUDIT_3_HASH = "0e6b39d81f24ca57b8d0e73a91c548f26a05c74be913d28f70b1a6c95d340e82";
const MED_AUDIT_4_HASH = "b52d08fa7c93e164a70b52d9e386c04f19d7b3a05e2c48f6910db27ac53e8f04";

// ThermaSure: the one baked pie on the surface — every checklist item is met
// and the cap table below is frozen, not a preview.
export const MEDICAL_COLD_CHAIN_PACKAGING_OVERSIGHT: ProjectOversight = {
  projectId: "medical-cold-chain-packaging",
  disputeCases: [
    {
      id: "med-dispute-case-1",
      disputeWindowEntryId: "med-dispute-jonas-jun-29",
      raisedByMemberId: "ingrid-sorensen",
      raisedAt: "2026-06-29T14:00:00Z",
      reason: "Courier integration work overlapped the GDP audit window on the same afternoon.",
      quorumRequiredVoteCount: 2,
      escrowedSlices: 900,
      votes: [
        {
          id: "med-vote-1a",
          memberId: "ingrid-sorensen",
          choice: "reduce_allocation",
          castAt: "2026-06-29T14:01:00Z",
          rationale: "Two claims, one afternoon.",
        },
        {
          id: "med-vote-1b",
          memberId: "elise-moreau",
          choice: "uphold_allocation",
          castAt: "2026-06-29T17:20:00Z",
          rationale: "The audit was async; Jonas was on the courier API the whole time.",
        },
        {
          id: "med-vote-1c",
          memberId: "jonas-weber",
          choice: "abstain",
          castAt: "2026-06-29T17:45:00Z",
          rationale: "My own allocation — abstaining.",
        },
      ],
      status: "resolved",
      resolutionNote: "Allocation upheld. 900 escrowed slices released before the pie was baked.",
      resolvedAt: "2026-06-30T08:00:00Z",
    },
  ],
  verificationOverrideRequests: [
    {
      id: "med-override-1",
      claimVerificationRunId: "med-verify-jul-5",
      requestedByMemberId: "ingrid-sorensen",
      requestedAt: "2026-07-05T16:00:00Z",
      memberStatement: "Hospital procurement meetings are held on site with no digital artefacts.",
      status: "reviewed",
      reviewerName: "Elise Moreau",
      reviewedAt: "2026-07-06T07:40:00Z",
      decision: "override_to_verified",
      reviewerRationale:
        "Visitor badges and the procurement officer's email confirm the meeting. Flag overridden.",
    },
  ],
  integrationConnections: [
    {
      providerKey: "github",
      status: "connected",
      connectedByMemberId: "jonas-weber",
      connectedAt: "2025-07-25T08:00:00Z",
      revokedAt: null,
      lastSyncedAt: "2026-07-26T05:30:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.github,
      grantedScopeKeys: ["repo:commits", "repo:pulls", "repo:issues"],
      dataRetentionDays: 730,
      evidenceContributionNote: "Courier-integration commits ground every engineering claim.",
    },
    {
      providerKey: "jira",
      status: "connected",
      connectedByMemberId: "elise-moreau",
      connectedAt: "2025-09-05T09:00:00Z",
      revokedAt: null,
      lastSyncedAt: "2026-07-25T21:00:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.jira,
      grantedScopeKeys: ["read:issue"],
      dataRetentionDays: 730,
      evidenceContributionNote: "GDP-audit tickets ground compliance claims.",
    },
    {
      providerKey: "google_drive",
      status: "revoked",
      connectedByMemberId: "ingrid-sorensen",
      connectedAt: "2025-10-08T10:00:00Z",
      revokedAt: "2026-07-01T09:15:00Z",
      lastSyncedAt: "2026-07-01T09:00:00Z",
      scopes: INTEGRATION_SCOPES_BY_PROVIDER.google_drive,
      grantedScopeKeys: [],
      dataRetentionDays: 730,
      evidenceContributionNote:
        "Revoked by Ingrid after the pie was baked — no further slices depend on it.",
    },
  ],
  rateLockProposals: [
    {
      id: "med-rate-elise",
      memberId: "elise-moreau",
      proposedRateInCentsPerHour: 7500,
      currency: "EUR",
      status: "locked",
      proposedByName: "Elise Moreau",
      proposedAt: "2025-06-10T08:00:00Z",
      benchmarkSourceLabel: "Medtech founder-CEO · EU · 2026 band",
      benchmarkLowInCentsPerHour: 6000,
      benchmarkHighInCentsPerHour: 9500,
      reviewerName: "Jonas Weber",
      reviewedAt: "2025-09-02T16:50:00Z",
      lockedAt: "2025-09-02T16:52:00Z",
      supersededByProposalId: null,
    },
    {
      id: "med-rate-jonas",
      memberId: "jonas-weber",
      proposedRateInCentsPerHour: 3000,
      currency: "EUR",
      status: "locked",
      proposedByName: "Elise Moreau",
      proposedAt: "2025-07-22T09:00:00Z",
      benchmarkSourceLabel: "Head of engineering · EU · 2026 band",
      benchmarkLowInCentsPerHour: 2600,
      benchmarkHighInCentsPerHour: 4200,
      reviewerName: "Ingrid Sørensen",
      reviewedAt: "2025-10-06T10:10:00Z",
      lockedAt: "2025-10-06T10:11:00Z",
      supersededByProposalId: null,
    },
    {
      id: "med-rate-ingrid",
      memberId: "ingrid-sorensen",
      proposedRateInCentsPerHour: 3000,
      currency: "EUR",
      status: "locked",
      proposedByName: "Elise Moreau",
      proposedAt: "2025-10-05T09:40:00Z",
      benchmarkSourceLabel: "Commercial director · EU · 2026 band",
      benchmarkLowInCentsPerHour: 2500,
      benchmarkHighInCentsPerHour: 4000,
      reviewerName: "Jonas Weber",
      reviewedAt: "2025-10-06T10:00:00Z",
      lockedAt: "2025-10-06T10:02:00Z",
      supersededByProposalId: null,
    },
  ],
  pieBakeReadiness: {
    triggerEventLabel: "Cash-flow breakeven (reached Jun 30, 2026)",
    checklistItems: [
      {
        key: "breakeven",
        displayLabel: "Cash-flow breakeven reached",
        detailNote: "Three trailing months covered from courier contracts.",
        status: "met",
      },
      {
        key: "rates-locked",
        displayLabel: "Every member's rate is locked",
        detailNote: "All three rates locked before the bake.",
        status: "met",
      },
      {
        key: "disputes-closed",
        displayLabel: "No open dispute cases",
        detailNote: "The Jun 29 case resolved a day before the bake.",
        status: "met",
      },
      {
        key: "claims-verified",
        displayLabel: "No claims awaiting human review",
        detailNote: "Every override request has a decision.",
        status: "met",
      },
      {
        key: "agreements-accepted",
        displayLabel: "Every compensation agreement accepted",
        detailNote: "All three accepted.",
        status: "met",
      },
    ],
    frozenCapTableRows: [
      { memberId: "elise-moreau", totalSlices: 102000, equityBasisPoints: 5100 },
      { memberId: "jonas-weber", totalSlices: 24000, equityBasisPoints: 1200 },
      { memberId: "ingrid-sorensen", totalSlices: 18000, equityBasisPoints: 900 },
    ],
    reservedSlices: 56000,
    totalSlicesInPool: 200000,
  },
  chainVerification: {
    headEntryHash: MED_AUDIT_4_HASH,
    entryCount: 4,
    inputs: [
      {
        auditEntryId: "med-audit-4",
        entryHash: MED_AUDIT_4_HASH,
        previousEntryHash: MED_AUDIT_3_HASH,
        canonicalPayload:
          '{"actionLabel":"Baked the pie","actorName":"Elise Moreau","eventKind":"decision","occurredAt":"2026-06-30T16:00:00Z","targetLabel":"Cap table frozen at 200,000 slices"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "med-audit-3",
        entryHash: MED_AUDIT_3_HASH,
        previousEntryHash: MED_AUDIT_2_HASH,
        canonicalPayload:
          '{"actionLabel":"Recorded milestone payout","actorName":"Elise Moreau","eventKind":"payment","occurredAt":"2026-06-28T10:00:00Z","targetLabel":"GDP audit"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "med-audit-2",
        entryHash: MED_AUDIT_2_HASH,
        previousEntryHash: MED_AUDIT_1_HASH,
        canonicalPayload:
          '{"actionLabel":"Assigned courier integration","actorName":"Elise Moreau","eventKind":"task-assignment","occurredAt":"2026-06-20T09:00:00Z","targetLabel":"Jonas Weber"}',
        hashAlgorithmLabel: "SHA-256",
      },
      {
        auditEntryId: "med-audit-1",
        entryHash: MED_AUDIT_1_HASH,
        previousEntryHash: "genesis",
        canonicalPayload:
          '{"actionLabel":"Closed Series A","actorName":"Elise Moreau","eventKind":"decision","occurredAt":"2026-06-10T08:00:00Z","targetLabel":"€4.2M"}',
        hashAlgorithmLabel: "SHA-256",
      },
    ],
  },
};
