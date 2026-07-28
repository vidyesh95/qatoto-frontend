import { z } from "zod";
import { ProjectStageSchema, TrendDirectionSchema } from "@/lib/rnd/shared.schemas";

// `GET /funding/deals` — the investor deal-flow view — plus the three project-scoped
// reads behind the detail page's Funding and Overview tabs:
// `…/funding-rounds`, `…/milestones` and `…/investor-confidence`.
//
// Mirrors `funding-rounds.service.ts`'s `FundingDealView extends FundingRoundView`,
// `milestones.service.ts`'s `MilestoneView` and `investor-confidence.service.ts`'s
// `InvestorConfidenceView`.
//
// ESCROW IS GONE FROM THIS DOMAIN. Nine escrow paths now 404 and `escrowReleaseAmount`
// is retired — a milestone carries `plannedPayoutInCents`, which records intent and
// instructs no payment rail.

export const FUNDING_ROUND_TYPES = ["crowdfunding", "equity", "venture"] as const;
export const FundingRoundTypeSchema = z.enum(FUNDING_ROUND_TYPES);
export type FundingRoundType = z.infer<typeof FundingRoundTypeSchema>;

export const FUNDING_ROUND_STATUSES = ["draft", "open", "closed", "cancelled"] as const;
export const FundingRoundStatusSchema = z.enum(FUNDING_ROUND_STATUSES);

/**
 * One open round on the deal-flow list.
 *
 * MONEY ARRIVES AS A DECIMAL STRING, not a number. These are `bigint` columns and a
 * goal past 2^53 loses precision the moment `JSON.parse` makes it a `number`. Parse
 * with `BigInt(…)` and format via `@/lib/rnd/format`; never `Number(…)` it.
 *
 * `raisedAmountInCents` is the sum of COMMITTED pledges. Qatoto holds no funds and
 * charges nobody in this domain, so no copy beside this number may imply a payment
 * rail, a hold, a charge or a fee. A pledge is a commitment.
 *
 * `percentageFundedBasisPoints` is computed on read and MAY EXCEED 10000 — an
 * over-funded round is a real state, so do not clamp a progress bar's label to 100%
 * even where the bar itself is capped.
 */
export const FundingDealSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    projectSlug: z.string().nullable(),
    projectName: z.string(),
    projectStage: ProjectStageSchema,
    projectTagline: z.string(),
    type: FundingRoundTypeSchema,
    status: FundingRoundStatusSchema,
    title: z.string(),
    summary: z.string().nullable(),
    currency: z.string(),
    goalAmountInCents: z.string(),
    raisedAmountInCents: z.string(),
    percentageFundedBasisPoints: z.number(),
    backersCount: z.number(),
    minimumPledgeInCents: z.string(),
    maximumPledgeInCents: z.string().nullable(),
    opensAt: z.string().nullable(),
    closesAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type FundingDeal = z.infer<typeof FundingDealSchema>;

/**
 * `roundType` is a FACET, NOT A CONTROL. `ENABLED_FUNDING_ROUND_TYPES` is enforced at
 * the API and in SQL, so passing `equity` narrows an already-filtered set to nothing
 * rather than unlocking anything. Hiding the chip in the UI is cosmetic; the gate is
 * server-side, because equity and venture rounds are securities offerings.
 */
export interface ListFundingDealsFilter {
  readonly roundType?: FundingRoundType;
  readonly stage?: z.infer<typeof ProjectStageSchema>;
  readonly page?: number;
  readonly limit?: number;
}

// --- The project-scoped reads -------------------------------------------------

/**
 * `GET /research-projects/:projectSlug/funding-rounds` — one project's rounds, every
 * status, not just the open one. `requireAuth` plus membership, `404` otherwise.
 *
 * The same money rules as `FundingDealSchema`: decimal strings over `bigint` columns,
 * `raisedAmountInCents` is the sum of COMMITTED pledges and nothing beside it may imply
 * a hold or a charge, and `percentageFundedBasisPoints` may exceed 10000 because an
 * over-funded round is a real state.
 *
 * `projectName`, `projectStage` and `projectTagline` are NOT on this row — the deal-flow
 * view adds them because a cross-project list needs them, and a project-scoped read
 * already knows whose rounds these are.
 */
export const FundingRoundSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    projectSlug: z.string().nullable(),
    type: FundingRoundTypeSchema,
    status: FundingRoundStatusSchema,
    title: z.string(),
    summary: z.string().nullable(),
    currency: z.string(),
    goalAmountInCents: z.string(),
    raisedAmountInCents: z.string(),
    percentageFundedBasisPoints: z.number(),
    backersCount: z.number(),
    minimumPledgeInCents: z.string(),
    maximumPledgeInCents: z.string().nullable(),
    opensAt: z.string().nullable(),
    closesAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type FundingRound = z.infer<typeof FundingRoundSchema>;

export const MILESTONE_STATUSES = ["planned", "in_progress", "done", "cancelled"] as const;
export const MilestoneStatusSchema = z.enum(MILESTONE_STATUSES);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;

export const VARIANCE_SCHEDULE_UNIT_KEYS = ["days", "weeks"] as const;
export const VARIANCE_EFFORT_UNIT_KEYS = ["minutes", "hours"] as const;

/**
 * Expected-vs-actual on a milestone: six typed integers and two unit nouns, replacing
 * the five pre-rendered labels the mock carried.
 *
 * THE UNIT TRAVELS WITH THE NUMBER (`scheduleUnitKey`, `effortUnitKey`) so no client
 * hardcodes an English word and comparing two rows means reading the key.
 *
 * `varianceBasisPoints` is SIGNED — negative is behind schedule, positive is ahead —
 * which is why the mock's `varianceLabel: "26% behind"` could not survive: one string
 * carried a magnitude, a direction and a judgement at once.
 */
export const MilestoneVarianceSchema = z
  .object({
    plannedDurationDays: z.number(),
    actualDurationDays: z.number(),
    plannedCostInCents: z.string(),
    actualCostInCents: z.string(),
    plannedEffortMinutes: z.number(),
    actualEffortMinutes: z.number(),
    scheduleUnitKey: z.enum(VARIANCE_SCHEDULE_UNIT_KEYS),
    effortUnitKey: z.enum(VARIANCE_EFFORT_UNIT_KEYS),
    varianceBasisPoints: z.number(),
    currency: z.string(),
    computedAt: z.string(),
  })
  .strip();
export type MilestoneVariance = z.infer<typeof MilestoneVarianceSchema>;

/**
 * `GET /research-projects/:projectSlug/milestones`. Member-scoped.
 *
 * `plannedPayoutInCents` REPLACES the mock's `escrowReleaseAmount`, renamed as well as
 * retyped: it records what the project intends to pay, and instructs no payment rail.
 * Qatoto holds no funds.
 *
 * `variance` is null on milestones nobody tracked with production metrics — an absence,
 * not a zeroed row.
 */
export const MilestoneSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: MilestoneStatusSchema,
    plannedPayoutInCents: z.string(),
    currency: z.string(),
    dueDate: z.string().nullable(),
    completedAt: z.string().nullable(),
    orderIndex: z.number(),
    variance: MilestoneVarianceSchema.nullable(),
    createdAt: z.string(),
  })
  .strip();
export type Milestone = z.infer<typeof MilestoneSchema>;

/**
 * `GET /research-projects/:projectSlug/investor-confidence`.
 *
 * **404s when the signal was never computed**, and that is not an error to paper over:
 * the previous mock hardcoded `78 / 100` and the deal card defaulted a missing score to
 * `50`, both of which publish a fabricated finding. Render the absence.
 *
 * `confidenceBasisPoints` is basis points, not a percent — divide by 100 for a percent
 * or use `formatEquityFromBasisPoints`-style rendering, never treat it as 0..100.
 * `asOf` exists so the client renders "as of" rather than implying a live number.
 */
export const InvestorConfidenceSchema = z
  .object({
    projectId: z.string(),
    confidenceBasisPoints: z.number(),
    trend: TrendDirectionSchema,
    dailyLogStreakDays: z.number(),
    verifiedMilestoneCount: z.number(),
    totalMilestoneCount: z.number(),
    openDisputeCount: z.number(),
    resolvedDisputeCount: z.number(),
    asOf: z.string(),
    windowStartsAt: z.string(),
    windowEndsAt: z.string(),
    computedAt: z.string(),
  })
  .strip();
export type InvestorConfidence = z.infer<typeof InvestorConfidenceSchema>;
