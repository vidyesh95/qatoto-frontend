// Cross-cutting primitives for the Research & Development surface (concept-to-consumer
// pipeline). Data truth lives in the Express backend; these shapes are the client-side
// contract only.
//
// THESE TYPES DESCRIBE THE SURFACES STILL ON MOCKS. Wired surfaces take their types
// from the response schemas in `src/lib/rnd/*.schemas.ts` via `z.infer`, so there is
// one source of truth per surface and no hand-maintained copy to drift. This file
// shrinks as each phase lands (docs/R_AND_D_STRUCTURE.md §18).
//
// Union values are `snake_case` to match the backend's pgEnums. Anything still
// kebab-case here is a SLUG (region, skill, supplier capability) or a mock entity id,
// both of which are kebab by backend convention.

export type ProjectStage =
  | "market_research"
  | "problem_validation"
  | "team_building"
  | "building_mvp"
  | "raising_funding"
  | "go_to_market";

export type RoleCommitment = "full_time" | "part_time" | "hobby";

export type AiSummaryChipKind = "blocker" | "progress" | "velocity" | "suggestion";

export type AiSummaryChip = {
  kind: AiSummaryChipKind;
  label: string;
};

export type MilestoneStatus = "done" | "current" | "upcoming";

export type FundingRoundType = "equity" | "crowdfunding" | "venture";

export type FundingRoundStatus = "open" | "closed";

// `EscrowDirection` and `EscrowVerificationStatus` were deleted with the escrow
// domain — the backend unmounted those nine routes and they answer 404. Do not
// reintroduce either; see `project.ts`'s header.

export type TrendDirection = "up" | "down" | "flat";
