// Project core: team, roles, milestones, funding, and escrow for a single
// Research & Development project. Data truth lives in the Express backend;
// these shapes are the client-side contract only. UI-building phase: consumed
// from static mocks in `src/mocks/research-and-development-mocks.ts`, no fetch
// layer yet.

import type {
  AiSummaryChip,
  EscrowDirection,
  EscrowVerificationStatus,
  FundingRoundStatus,
  FundingRoundType,
  MilestoneStatus,
  ProjectStage,
  RoleCommitment,
} from "./shared";

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

// A role/person can pay/ask in one or more of these ways; a blend combines
// several. The repo's canonical compensation trio — ImmortalCompensationPreference
// (in ./immortal) is aliased to this so the two unions can never drift apart.
export type CompensationKind = "salary" | "one-time" | "equity";

// One strand of a compensation offer (role) or ask (talent). Display-only — the
// backend owns the real Slicing Pie / escrow math later. Invariant (upheld in
// mocks, backend-enforced later): a role/profile carries >= 1 strand and at most
// one strand per kind.
export type CompensationComponent = {
  kind: CompensationKind;
  // How much, e.g. "$4k–6k/mo", "$9k", "2–4%".
  amountLabel: string;
  // How it's earned — reinforces the work-verified, not-upfront model. Set on
  // role OFFERS (salary/one-time → escrow-release wording; equity → Slicing Pie
  // wording); omitted on talent ASKS, which state a wish, not a mechanism.
  // e.g. "Paid from escrow as milestones verify", "Vests via Slicing Pie as
  // verified effort lands".
  earnedAsLabel?: string;
};

export type OpenRole = {
  id: string;
  projectId: string;
  projectName: string;
  roleTitle: string;
  skills: string[];
  // A blended offer: >= 1 strand, at most one per kind. Never empty.
  compensation: CompensationComponent[];
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
