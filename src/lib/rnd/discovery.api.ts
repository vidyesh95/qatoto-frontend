// TRANSPORT: server-fetch + client-query — every function here takes an optional
// `RequestOptions`, so it is callable from BOTH sides. A server component must route
// through `@/lib/server-http` to forward the session cookie; a client hook can call
// these directly because the browser attaches cookies itself.
//
// `GET /discovery/*`. One function per route, each returning the tagged
// `ActionResponse` — no throwing, no `any`, no `as` (CLAUDE.md Pattern 3).

import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  DemandSignalSchema,
  DiscoveryRegionSchema,
  DiscoverySkillSchema,
  MarketInsightSchema,
  ProblemClusterSchema,
  TalentProfileSchema,
  type DemandSignal,
  type DiscoveryRegion,
  type DiscoverySkill,
  type MarketInsight,
  type MarketInsightStatKind,
  type ProblemCluster,
  type ProblemClusterSort,
  type TalentAvailability,
  type TalentProfile,
  type TalentSort,
} from "@/lib/rnd/discovery.schemas";
import { PaginationMetaSchema, type RoleCommitment } from "@/lib/rnd/shared.schemas";

type PagedResult<T> = Promise<ActionResponse<{ rows: T[]; pagination: PaginationMeta }>>;

// --- Problem clusters (Civic Pulse) ------------------------------------------

export interface ListProblemClustersFilter {
  readonly category?: string;
  readonly region?: string;
  readonly minOpportunityScorePoints?: number;
  /**
   * The map viewport, so the client fetches pins for what is on screen rather than
   * the planet. ALL FOUR OR NONE — the backend rejects a partial box.
   */
  readonly minLatitudeMicrodegrees?: number;
  readonly maxLatitudeMicrodegrees?: number;
  readonly minLongitudeMicrodegrees?: number;
  readonly maxLongitudeMicrodegrees?: number;
  readonly sort?: ProblemClusterSort;
  readonly page?: number;
  readonly limit?: number;
}

/**
 * The problem map and the landing teaser.
 *
 * The score filter is `minOpportunityScorePoints`. `R_AND_D_BACKEND_STRUCTURE.md`
 * §11b calls it `minOpportunityScore`, which the `.strict()` query schema rejects
 * with a 422.
 */
export function listProblemClusters(
  filter: ListProblemClustersFilter = {},
  options?: RequestOptions,
): PagedResult<ProblemCluster> {
  return getPaginated(
    `/discovery/problem-clusters${buildQueryString({ ...filter })}`,
    ProblemClusterSchema,
    PaginationMetaSchema,
    options,
  );
}

export function getProblemCluster(
  clusterId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProblemCluster>> {
  return getJson(`/discovery/problem-clusters/${clusterId}`, ProblemClusterSchema, options);
}

// --- Knowledge hub -----------------------------------------------------------

export interface ListMarketInsightsFilter {
  readonly region?: string;
  readonly category?: string;
  readonly statKind?: MarketInsightStatKind;
  readonly page?: number;
  readonly limit?: number;
}

export function listMarketInsights(
  filter: ListMarketInsightsFilter = {},
  options?: RequestOptions,
): PagedResult<MarketInsight> {
  return getPaginated(
    `/discovery/market-insights${buildQueryString({ ...filter })}`,
    MarketInsightSchema,
    PaginationMetaSchema,
    options,
  );
}

export interface ListDemandSignalsFilter {
  readonly region?: string;
  readonly category?: string;
  readonly page?: number;
  readonly limit?: number;
}

export function listDemandSignals(
  filter: ListDemandSignalsFilter = {},
  options?: RequestOptions,
): PagedResult<DemandSignal> {
  return getPaginated(
    `/discovery/demand-signals${buildQueryString({ ...filter })}`,
    DemandSignalSchema,
    PaginationMetaSchema,
    options,
  );
}

// --- Facet vocabularies (neither is paginated — a facet list is not a feed) ---

export function listDiscoveryRegions(
  filter: { readonly countryCode?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<DiscoveryRegion[]>> {
  return getJson(
    `/discovery/regions${buildQueryString({ ...filter })}`,
    DiscoveryRegionSchema.array(),
    options,
  );
}

export function listDiscoverySkills(
  options?: RequestOptions,
): Promise<ActionResponse<DiscoverySkill[]>> {
  return getJson("/discovery/skills", DiscoverySkillSchema.array(), options);
}

// --- Talent ------------------------------------------------------------------

export interface ListTalentFilter {
  readonly commitment?: RoleCommitment;
  /** Repeatable, and the backend ANDs the values — which is what a chip row means. */
  readonly skill?: readonly string[];
  readonly availability?: TalentAvailability;
  readonly region?: string;
  readonly sort?: TalentSort;
  readonly page?: number;
  readonly limit?: number;
}

/**
 * The talent directory. `requireAuth` — the only §6 read that returns other people's
 * personal data. A signed-out caller gets `401`, and the page must render its
 * signed-out branch with an empty list rather than inventing rows.
 */
export function listTalentProfiles(
  filter: ListTalentFilter = {},
  options?: RequestOptions,
): PagedResult<TalentProfile> {
  return getPaginated(
    `/discovery/talent${buildQueryString({ ...filter })}`,
    TalentProfileSchema,
    PaginationMetaSchema,
    options,
  );
}
