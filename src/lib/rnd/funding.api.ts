// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. `GET /funding/deals` is `requireAuth`, so a server component MUST
// forward the session cookie through `@/lib/server-http` or every call is a 401.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  FundingDealSchema,
  FundingRoundSchema,
  InvestorConfidenceSchema,
  MilestoneSchema,
  type FundingDeal,
  type FundingRound,
  type InvestorConfidence,
  type ListFundingDealsFilter,
  type Milestone,
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
