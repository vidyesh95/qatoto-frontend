import { z } from "zod";

// `GET /research-projects/:projectSlug/…` — the §9 Proof-of-Effort surface: the slice
// ledger, the cap table, the verification pipeline, allocation proposals and their
// disputes, physical receipts, integration consent, optimization suggestions, the audit
// chain and the pie bake.
//
// Shapes mirror the backend service views — `slice-ledger.service.ts`,
// `equity-snapshot.service.ts`, `effort-claims.service.ts`, `slice-allocation.service.ts`,
// `dispute.service.ts`, `physical-receipts.service.ts`, `integration-consent.service.ts`,
// `optimization-suggestions.service.ts`, `project-audit.service.ts`, `pie-bake.service.ts`,
// `fair-market-rate.service.ts` — and the enums are transcribed from `src/db/schema.ts`,
// never from a doc.
//
// TWO RULES GOVERN EVERY SHAPE BELOW.
//
// 1. MONEY AND SLICE NUMERATORS ARE DECIMAL STRINGS, not numbers. `bigint` cent values and
//    exact slice rationals lose precision the moment `JSON.stringify` touches them past
//    2^53, and `z.number()` would additionally accept `120.5` for a whole-cent field.
//    Parse with `BigInt` through `formatMoneyFromCents`, never with `Number`.
// 2. NULL IS NOT ZERO. `groundedMinutes`, `opportunityScorePoints`, `confidenceBps`,
//    `valuationCents` and friends are null until something computed them. Zero is a
//    finding; null is the absence of one, and on a Slicing Pie surface publishing the
//    first as the second is publishing a fabricated equity fact.

// --- Shared §9 enums, transcribed from the shipped pgEnums --------------------

/**
 * The ONE shared verification enum (`effort_verification_status`), used by the claim,
 * by each verification run's verdict, and by `daily_log.effortVerificationStatus`.
 *
 * SIX VALUES, NOT A BOOLEAN. The pre-wire frontend type was `isEffortVerified: boolean`,
 * which cannot express `flagged_for_review` — the state where a step flagged, the
 * allocation is withheld, and a human has to look. Collapsing that to `false` reports a
 * claim awaiting review as a claim that failed.
 */
export const EFFORT_VERIFICATION_STATUSES = [
  "not_run",
  "queued",
  "running",
  "verified",
  "flagged_for_review",
  "unverified",
] as const;
export const EffortVerificationStatusSchema = z.enum(EFFORT_VERIFICATION_STATUSES);
export type EffortVerificationStatus = z.infer<typeof EffortVerificationStatusSchema>;

export const VERIFICATION_STEP_KINDS = [
  "claim_extraction",
  "artifact_grounding",
  "substance_analysis",
  "temporal_analysis",
] as const;
export const VerificationStepKindSchema = z.enum(VERIFICATION_STEP_KINDS);
export type VerificationStepKind = z.infer<typeof VerificationStepKindSchema>;

/**
 * FIVE values. `skipped` is not a failure and must not render as one: when
 * `artifact_grounding` flags without a connected provider, substance and temporal
 * analysis skip deliberately so review has ONE gate rather than three.
 */
export const VERIFICATION_STEP_STATUSES = [
  "pending",
  "passed",
  "flagged",
  "failed",
  "skipped",
] as const;
export const VerificationStepStatusSchema = z.enum(VERIFICATION_STEP_STATUSES);
export type VerificationStepStatus = z.infer<typeof VerificationStepStatusSchema>;

export const EFFORT_CLAIM_SOURCE_KINDS = ["daily_log", "physical_receipt"] as const;
export const EffortClaimSourceKindSchema = z.enum(EFFORT_CLAIM_SOURCE_KINDS);
export type EffortClaimSourceKind = z.infer<typeof EffortClaimSourceKindSchema>;

export const SLICE_CONTRIBUTION_KINDS = ["time", "cash"] as const;
export const SliceContributionKindSchema = z.enum(SLICE_CONTRIBUTION_KINDS);
export type SliceContributionKind = z.infer<typeof SliceContributionKindSchema>;

/**
 * `award` and `reversal` — and there is no third. A correction in this domain is a
 * REVERSING ENTRY, because the ledger is append-only and enforced four ways: revoked
 * grants, triggers, service discipline and the hash chain.
 */
export const SLICE_LEDGER_ENTRY_KINDS = ["award", "reversal"] as const;
export const SliceLedgerEntryKindSchema = z.enum(SLICE_LEDGER_ENTRY_KINDS);
export type SliceLedgerEntryKind = z.infer<typeof SliceLedgerEntryKindSchema>;

export const FAIR_MARKET_RATE_STATUSES = ["proposed", "accepted", "locked"] as const;
export const FairMarketRateStatusSchema = z.enum(FAIR_MARKET_RATE_STATUSES);
export type FairMarketRateStatus = z.infer<typeof FairMarketRateStatusSchema>;

// --- Fair market rate ---------------------------------------------------------

/**
 * One effective-dated rate row. The full history IS the transparency promise, so the
 * read returns every row rather than only the live one.
 *
 * `unpaidRateCentsPerHour` is computed on read and returned so no client has to do the
 * subtraction and get it backwards — it is what the ledger actually prices. There is no
 * column behind it.
 *
 * THE LIFECYCLE IS THREE STEPS AND ALL THREE MATTER: the founder proposes, THE MEMBER
 * ACCEPTS, and only then can it be locked. Without the accept step the founder both sets
 * and ratifies the number, which is founder fiat wearing a process.
 */
export const FairMarketRateSchema = z
  .object({
    id: z.string(),
    memberId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    fairMarketRateCentsPerHour: z.string(),
    paidCashRateCentsPerHour: z.string(),
    unpaidRateCentsPerHour: z.string(),
    currencyCode: z.string(),
    status: FairMarketRateStatusSchema,
    effectiveFrom: z.string(),
    rationaleNote: z.string(),
    proposedByUserId: z.string(),
    acceptedAt: z.string().nullable(),
    /** Trigger-frozen after this instant. A rate that moved would re-price every logged hour. */
    lockedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type FairMarketRate = z.infer<typeof FairMarketRateSchema>;

// --- Equity (the cap table) ---------------------------------------------------

export const EquityShareSchema = z
  .object({
    memberId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    slices: z.string(),
    equityBasisPoints: z.number(),
  })
  .strip();
export type EquityShare = z.infer<typeof EquityShareSchema>;

/**
 * One nightly cap-table snapshot.
 *
 * THE RESPONSE INVARIANT IS ASSERTED SERVER-SIDE: shares sum to exactly `10000` basis
 * points UNLESS `isDegenerate`. A degenerate snapshot is a project where nobody has
 * contributed yet — every share is 0 and they do NOT sum to 10000 — so a UI that
 * normalizes or fills the remainder would invent a cap table for a project that has none.
 *
 * `isBaked` freezes it forever: after the bake, dynamic recalculation stops and the
 * nightly job skips the project entirely.
 */
export const EquitySnapshotSchema = z
  .object({
    id: z.string(),
    asOf: z.string(),
    computedAt: z.string(),
    totalSlices: z.string(),
    memberCount: z.number(),
    apportionmentAlgorithm: z.string(),
    throughLedgerSequenceNumber: z.number(),
    isDegenerate: z.boolean(),
    isBaked: z.boolean(),
    shares: EquityShareSchema.array(),
  })
  .strip();
export type EquitySnapshot = z.infer<typeof EquitySnapshotSchema>;

/**
 * The ghost segment that REPLACES the reserve pool (§9.5).
 *
 * A reserve is a number a founder picks, diluting every real contributor by an amount
 * nobody earned. This is a projection instead: what an open role WOULD take if filled at
 * its own advertised band, computed from `basis` and explicitly OUTSIDE the denominator.
 * Nothing here may render as an allocation.
 */
export const OpenRoleProjectionSchema = z
  .object({
    openRoleId: z.string(),
    roleTitle: z.string(),
    projectedSlices: z.string(),
    projectedDilutionBasisPoints: z.number(),
    assumedRateCentsPerHour: z.string(),
    assumedMonthlyMinutes: z.number(),
    basis: z.string(),
  })
  .strip();
export type OpenRoleProjection = z.infer<typeof OpenRoleProjectionSchema>;

// --- The slice ledger ---------------------------------------------------------

/**
 * One append-only ledger row, ordered by `sequenceNumber` ASC — never by `createdAt`,
 * because two rows share a millisecond and replica clocks skew.
 *
 * `sliceNumerator` is the exact rational retained so an auditor can see where the half
 * slice went; `slicesAwarded` is the rounded integer. Show both or show the integer, but
 * never present the rounded one as exact.
 */
export const LedgerEntrySchema = z
  .object({
    id: z.string(),
    sequenceNumber: z.number(),
    memberId: z.string(),
    memberName: z.string(),
    entryKind: SliceLedgerEntryKindSchema,
    contributionKind: SliceContributionKindSchema,
    claimId: z.string().nullable(),
    sliceNumerator: z.string(),
    slicesAwarded: z.number(),
    effortMinutes: z.number().nullable(),
    cashInCents: z.string().nullable(),
    unpaidRateCentsPerHour: z.string().nullable(),
    occurredAt: z.string(),
  })
  .strip();
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// --- Effort claims ------------------------------------------------------------

/**
 * One row of the verification index.
 *
 * DELIBERATELY NARROWER THAN THE DETAIL VIEW. The detail fans out to runs, steps and
 * evidence — four queries per claim — which is right for one claim and catastrophic for a
 * page of twenty. The index answers who, when, how much and what the verdict was; opening
 * a row fetches the rest.
 */
export const ClaimSummarySchema = z
  .object({
    id: z.string(),
    memberId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    sourceKind: EffortClaimSourceKindSchema,
    claimedForDate: z.string(),
    claimSummary: z.string(),
    groundedMinutes: z.number().nullable(),
    groundedCashInCents: z.string().nullable(),
    overriddenMinutes: z.number().nullable(),
    verificationStatus: EffortVerificationStatusSchema,
    verdictReachedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type ClaimSummary = z.infer<typeof ClaimSummarySchema>;

/**
 * One step of one verification run.
 *
 * `overriddenStatus` REPLACES `status` for the verdict when present. It is the only
 * hand-edit in the whole domain, and it edits an AI JUDGEMENT rather than a number — the
 * formula then recomputes the minutes itself. Any UI that lets a human type a minute
 * count has reinvented founder fiat.
 */
export const VerificationStepSchema = z
  .object({
    id: z.string(),
    stepOrder: z.number(),
    stepKind: VerificationStepKindSchema,
    status: VerificationStepStatusSchema,
    overriddenStatus: VerificationStepStatusSchema.nullable(),
    findingSummary: z.string().nullable(),
    scoreBps: z.number().nullable(),
    modelName: z.string().nullable(),
    promptVersion: z.string().nullable(),
    confidenceBps: z.number().nullable(),
    reviewedByUserId: z.string().nullable(),
    overrideReason: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
  })
  .strip();
export type VerificationStep = z.infer<typeof VerificationStepSchema>;

export const ARTIFACT_SIGNATURE_STATUSES = ["valid", "invalid", "unsigned", "unknown"] as const;
export const ArtifactSignatureStatusSchema = z.enum(ARTIFACT_SIGNATURE_STATUSES);
export type ArtifactSignatureStatus = z.infer<typeof ArtifactSignatureStatusSchema>;

export const ARTIFACT_PROVIDERS = [
  "github",
  "gitlab",
  "figma",
  "jira",
  "linear",
  "notion",
  "google_docs",
  "daily_log_link",
  "workshop_link",
  "physical_receipt",
  "other",
] as const;
export const ArtifactProviderSchema = z.enum(ARTIFACT_PROVIDERS);
export type ArtifactProvider = z.infer<typeof ArtifactProviderSchema>;

/**
 * One piece of evidence behind a claim.
 *
 * `evidenceRetained` goes false once a consent revocation purged the payload: the PROOF
 * survives — the hash is still in the chain — but the copy does not. Render the
 * difference; "evidence deleted" and "evidence never existed" are different facts, and a
 * dispute raised against a purged claim resolves `409 EVIDENCE_PURGED`.
 */
export const ClaimEvidenceSchema = z
  .object({
    provider: ArtifactProviderSchema,
    externalId: z.string(),
    label: z.string(),
    externalUrl: z.string().nullable(),
    payloadSha256: z.string(),
    signatureStatus: ArtifactSignatureStatusSchema,
    artifactOccurredAt: z.string(),
    countsTowardSlices: z.boolean(),
    evidenceRetained: z.boolean(),
  })
  .strip();
export type ClaimEvidence = z.infer<typeof ClaimEvidenceSchema>;

export const ClaimVerificationRunSchema = z
  .object({
    id: z.string(),
    attemptNumber: z.number(),
    verdict: EffortVerificationStatusSchema,
    triggerReason: z.string().nullable(),
    scopedWindowStartsAt: z.string().nullable(),
    scopedWindowEndsAt: z.string().nullable(),
    startedAt: z.string(),
    completedAt: z.string().nullable(),
    steps: VerificationStepSchema.array(),
  })
  .strip();
export type ClaimVerificationRun = z.infer<typeof ClaimVerificationRunSchema>;

/**
 * One claim, with every run it has ever had.
 *
 * `runs` IS A LIST BECAUSE RE-VERIFICATION PRODUCES ATTEMPT 2, 3, … A UI that renders one
 * run shows a stale verdict the moment anyone asks for a re-check.
 *
 * `extractedMinutes` is what the member SAID and it pays nobody. `groundedMinutes` is what
 * the artifacts PROVE, and that — or its override — is what the ledger prices. Never label
 * the first as effort.
 */
export const ClaimDetailSchema = z
  .object({
    id: z.string(),
    memberId: z.string(),
    memberName: z.string(),
    sourceKind: EffortClaimSourceKindSchema,
    dailyLogId: z.string().nullable(),
    claimedForDate: z.string(),
    claimSummary: z.string(),
    extractedMinutes: z.number().nullable(),
    extractedCashInCents: z.string().nullable(),
    groundedMinutes: z.number().nullable(),
    groundedCashInCents: z.string().nullable(),
    overriddenMinutes: z.number().nullable(),
    overrideReason: z.string().nullable(),
    verificationStatus: EffortVerificationStatusSchema,
    verdictReachedAt: z.string().nullable(),
    fairMarketRateId: z.string().nullable(),
    runs: ClaimVerificationRunSchema.array(),
    evidence: ClaimEvidenceSchema.array(),
  })
  .strip();
export type ClaimDetail = z.infer<typeof ClaimDetailSchema>;

export interface ListClaimsFilter {
  readonly status?: EffortVerificationStatus;
  readonly memberUserId?: string;
  readonly page?: number;
  readonly limit?: number;
}

// --- Allocation proposals and disputes ----------------------------------------

export const ALLOCATION_PROPOSAL_STATUSES = [
  "open",
  "disputed",
  "locked",
  "consensus_reached",
] as const;
export const AllocationProposalStatusSchema = z.enum(ALLOCATION_PROPOSAL_STATUSES);
export type AllocationProposalStatus = z.infer<typeof AllocationProposalStatusSchema>;

/**
 * A proposed allocation inside its dispute window.
 *
 * NOTHING IS IN THE LEDGER WHILE THIS IS `open`. The slices are proposed, not awarded, and
 * a `disputed` proposal freezes them in escrow — reported separately from the snapshot's
 * totals rather than folded into them.
 *
 * `windowClosesAt` IS AN ISO INSTANT, never a countdown string. The client counts down, so
 * the number stays right when the tab has been open for an hour.
 */
export const AllocationProposalSchema = z
  .object({
    id: z.string(),
    claimId: z.string(),
    memberId: z.string(),
    memberName: z.string(),
    verdict: EffortVerificationStatusSchema,
    proposedSlices: z.number(),
    proposedSliceNumerator: z.string(),
    status: AllocationProposalStatusSchema,
    windowOpensAt: z.string(),
    windowClosesAt: z.string(),
    escrowedSlices: z.number(),
    activeDisputeId: z.string().nullable(),
    settledLedgerEntryId: z.string().nullable(),
    claimSummary: z.string(),
    claimedForDate: z.string(),
  })
  .strip();
export type AllocationProposal = z.infer<typeof AllocationProposalSchema>;

/**
 * `GET …/proof-of-effort` — the one read the page opens with.
 *
 * `equity` IS NULLABLE and null means "no snapshot exists yet", which is what a project
 * with no cap table looks like. Rendering 0% per member instead would be a made-up fact.
 *
 * Declared here rather than beside the other aggregate shapes because it composes
 * `AllocationProposalSchema`, and a `z.lazy` forward reference would erase the inferred
 * type to `any` — which is exactly the escape hatch CLAUDE.md Pattern 2 forbids.
 */
export const ProofOfEffortSummarySchema = z
  .object({
    equity: EquitySnapshotSchema.nullable(),
    openProposals: AllocationProposalSchema.array(),
    recentLedgerEntries: LedgerEntrySchema.array(),
    openRoleProjection: OpenRoleProjectionSchema.array(),
  })
  .strip();
export type ProofOfEffortSummary = z.infer<typeof ProofOfEffortSummarySchema>;

export const DISPUTE_STATUSES = ["open", "withdrawn", "consensus_reached"] as const;
export const DisputeStatusSchema = z.enum(DISPUTE_STATUSES);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

/**
 * THREE resolutions, and `voided` still writes a ledger entry — at zero slices. An
 * allocation that was disputed to nothing is a recorded decision, not a gap in the
 * sequence.
 *
 * `re_verified` answers **`202`**, not `200`: the number does not exist yet because a
 * scoped re-verification has to run. There is no `consensusAdjustedMinutes` field
 * anywhere and there must not be — a human-supplied number overruling the formula is
 * majority fiat wearing a quorum.
 */
export const DISPUTE_RESOLUTIONS = ["upheld", "voided", "re_verified"] as const;
export const DisputeResolutionSchema = z.enum(DISPUTE_RESOLUTIONS);
export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

export const DISPUTE_VOTE_POSITIONS = ["uphold", "void", "re_verify"] as const;
export const DisputeVotePositionSchema = z.enum(DISPUTE_VOTE_POSITIONS);
export type DisputeVotePosition = z.infer<typeof DisputeVotePositionSchema>;

export const DisputeVoteSchema = z
  .object({
    voterMemberId: z.string(),
    voterName: z.string(),
    position: DisputeVotePositionSchema,
    note: z.string().nullable(),
    castAt: z.string(),
  })
  .strip();
export type DisputeVote = z.infer<typeof DisputeVoteSchema>;

/**
 * One dispute with its votes.
 *
 * THE COMPLIANCE OBJECT. §14 and §7A.6 name this screen as the GDPR Art. 22
 * contestability path and the EU AI Act Art. 14 human-oversight control: it is where a
 * member contests an automated decision and where a human overrides one.
 *
 * `quorumMemberCount` is FROZEN AT RAISE TIME. Computing it live would let the roster
 * changing mid-dispute move the majority threshold under a vote already in progress —
 * someone joining could retroactively invalidate a consensus already reached. Render the
 * frozen number, never a recount of today's roster.
 *
 * `resolution` is nullable on the wire while the dispute is unresolved.
 */
export const DisputeSchema = z
  .object({
    id: z.string(),
    proposalId: z.string(),
    raisedByMemberId: z.string(),
    raisedByName: z.string(),
    disputeNote: z.string(),
    status: DisputeStatusSchema,
    quorumMemberCount: z.number(),
    resolution: DisputeResolutionSchema.nullable(),
    resolutionNote: z.string().nullable(),
    resolvedAt: z.string().nullable(),
    scopedWindowStartsAt: z.string().nullable(),
    scopedWindowEndsAt: z.string().nullable(),
    createdAt: z.string(),
    votes: DisputeVoteSchema.array(),
  })
  .strip();
export type Dispute = z.infer<typeof DisputeSchema>;

// --- Physical receipts --------------------------------------------------------

export const PHYSICAL_RECEIPT_KINDS = [
  "photo_of_work",
  "cad_file",
  "material_receipt",
  "other",
] as const;
export const PhysicalReceiptKindSchema = z.enum(PHYSICAL_RECEIPT_KINDS);
export type PhysicalReceiptKind = z.infer<typeof PhysicalReceiptKindSchema>;

export const RECEIPT_FORENSICS_CHECK_KINDS = [
  "exif_present",
  "capture_time_consistency",
  "device_fingerprint",
  "reverse_image_search",
] as const;
export const ReceiptForensicsCheckKindSchema = z.enum(RECEIPT_FORENSICS_CHECK_KINDS);
export type ReceiptForensicsCheckKind = z.infer<typeof ReceiptForensicsCheckKindSchema>;

/** FOUR results. `not_applicable` is not a pass and must not render as one. */
export const RECEIPT_FORENSICS_RESULTS = ["pass", "flag", "fail", "not_applicable"] as const;
export const ReceiptForensicsResultSchema = z.enum(RECEIPT_FORENSICS_RESULTS);
export type ReceiptForensicsResult = z.infer<typeof ReceiptForensicsResultSchema>;

export const ReceiptForensicsCheckSchema = z
  .object({
    checkKind: ReceiptForensicsCheckKindSchema,
    result: ReceiptForensicsResultSchema,
    findingSummary: z.string().nullable(),
  })
  .strip();
export type ReceiptForensicsCheck = z.infer<typeof ReceiptForensicsCheckSchema>;

/**
 * A photograph or file standing in for work with no digital receipt.
 *
 * EVERY MEASUREMENT HERE IS SERVER-TAKEN — size, content hash, perceptual hash, pixel
 * dimensions and the EXIF capture time. A physical claim derives its minutes from the
 * capture spans across its receipts, because a body carrying an hour count is exactly what
 * §0 forbids and a photograph has no transcript.
 */
export const PhysicalReceiptSchema = z
  .object({
    id: z.string(),
    receiptKind: PhysicalReceiptKindSchema,
    contentSha256: z.string(),
    perceptualHash: z.string(),
    storedImageUrl: z.string().nullable(),
    sizeBytes: z.number(),
    widthPixels: z.number().nullable(),
    heightPixels: z.number().nullable(),
    capturedAt: z.string().nullable(),
    claimId: z.string().nullable(),
    createdAt: z.string(),
    forensics: ReceiptForensicsCheckSchema.array(),
  })
  .strip();
export type PhysicalReceipt = z.infer<typeof PhysicalReceiptSchema>;

// --- Integration consent ------------------------------------------------------

export const INTEGRATION_PROVIDERS = ["github", "gitlab", "figma", "jira", "linear"] as const;
export const IntegrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const INTEGRATION_GRANT_STATUSES = ["pending", "active", "revoked", "expired"] as const;
export const IntegrationGrantStatusSchema = z.enum(INTEGRATION_GRANT_STATUSES);
export type IntegrationGrantStatus = z.infer<typeof IntegrationGrantStatusSchema>;

/**
 * One member's consent grant for one provider.
 *
 * THE TOKEN NEVER CROSSES THE WIRE — only `hasStoredToken`, its existence. A response
 * carrying the ciphertext would put an org-scoped token in every browser cache and proxy
 * log on the path.
 *
 * `pending` means an authorize-url was issued and the callback has not returned. It is a
 * half-finished connection, and showing it is better than showing nothing.
 *
 * WITHOUT A CONNECTED PROVIDER THE PIPELINE DEGRADES HONESTLY: `artifact_grounding`
 * resolves `flagged` rather than `passed` — real evidence withheld pending a human — and
 * the claim lands at `flagged_for_review` with zero slices. This screen is where a member
 * fixes that, which is why it is not optional chrome.
 */
export const IntegrationGrantSchema = z
  .object({
    id: z.string(),
    provider: IntegrationProviderSchema,
    status: IntegrationGrantStatusSchema,
    allowedResourceIds: z.string().array(),
    externalAccountLabel: z.string().nullable(),
    grantedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    revokedAt: z.string().nullable(),
    hasStoredToken: z.boolean(),
  })
  .strip();
export type IntegrationGrant = z.infer<typeof IntegrationGrantSchema>;

export const AuthorizeUrlSchema = z
  .object({
    provider: IntegrationProviderSchema,
    authorizeUrl: z.string(),
    expiresInSeconds: z.number(),
  })
  .strip();
export type AuthorizeUrl = z.infer<typeof AuthorizeUrlSchema>;

// --- Optimization suggestions -------------------------------------------------

export const OPTIMIZATION_SUGGESTION_STATUSES = ["open", "accepted", "dismissed"] as const;
export const OptimizationSuggestionStatusSchema = z.enum(OPTIMIZATION_SUGGESTION_STATUSES);
export type OptimizationSuggestionStatus = z.infer<typeof OptimizationSuggestionStatusSchema>;

/**
 * An advisory suggestion, with the model that produced it named on the row.
 *
 * `modelName`, `promptVersion` and `confidenceBps` are shown because a suggestion whose
 * provenance is hidden reads as a platform ruling. `confidenceBps` is nullable and null is
 * not zero confidence — it is no recorded confidence.
 */
export const OptimizationSuggestionSchema = z
  .object({
    id: z.string(),
    memberId: z.string().nullable(),
    title: z.string(),
    bodyText: z.string(),
    status: OptimizationSuggestionStatusSchema,
    modelName: z.string(),
    modelVersion: z.string().nullable(),
    promptVersion: z.string(),
    confidenceBps: z.number().nullable(),
    asOf: z.string(),
    decidedByUserId: z.string().nullable(),
    decidedAt: z.string().nullable(),
    decisionNote: z.string().nullable(),
    createdAt: z.string(),
    evidence: z
      .object({
        sequenceNumber: z.number(),
        label: z.string(),
        relatedClaimId: z.string().nullable(),
      })
      .strip()
      .array(),
  })
  .strip();
export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>;

// --- Audit trail and the hash chain -------------------------------------------

/**
 * One entry of the append-only chain.
 *
 * TWO NAMES, AND THE DIFFERENCE IS THE POINT. `actorNameSnapshot` is the pseudonym that is
 * INSIDE the hash and can never change without breaking the chain. `actorDisplayName` is
 * joined live from `user` for rendering, is deliberately not hashed and not stored, and
 * stays editable when someone changes their name or exercises erasure. Show the display
 * name; verify against the snapshot.
 *
 * `entryHash` is the full 64 hex characters, always. The short form a UI shows is a
 * rendering — never key a list, a cache entry or an equality test on it.
 */
export const AuditEntrySchema = z
  .object({
    id: z.string(),
    sequenceNumber: z.number(),
    eventKind: z.string(),
    actorNameSnapshot: z.string(),
    actorRoleSnapshot: z.string(),
    actorDisplayName: z.string().nullable(),
    actionLabel: z.string(),
    targetLabel: z.string(),
    detailNote: z.string(),
    payloadJson: z.string(),
    occurredAt: z.string(),
    previousEntryHash: z.string().nullable(),
    entryHash: z.string(),
    hashAlgorithmVersion: z.string(),
  })
  .strip();
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/**
 * The verifier's summary.
 *
 * A BREAK IS A `409 CHAIN_BROKEN`, NEVER A `200 { valid: false }`. That is the backend's
 * rule and it shapes this type: there is no `isValid` field to render, because a chain
 * that verified is the only chain this schema ever parses. A broken chain arrives as an
 * error and must be surfaced as an operational emergency, not as a checkbox.
 */
export const ChainVerificationSchema = z
  .object({
    entriesChecked: z.number(),
    firstSequence: z.number().nullable(),
    lastSequence: z.number().nullable(),
    headEntryHash: z.string().nullable(),
    lastAnchoredAt: z.string().nullable(),
  })
  .strip();
export type ChainVerification = z.infer<typeof ChainVerificationSchema>;

/**
 * The anti-theatre endpoint: the exact RFC 8785 bytes that were hashed.
 *
 * Five lines of `crypto.subtle` reproduce `entryHash` from `canonicalBytes`, which is the
 * whole point — a server that grades its own homework proves nothing.
 */
export const HashInputSchema = z
  .object({
    entryId: z.string(),
    sequenceNumber: z.number(),
    canonicalBytes: z.string(),
    entryHash: z.string(),
    hashAlgorithmVersion: z.string(),
  })
  .strip();
export type HashInput = z.infer<typeof HashInputSchema>;

// --- The pie bake -------------------------------------------------------------

export const PIE_BAKE_TRIGGERS = ["cash_flow_breakeven", "priced_round"] as const;
export const PieBakeTriggerSchema = z.enum(PIE_BAKE_TRIGGERS);
export type PieBakeTrigger = z.infer<typeof PieBakeTriggerSchema>;

/**
 * The frozen cap table. Irreversible, once per project, ever.
 *
 * THERE IS NO UNBAKE ENDPOINT AND THERE WILL NOT BE ONE — recovery is a manual, audited,
 * out-of-band operation. `pie_bake_event` is unique per project. Any UI offering to undo
 * this is offering something that does not exist.
 *
 * `GET …/pie-bake` answers 404 before the bake, which is an ABSENCE and not an error: a
 * project with a dynamic pie has no frozen one.
 */
export const PieBakeSchema = z
  .object({
    bakeEventId: z.string(),
    trigger: PieBakeTriggerSchema,
    valuationCents: z.string().nullable(),
    bakedAt: z.string(),
    snapshot: EquitySnapshotSchema,
  })
  .strip();
export type PieBake = z.infer<typeof PieBakeSchema>;
