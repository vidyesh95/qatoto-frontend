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

export type Milestone = {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: MilestoneStatus;
  // Display-formatted, e.g. "$12,000". Escrow release is backend-owned later.
  escrowReleaseAmount?: string;
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
