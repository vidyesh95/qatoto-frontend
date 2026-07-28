import { z } from "zod";
import { ProjectStageSchema } from "@/lib/rnd/shared.schemas";

// `GET /funding/deals` — the investor deal-flow view.
// Mirrors `funding-rounds.service.ts`'s `FundingDealView extends FundingRoundView`.

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
