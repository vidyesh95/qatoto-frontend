// Human-oversight and consent layer over Proof of Effort (R_AND_D_STRUCTURE.md
// §14.1, §14.2, §14.4, §14.6). Data truth lives in the Express backend; these
// shapes are the client-side contract only. UI-building phase: consumed from
// static mocks in `src/mocks/research-and-development-oversight-mocks.ts`, no
// fetch layer yet.
//
// Why these exist as first-class shapes rather than decoration: a dispute that
// can be raised, voted on and overridden is the contestability path an
// automated slice decision legally owes a worker, and an integration the member
// can inspect, scope and revoke is the lawful basis for monitoring their work
// at all. A backend that offers human intervention through an endpoint no
// screen calls does not, in practice, offer it.
//
// Values follow the §11 wire format: integer cents / basis points / minutes,
// ISO-8601 instants (`…At`), date-only calendar days (`…Date`). Slices are
// plain integers — they are a unit of the pie, never money.

// ---------- Disputes, votes, overrides (§14.1) ----------

export type DisputeVoteChoice = "uphold_allocation" | "reduce_allocation" | "abstain";

export type DisputeVote = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  choice: DisputeVoteChoice;
  castAt: string;
  // Why they voted that way — shown inline so a vote is never anonymous math.
  rationale: string;
};

export type DisputeCaseStatus = "collecting_votes" | "quorum_reached" | "resolved";

// A raised objection to a proposed slice allocation, and the team's vote on it.
export type DisputeCase = {
  id: string;
  // Resolves against a DisputeWindowEntry on the same project's ledger.
  disputeWindowEntryId: string;
  raisedByMemberId: string;
  raisedAt: string;
  reason: string;
  // Votes needed before the case can resolve.
  quorumRequiredVoteCount: number;
  // Slices frozen *outside* totalSlices while the case runs. Named for the
  // shipped backend column — it is a pool of slices, never money, and Qatoto
  // holds no funds anywhere in this domain.
  escrowedSlices: number;
  votes: DisputeVote[];
  status: DisputeCaseStatus;
  // Set once resolved, e.g. re-verified at a different hour count.
  resolutionNote: string | null;
  resolvedAt: string | null;
};

export type VerificationOverrideDecision =
  | "uphold_flag"
  | "override_to_verified"
  | "override_to_unverified";

export type VerificationOverrideStatus = "awaiting_review" | "reviewed";

// A member's request that a human re-examine an automated verification verdict,
// and the maintainer's decision. The reviewer must be a different person than
// the member who raised it.
export type VerificationOverrideRequest = {
  id: string;
  // Resolves against a ClaimVerificationRun on the same project's ledger.
  claimVerificationRunId: string;
  requestedByMemberId: string;
  requestedAt: string;
  memberStatement: string;
  status: VerificationOverrideStatus;
  reviewerName: string | null;
  reviewedAt: string | null;
  decision: VerificationOverrideDecision | null;
  reviewerRationale: string | null;
};

// ---------- Integration consent (§14.2) ----------

export type IntegrationProviderKey =
  | "github"
  | "gitlab"
  | "jira"
  | "linear"
  | "figma"
  | "google_drive";

export type IntegrationConnectionStatus = "connected" | "not_connected" | "revoked" | "expired";

// One permission the provider grants, stated in plain language alongside what
// Qatoto uses it for — a scope with no stated purpose is not informed consent.
export type IntegrationScope = {
  key: string;
  displayLabel: string;
  purposeNote: string;
  // Required scopes cannot be unticked without declining the connection.
  isRequired: boolean;
};

export type IntegrationConnection = {
  providerKey: IntegrationProviderKey;
  status: IntegrationConnectionStatus;
  // Null when never connected.
  connectedByMemberId: string | null;
  connectedAt: string | null;
  revokedAt: string | null;
  lastSyncedAt: string | null;
  scopes: IntegrationScope[];
  // Keys of the scopes actually granted — a subset of scopes[].key.
  grantedScopeKeys: string[];
  // How long Qatoto keeps the receipts this integration produces.
  dataRetentionDays: number;
  // What this connection contributes to a verification run, in one line.
  evidenceContributionNote: string;
};

// ---------- Rate lock (§14.4) ----------

export type RateLockStatus = "proposed" | "under_review" | "locked" | "superseded";

// The fair market rate a member's time slices are multiplied by — the
// foundation of every number on the Proof of Effort page, so it is proposed,
// reviewed and locked rather than typed in.
export type RateLockProposal = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  proposedRateInCentsPerHour: number;
  // ISO 4217, e.g. "USD".
  currency: string;
  status: RateLockStatus;
  proposedByName: string;
  proposedAt: string;
  // Where the benchmark band came from, e.g. "Levels.fyi 2026 · Nairobi".
  benchmarkSourceLabel: string;
  benchmarkLowInCentsPerHour: number;
  benchmarkHighInCentsPerHour: number;
  reviewerName: string | null;
  reviewedAt: string | null;
  lockedAt: string | null;
  // Set on a superseded proposal, pointing at the one that replaced it.
  supersededByProposalId: string | null;
};

// ---------- Pie bake (§14.6) ----------

export type PieBakeChecklistItemStatus = "met" | "not_met" | "waived";

export type PieBakeChecklistItem = {
  key: string;
  displayLabel: string;
  detailNote: string;
  status: PieBakeChecklistItemStatus;
};

// One member's frozen row in the cap table a bake would produce.
export type FrozenCapTableRow = {
  // Resolves against the owning project's teamMembers.
  memberId: string;
  totalSlices: number;
  equityBasisPoints: number;
};

// Everything needed to answer "can this pie be baked, and what would it
// freeze?" — baking converts the dynamic pie into fixed percentages forever.
export type PieBakeReadiness = {
  // The event that triggers a bake, e.g. "Cash-flow breakeven".
  triggerEventLabel: string;
  checklistItems: PieBakeChecklistItem[];
  // Preview only — the bake is not performed in the UI-building phase.
  frozenCapTableRows: FrozenCapTableRow[];
  reservedSlices: number;
  totalSlicesInPool: number;
};

// ---------- Chain verification (§14.6) ----------

// The exact inputs one audit entry's hash was computed over, so a reader can
// recompute it instead of trusting the chip. Without this the hash-chain
// framing is decoration.
export type ChainVerificationInput = {
  // Resolves against a ProjectAuditEntry on the same project's ledger.
  auditEntryId: string;
  // 64 lowercase hex chars. Render a short form; never key or compare on it.
  entryHash: string;
  previousEntryHash: string;
  // The canonical serialization that was hashed, byte for byte.
  canonicalPayload: string;
  hashAlgorithmLabel: string;
};

export type ProjectChainVerification = {
  headEntryHash: string;
  entryCount: number;
  // Newest first, matching the audit trail order.
  inputs: ChainVerificationInput[];
};

// A project's whole oversight surface. Every id resolves against the matching
// ResearchProject and ProjectProofOfEffortLedger.
export type ProjectOversight = {
  // Matches ResearchProject.id.
  projectId: string;
  disputeCases: DisputeCase[];
  verificationOverrideRequests: VerificationOverrideRequest[];
  integrationConnections: IntegrationConnection[];
  rateLockProposals: RateLockProposal[];
  pieBakeReadiness: PieBakeReadiness;
  chainVerification: ProjectChainVerification;
};
