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
