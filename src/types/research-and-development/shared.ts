// Cross-cutting primitives for the Research & Development surface (concept-to-consumer
// pipeline). Data truth lives in the Express backend; these shapes are the
// client-side contract only. UI-building phase: consumed from static mocks in
// `src/mocks/research-and-development-mocks.ts`, no fetch layer yet.

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
