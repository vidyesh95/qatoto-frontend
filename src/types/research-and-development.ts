// Shared domain types for the Research & Development surface (concept-to-consumer
// pipeline). Data truth lives in the Express backend; these shapes are the
// client-side contract only. UI-building phase: consumed from static mocks in
// `src/lib/research-and-development-mocks.ts`, no fetch layer yet.

export type ProjectStage =
  | "market-research"
  | "problem-validation"
  | "team-building"
  | "building-mvp"
  | "raising-funding"
  | "go-to-market";

export type RoleCommitment = "full-time" | "part-time" | "hobby";

export type AiSummaryChipKind = "blocker" | "progress" | "velocity" | "suggestion";

export type AiSummaryChip = {
  kind: AiSummaryChipKind;
  label: string;
};

export type MilestoneStatus = "done" | "current" | "upcoming";

export type FundingRoundType = "equity" | "crowdfunding" | "venture";

export type FundingRoundStatus = "open" | "closed";

export type EscrowDirection = "in" | "out";

export type EscrowVerificationStatus = "verified" | "pending";

export type TrendDirection = "up" | "down" | "flat";

// Percent offsets into the static world-map canvas (drive CSS `left`/`top`).
export type MapPosition = {
  leftPercent: number;
  topPercent: number;
};

export type TeamMember = {
  id: string;
  name: string;
  avatarImageSrc: string;
  role: string;
  skills: string[];
  // Display-formatted, e.g. "4.5%". The backend owns equity math later.
  equityShare: string;
  effortHoursLogged: number;
  joinedDate: string;
  isFounder?: boolean;
};

export type OpenRole = {
  id: string;
  projectId: string;
  projectName: string;
  roleTitle: string;
  skills: string[];
  // Display-formatted, e.g. "2–4%".
  equityRange: string;
  commitment: RoleCommitment;
};

export type DailyLog = {
  id: string;
  authorId: string;
  date: string;
  videoThumbnailSrc: string;
  transcriptExcerpt: string;
  detail: string;
  aiSummaryChips: AiSummaryChip[];
  isEffortVerified: boolean;
};

export type MilestoneVarianceStatus = "on-track" | "ahead" | "behind" | "at-risk";

// Structured expected-vs-actual metrics on a milestone (idea 2). Distinct from
// the PROOF_OF_EFFORT_SPEC.md §4 fraud/time-theft anomaly work: this tracks
// whether real output is on-pace and on-quality, not whether an effort claim
// was faked. Display-only mock strings — variance math is backend-owned later.
export type MilestoneVariance = {
  expectedQuantityLabel: string; // e.g. "200 units"
  actualQuantityLabel: string; // e.g. "148 units"
  qualityMetricLabel: string; // e.g. "4.2 / 5 QA"
  varianceLabel: string; // signed, e.g. "26% behind" | "On pace" | "3 days early"
  varianceStatus: MilestoneVarianceStatus;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: MilestoneStatus;
  // Display-formatted, e.g. "$12,000". Escrow release is backend-owned later.
  escrowReleaseAmount?: string;
  // Set on milestones tracked with structured production metrics.
  variance?: MilestoneVariance;
};

export type FundingRound = {
  id: string;
  type: FundingRoundType;
  goalAmount: string;
  raisedAmount: string;
  // 0–100, drives progress-bar width.
  percentageFunded: number;
  backersCount: number;
  closesOnDate: string;
  status: FundingRoundStatus;
};

export type EscrowLedgerEntry = {
  id: string;
  date: string;
  description: string;
  direction: EscrowDirection;
  amount: string;
  linkedMilestoneId?: string;
  verificationStatus: EscrowVerificationStatus;
};

export type ProblemReport = {
  id: string;
  title: string;
  category: string;
  locationLabel: string;
  countryCode: string;
  mapPosition: MapPosition;
  reportCount: number;
  // 0–100, sizes/colors map pins.
  opportunityScore: number;
  description: string;
  reportedDate: string;
};

export type MarketInsight = {
  id: string;
  headline: string;
  statValue: string;
  trendDirection: TrendDirection;
  region: string;
  category: string;
  sourceNote: string;
};

// One row of the knowledge-hub demand leaderboard.
export type TrendingSignal = {
  id: string;
  rank: number;
  category: string;
  region: string;
  demandScore: number;
  trendDirection: TrendDirection;
  relatedProjectsCount: number;
};

export type TalentAvailability = "open-to-work" | "open-to-offers" | "unavailable";

// One person on the /talent equity-for-skills marketplace.
export type TalentProfile = {
  id: string;
  name: string;
  avatarImageSrc: string;
  headlineRole: string;
  skills: string[];
  // Display-formatted, e.g. "2–4%".
  equityAsk: string;
  commitment: RoleCommitment;
  locationLabel: string;
  availability: TalentAvailability;
  projectsCompletedCount: number;
  effortHoursLogged: number;
};

export type WorkshopTaskPriority = "high" | "medium" | "low";

export type WorkshopTask = {
  id: string;
  title: string;
  // Resolves against the owning project's teamMembers.
  assigneeMemberId: string;
  priority: WorkshopTaskPriority;
  labels: string[];
  dueDateLabel?: string;
};

export type WorkshopBoardColumn = {
  id: string;
  title: string;
  tasks: WorkshopTask[];
};

export type WorkshopFileKind = "document" | "spreadsheet" | "cad-model" | "image" | "video";

export type WorkshopFile = {
  id: string;
  fileName: string;
  fileKind: WorkshopFileKind;
  // Display-formatted, e.g. "2.4 MB".
  fileSizeLabel: string;
  uploadedByMemberId: string;
  uploadedDateLabel: string;
};

export type WorkshopChatMessage = {
  id: string;
  authorMemberId: string;
  // Display-formatted, e.g. "Jul 7, 9:42 AM".
  sentAtLabel: string;
  messageText: string;
};

// Static mock of a project's Virtual Workshop (boards, files, chat). All
// collaboration data is backend-owned later — the frontend only renders it.
export type ProjectWorkshop = {
  // Matches ResearchProject.id.
  projectId: string;
  boardColumns: WorkshopBoardColumn[];
  files: WorkshopFile[];
  chatMessages: WorkshopChatMessage[];
};

export type ResearchProject = {
  // Slug, used in the /research-and-development/project/[id] URL.
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  stage: ProjectStage;
  coverImageSrc: string;
  founderId: string;
  teamMembers: TeamMember[];
  openRoles: OpenRole[];
  milestones: Milestone[];
  dailyLogs: DailyLog[];
  fundingRounds: FundingRound[];
  escrowLedger: EscrowLedgerEntry[];
  watchersCount: number;
  dailyLogStreakDays: number;
  // Set when the project was born from a Civic Pulse problem report.
  originProblemReportId?: string;
  // MarketInsight ids shown as demand-evidence chips on the Overview tab.
  relatedInsightIds: string[];
};

// ---------- Project Immortal (moonshot open-research program) ----------
// Mock fixtures live in src/lib/project-immortal-mocks.ts.

export type ImmortalPaperCategory =
  | "longevity-biology"
  | "cellular-reprogramming"
  | "ai-drug-discovery"
  | "organ-regeneration"
  | "ethics-and-society";

export type ImmortalResearchPaper = {
  id: string;
  title: string;
  authorName: string;
  authorAffiliation: string;
  category: ImmortalPaperCategory;
  // Display-formatted, e.g. "2.4 MB".
  fileSizeLabel: string;
  // e.g. "Jun 28, 2026" — "Just now" for client-side additions.
  uploadedDateLabel: string;
  // Set on client-side additions; renders a "You" chip.
  isUploadedByViewer?: boolean;
};

// Informal track — blog-like research idea, no proofs or citations required.
export type ImmortalInformalPost = {
  id: string;
  title: string;
  authorName: string;
  authorAvatarSrc: string;
  postedAtLabel: string;
  bodyText: string;
  reactionCountLabel: string;
  replyCountLabel: string;
  isPostedByViewer?: boolean;
};

export type ImmortalIdeaReply = {
  id: string;
  authorName: string;
  authorAvatarSrc: string;
  postedAtLabel: string;
  replyText: string;
  likeCountLabel: string;
};

export type ImmortalIdea = {
  id: string;
  authorName: string;
  authorAvatarSrc: string;
  authorLocation: string;
  postedAtLabel: string;
  ideaText: string;
  likeCountLabel: string;
  replies: ImmortalIdeaReply[];
};

// "missing" = a research gap Qatoto highlights for contributors to pick up.
export type ImmortalBranchStatus = "active" | "emerging" | "contested" | "missing";

export type ImmortalBranchCanvasPosition = {
  leftPercent: number;
  topPercent: number;
};

// One node in the crowd-research flowchart; parentBranchId=null is the root.
// overlappingGroupCount marks how many teams work the same branch — Qatoto's
// research aggregation surfaces the overlap so groups can join forces.
export type ImmortalResearchBranch = {
  id: string;
  parentBranchId: string | null;
  title: string;
  summary: string;
  status: ImmortalBranchStatus;
  contributorCount: number;
  discussionCount: number;
  // >= 2 renders an overlap marker on the node and detail panel.
  overlappingGroupCount: number;
  // Hand-authored percent position on the flowchart canvas.
  canvasPosition: ImmortalBranchCanvasPosition;
  recentThreadTitles: string[];
};

// Monetizable product Qatoto highlights as derivable from a research branch.
export type ImmortalProductOpportunity = {
  id: string;
  productName: string;
  productDescription: string;
  derivedFromBranchTitle: string;
  // e.g. "$12B est. market".
  marketPotentialLabel: string;
  // e.g. "Monetizable in 2–4 yrs".
  readinessLabel: string;
};

export type ImmortalContributorRole =
  | "researcher"
  | "founder-director"
  | "venture-capitalist"
  | "supplier"
  | "supporter";

export type ImmortalCompensationPreference = "salary" | "one-time" | "equity";

// Qatoto tracks each contributor's effort and money applied to the project and
// distributes compensation per the contributor's stated preference.
export type ImmortalContributor = {
  id: string;
  name: string;
  avatarSrc: string;
  role: ImmortalContributorRole;
  // e.g. "312 hrs logged".
  effortLabel: string;
  // e.g. "$250K escrowed" | "Senolytics assay data".
  contributionLabel: string;
  compensationPreference: ImmortalCompensationPreference;
};

export type ImmortalProgramStat = {
  id: string;
  // Display-formatted, e.g. "2,847".
  statValue: string;
  statLabel: string;
};

// ---------- Proof of Effort (per-project compensation dashboard) ----------
// Static mock render of PROOF_OF_EFFORT_SPEC.md §3 (Slicing Pie math) and §4
// (verification pipeline, 24-hour dispute window, physical receipts). Every
// figure arrives as a pre-computed display string — the deterministic formula
// and the verification pipeline are backend-owned later. Mock fixtures live
// in src/lib/research-and-development-proof-of-effort-mocks.ts.

// "dynamic" = the pie recalculates as verified effort lands; "baked" = frozen
// at an exit event (cash-flow breakeven or a priced round).
export type PieStatus = "dynamic" | "baked";

// One member's Slicing Pie breakdown. Slice math is pre-computed as display
// strings; only sliceSharePercent (drives the stacked bar) is a number.
export type MemberSliceBreakdown = {
  // Resolves against the owning project's teamMembers.
  memberId: string;
  // Negotiated on team formation, locked into the ledger Day 1, e.g. "$120/hr".
  lockedFairMarketRateLabel: string;
  // e.g. "148 hrs".
  verifiedUnpaidHoursLabel: string;
  // Worked time-slice equation, e.g. "148 hrs × $120 × 2 = 35,520 slices".
  timeSliceEquationLabel: string;
  // Worked cash-slice equation, e.g. "$22,120 × 4 = 88,480 slices" — omitted
  // when the member has contributed no cash.
  cashSliceEquationLabel?: string;
  // e.g. "124,000 slices".
  totalSlicesLabel: string;
  // 0–100, drives this member's segment width on the stacked slice bar.
  sliceSharePercent: number;
  // Display-formatted live equity — matches TeamMember.equityShare, e.g. "62%".
  liveEquityShareLabel: string;
};

export type VerificationStepKind =
  | "claim-extraction"
  | "artifact-grounding"
  | "substance-analysis"
  | "temporal-analysis";

export type VerificationStepStatus = "passed" | "flagged" | "not-run";

// One stage of the four-step audit pipeline.
export type VerificationStep = {
  kind: VerificationStepKind;
  status: VerificationStepStatus;
  // One-line finding, e.g. "3 commits inside the claimed window; signatures
  // match the member key".
  findingSummary: string;
  // Digital-receipt chips, e.g. ["PR #142 merged", "QA-118 → Done"].
  evidenceLabels: string[];
};

export type VerificationVerdict = "verified" | "flagged-for-review" | "unverified-zero-slices";

// One daily-log claim run through the audit pipeline. The video is a claim;
// these steps are the mock render of Qatoto cross-referencing it.
export type ClaimVerificationRun = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  // Resolves against the owning project's dailyLogs when the log is still in
  // the feed; archived runs omit it.
  dailyLogId?: string;
  // e.g. "Jul 7, 2026".
  claimDateLabel: string;
  // The extracted claim under audit.
  claimSummary: string;
  // e.g. "6 hrs claimed".
  claimedHoursLabel: string;
  // Always the four kinds, in pipeline order.
  steps: VerificationStep[];
  verdict: VerificationVerdict;
  // Outcome line, e.g. "6 hrs verified → 720 slices pushed to the ledger".
  verdictDetail: string;
  // e.g. "720 slices" | "0 slices" | "960 slices withheld".
  slicesAwardedLabel: string;
};

export type DisputeWindowStatus = "open" | "disputed" | "consensus-reached" | "locked";

// Fields shared by every 24-hour-transparency-ledger entry.
type DisputeWindowEntryBase = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  // e.g. "Jul 7, 2026".
  allocationDateLabel: string;
  // What the proposed allocation is for, e.g. "3 hrs pilot-site prep".
  proposedAllocationSummary: string;
  // e.g. "360 slices".
  proposedSlicesLabel: string;
};

// Discriminated on status so each state carries exactly the fields it needs.
export type DisputeWindowEntry =
  | (DisputeWindowEntryBase & {
      status: "open";
      // e.g. "Locks in 9h 14m".
      timeRemainingToLockLabel: string;
    })
  | (DisputeWindowEntryBase & {
      status: "disputed";
      // Who raised it and why.
      disputeNote: string;
    })
  | (DisputeWindowEntryBase & {
      status: "consensus-reached";
      disputeNote: string;
      // e.g. "Re-verified at 6 hrs — adjusted to 840 slices".
      consensusOutcomeLabel: string;
    })
  | (DisputeWindowEntryBase & {
      status: "locked";
      // e.g. "Locked Jul 5, 2026".
      lockedOnLabel: string;
    });

export type PhysicalReceiptKind = "cad-file" | "photo" | "material-receipt";

export type ImageForensicsCheckKind =
  | "exif-metadata"
  | "device-fingerprint"
  | "reverse-image-search";

export type ImageForensicsCheckResult = "passed" | "flagged";

// One forensics verdict on an uploaded physical receipt. Only the checks
// applicable to the receipt kind appear (CAD files skip reverse-image search).
export type PhysicalReceiptForensicsCheck = {
  kind: ImageForensicsCheckKind;
  result: ImageForensicsCheckResult;
  // e.g. "EXIF timestamp Jul 6, 4:12 PM sits inside the claim window".
  findingSummary: string;
};

export type PhysicalReceiptVerdict = "accepted" | "under-review" | "rejected";

// Physical-proof upload for non-digital work — sanding a chassis leaves no
// commits, so it leaves a receipt instead.
export type PhysicalWorkReceipt = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  // Set when the receipt backs a daily log still in the feed.
  dailyLogId?: string;
  receiptKind: PhysicalReceiptKind;
  fileName: string;
  // e.g. "8.2 MB".
  fileSizeLabel: string;
  uploadedDateLabel: string;
  // The physical work this receipt evidences.
  claimSummary: string;
  forensicsChecks: PhysicalReceiptForensicsCheck[];
  verdict: PhysicalReceiptVerdict;
  // e.g. "Reverse-image search matched a commercial stock photo → 0 slices".
  verdictDetail: string;
};

// A project's full Proof of Effort ledger — Qatoto as the independent
// third-party ledger. Member/log ids resolve against the matching
// ResearchProject in research-and-development-mocks.ts.
export type ProjectProofOfEffortLedger = {
  // Matches ResearchProject.id.
  projectId: string;
  pieStatus: PieStatus;
  // Framing line under the status chip.
  pieStatusNote: string;
  // e.g. "200,000 slices".
  totalSlicesInPoolLabel: string;
  memberSliceBreakdowns: MemberSliceBreakdown[];
  // Slices the team agreement holds back for open roles — rendered as the
  // muted final bar segment, outside the dynamic pie. e.g. "39,000 slices".
  reservedSlicesLabel: string;
  // 0–100, drives the reserve segment width on the stacked slice bar.
  reservedSliceSharePercent: number;
  // e.g. "Reserved for the open Cooling Systems Engineer role".
  reservedSlicesNote: string;
  claimVerificationRuns: ClaimVerificationRun[];
  disputeWindowEntries: DisputeWindowEntry[];
  physicalWorkReceipts: PhysicalWorkReceipt[];
  optimizationSuggestions: OptimizationSuggestion[];
  auditTrailEntries: ProjectAuditEntry[];
};

// ---------- AI build-process optimization (idea 1) ----------
// Promotes the daily-log `suggestion` chip into a first-class project-level
// surface. The engine that watches every logged build step and proposes these
// is backend-owned later (critical-path/PERT-CPM analysis over the §4
// verification pipeline); these are display-only mock strings.

export type OptimizationSuggestionKind =
  | "time-reduction"
  | "parallelization"
  | "resequencing"
  | "quality";

export type OptimizationImpact = "high" | "medium" | "low";

export type OptimizationSuggestion = {
  id: string;
  kind: OptimizationSuggestionKind;
  // e.g. "Parallelize firmware and chassis tracks".
  title: string;
  // One-line why, grounded in logged steps.
  rationale: string;
  // Evidence chips, e.g. ["12 daily logs", "Milestone: Chassis v2"].
  evidenceLabels: string[];
  impact: OptimizationImpact;
  // Display-formatted projected saving, e.g. "~9 days" — omitted for pure
  // quality wins that don't move the schedule.
  estimatedTimeSavedLabel?: string;
};

// ---------- Audit-trail-as-a-service (idea 3) ----------
// A project-scoped, stakeholder-visible log of governance events. Reuses the
// admin audit-log card-list shape but widens the scope (decisions, payments,
// hires, task assignments) and the audience (any stakeholder, not just staff).
// Hash-chain framing so the mock reads as tamper-evident rather than merely
// append-only — the real immutable chain is written server-side later.

export type ProjectAuditEventKind = "decision" | "payment" | "hire" | "task-assignment";

export type ProjectAuditEntry = {
  id: string;
  eventKind: ProjectAuditEventKind;
  actorName: string;
  // Free-form so backers/investors (not on teamMembers) can appear, e.g.
  // "Founder", "CFO", "Backer".
  actorRole: string;
  // e.g. "Released escrow milestone".
  actionLabel: string;
  // e.g. "Chassis v2 → $12,000".
  targetLabel: string;
  // "" when there's no extra context.
  detailNote: string;
  // Pre-formatted display string, e.g. "Jul 7, 2026 · 14:12".
  occurredAtLabel: string;
  // Short display hash of this entry, e.g. "a1f9c3".
  entryHashLabel: string;
  // The prior entry's hash folded into this one; "genesis" for the first.
  previousEntryHashLabel: string;
};
