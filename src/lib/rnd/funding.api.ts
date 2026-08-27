// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. `GET /funding/deals` is `requireAuth`, so a server component MUST
// forward the session cookie through `@/lib/server-http` or every call is a 401.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  FundingDealSchema,
  FundingRoundSchema,
  InvestorConfidenceSchema,
  MilestoneSchema,
  PledgeOptionsSchema,
  PledgeSchema,
  RoundBackerSchema,
  type FundingDeal,
  MyFoundedFundingRoundSchema,
  type FundingRound,
  type MyFoundedFundingRound,
  type InvestorConfidence,
  type ListFundingDealsFilter,
  type Milestone,
  type Pledge,
  type PledgeOptions,
  type RoundBacker,
} from "@/lib/rnd/funding.schemas";

/**
 * Investor deal flow — open rounds on active projects.
 *
 * UNPAGINATED on the wire: the controller responds with a plain envelope and no
 * `pagination` sibling even though it accepts `?page=` and `?limit=`. So this is
 * `getJson` over an array, not `getPaginated`; asking for pagination metadata that
 * isn't sent would fail the parse and surface as a PARSE error.
 *
 * Filtered by `ENABLED_FUNDING_ROUND_TYPES` **in SQL**. Equity and venture rounds are
 * securities offerings and stay disabled at the API, which is why hiding their chip in
 * the UI is cosmetic rather than a control.
 */
export function listFundingDeals(
  filter: ListFundingDealsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FundingDeal[]>> {
  return getJson(
    `/funding/deals${buildQueryString({ ...filter })}`,
    FundingDealSchema.array(),
    options,
  );
}

/**
 * One project's funding rounds, every status. Member-scoped — `404` to everyone else,
 * which `toMemberScopedListViewState` turns into "members only" now that the caller has
 * already resolved the project through its public detail read.
 *
 * Bare array: no `pagination` sibling, no cursor.
 */
export function listProjectFundingRounds(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound[]>> {
  return getJson(
    `/research-projects/${projectSlug}/funding-rounds`,
    FundingRoundSchema.array(),
    options,
  );
}

/** One project's milestones, ordered by `orderIndex`. Member-scoped, bare array. */
export function listProjectMilestones(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone[]>> {
  return getJson(`/research-projects/${projectSlug}/milestones`, MilestoneSchema.array(), options);
}

/**
 * The computed confidence signal.
 *
 * **404 is a normal outcome here, not a failure** — it is both "not a member" and
 * "never computed", and the frontend cannot tell them apart. Both render as an absence.
 * Do not substitute a default: the old mock's hardcoded `78` and the deal card's
 * defaulted `50` were fabricated findings.
 */
export function getProjectInvestorConfidence(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<InvestorConfidence>> {
  return getJson(
    `/research-projects/${projectSlug}/investor-confidence`,
    InvestorConfidenceSchema,
    options,
  );
}

// --- Pledging -----------------------------------------------------------------

/**
 * The advisory bounds behind a pledge form.
 *
 * ADVISORY, and the endpoint's own comment says so: `createPledge` re-derives every one
 * of these. Rendering the minimum from here is helpful; deciding a pledge is valid from
 * here would be a client-side authorization check, which is exactly what §0 forbids.
 */
export function getPledgeOptions(
  roundId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PledgeOptions>> {
  return getJson(`/funding-rounds/${roundId}/pledge-options`, PledgeOptionsSchema, options);
}

/**
 * Record a COMMITMENT.
 *
 * THE BODY IS `{ amountInCents }` AND NOTHING ELSE. No currency (derived from the round),
 * no fee, no payment instrument, no card token — the endpoint has no field for any of it
 * and its schema is `.strict()`.
 *
 * **NO CHARGE AND NO HOLD HAPPENS HERE**, and no copy beside this call may imply one.
 * Qatoto holds no funds; a pledge is a promise recorded against a round, and the money
 * moves — if it moves — entirely outside this system.
 *
 * `422 SELF_PLEDGE_FORBIDDEN` when the caller backs their own project; `429` on the
 * limiter.
 */
export function createPledge(
  roundId: string,
  input: { readonly amountInCents: string },
  options?: RequestOptions,
): Promise<ActionResponse<Pledge>> {
  return sendJson(`/funding-rounds/${roundId}/pledges`, "POST", input, PledgeSchema, options);
}

/**
 * The caller's own commitments.
 *
 * THERE IS NO `?userId=` PARAM AND THERE MUST NOT BE ONE — the filter is `req.user.id`. A
 * client-supplied user id on a personal list is a client-supplied authorization input.
 */
export function listMyPledges(
  filter: { readonly status?: string; readonly page?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<Pledge[]>> {
  return getJson(`/pledges/mine${buildQueryString({ ...filter })}`, PledgeSchema.array(), options);
}

/**
 * `GET /funding-rounds/mine` — the cross-project view behind `/studio/funding`.
 *
 * NOT THE SAME AS `listProjectFundingRounds` ABOVE, which needs a slug and returns one project's
 * rounds. This one spans every project the caller founds, which is the thing that did not exist
 * and the reason a founder with three ventures raising at once had to open three project pages.
 *
 * Paginated server-side, like `listMyPledges` below it.
 */
export function listMyFoundedFundingRounds(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<MyFoundedFundingRound[]>> {
  return getJson(
    `/funding-rounds/mine${buildQueryString({ ...filter })}`,
    MyFoundedFundingRoundSchema.array(),
    options,
  );
}

/** Withdraw a commitment. It leaves the backer list and decrements the counters. */
export function cancelPledge(
  pledgeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Pledge>> {
  return sendJson(`/pledges/${pledgeId}/cancel`, "POST", undefined, PledgeSchema, options);
}

/** Everyone whose commitment still stands on a round. */
export function listRoundBackers(
  roundId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RoundBacker[]>> {
  return getJson(`/funding-rounds/${roundId}/backers`, RoundBackerSchema.array(), options);
}

// --- Round lifecycle (founder) -------------------------------------------------

export interface CreateFundingRoundInput {
  readonly type: string;
  readonly title: string;
  readonly summary?: string;
  readonly goalAmountInCents: string;
  readonly minimumPledgeInCents?: string;
  readonly maximumPledgeInCents?: string;
  readonly opensAt?: string;
  readonly closesAt?: string;
}

/**
 * Create a draft round.
 *
 * GATED BY `ENABLED_FUNDING_ROUND_TYPES` AT THE API AND IN SQL — `403 ROUND_TYPE_DISABLED`
 * for equity and venture, which are securities offerings. Hiding those options in a form
 * is cosmetic; this gate is the control.
 */
export function createFundingRound(
  projectSlug: string,
  input: CreateFundingRoundInput,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound>> {
  return sendJson(
    `/research-projects/${projectSlug}/funding-rounds`,
    "POST",
    input,
    FundingRoundSchema,
    options,
  );
}

/**
 * Edit a DRAFT round. `409 ROUND_NOT_EDITABLE` once it has ever opened, and `type` is not
 * editable at all — a crowdfunding round cannot become an equity one after backers read it.
 */
export function updateFundingRound(
  roundId: string,
  input: Partial<Omit<CreateFundingRoundInput, "type">>,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound>> {
  return sendJson(`/funding-rounds/${roundId}`, "PATCH", input, FundingRoundSchema, options);
}

/**
 * Withdraw a draft round. `409 ROUND_HAS_REFERENCES` once it carries a pledge or has ever
 * opened — a round somebody backed is a record, not a draft.
 */
export function deleteFundingRound(
  roundId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound>> {
  return sendJson(`/funding-rounds/${roundId}`, "DELETE", undefined, FundingRoundSchema, options);
}

/**
 * Open it. THE TYPE GATE IS RE-CHECKED HERE, not only at create.
 * `422 ROUND_INCOMPLETE_FOR_OPEN` when the round is missing what a backer needs to decide.
 */
export function openFundingRound(
  roundId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound>> {
  return sendJson(
    `/funding-rounds/${roundId}/open`,
    "POST",
    undefined,
    FundingRoundSchema,
    options,
  );
}

export function closeFundingRound(
  roundId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FundingRound>> {
  return sendJson(
    `/funding-rounds/${roundId}/close`,
    "POST",
    undefined,
    FundingRoundSchema,
    options,
  );
}

// --- Milestones ----------------------------------------------------------------

export interface MilestoneInput {
  readonly title: string;
  readonly description?: string;
  readonly plannedPayoutInCents: string;
  readonly dueDate?: string;
}

/**
 * Create a milestone.
 *
 * `orderIndex` IS SERVER-DERIVED and is not a body field. `plannedPayoutInCents` RECORDS
 * INTENT AND INSTRUCTS NO PAYMENT RAIL — it replaced `escrowReleaseAmountInCents` when
 * escrow left this contract, and the rename is the point.
 */
export function createMilestone(
  projectSlug: string,
  input: MilestoneInput,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone>> {
  return sendJson(
    `/research-projects/${projectSlug}/milestones`,
    "POST",
    input,
    MilestoneSchema,
    options,
  );
}

/** Edit one. THERE IS NO `status` FIELD on this PATCH — completing is its own endpoint. */
export function updateMilestone(
  milestoneId: string,
  input: Partial<MilestoneInput>,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone>> {
  return sendJson(`/milestones/${milestoneId}`, "PATCH", input, MilestoneSchema, options);
}

/** Refused once `done`, `cancelled`, or cited by an escrow-release row. `409`. */
export function deleteMilestone(
  milestoneId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone>> {
  return sendJson(`/milestones/${milestoneId}`, "DELETE", undefined, MilestoneSchema, options);
}

export function completeMilestone(
  milestoneId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone>> {
  return sendJson(
    `/milestones/${milestoneId}/complete`,
    "POST",
    undefined,
    MilestoneSchema,
    options,
  );
}

export interface MilestoneVarianceInput {
  readonly plannedDurationDays: number;
  readonly actualDurationDays: number;
  readonly plannedCostInCents: string;
  readonly actualCostInCents: string;
  readonly plannedEffortMinutes: number;
  readonly actualEffortMinutes: number;
}

/**
 * Record what the milestone actually cost against what it was meant to.
 *
 * SIX INTEGERS IN, AND NO `varianceBasisPoints`. That number is computed server-side from
 * these and clamped to the column's bound — a client-supplied variance would be the one
 * figure on the page nobody derived.
 *
 * `PUT`, not `PATCH`, and the verb is the contract: recording the same variance twice
 * leaves one row rather than two.
 */
export function putMilestoneVariance(
  milestoneId: string,
  input: MilestoneVarianceInput,
  options?: RequestOptions,
): Promise<ActionResponse<Milestone>> {
  return sendJson(`/milestones/${milestoneId}/variance`, "PUT", input, MilestoneSchema, options);
}
