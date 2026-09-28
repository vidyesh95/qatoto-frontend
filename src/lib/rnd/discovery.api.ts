// TRANSPORT: server-fetch + client-query — every function here takes an optional
// `RequestOptions`, so it is callable from BOTH sides. A server component must route
// through `@/lib/server-http` to forward the session cookie; a client hook can call
// these directly because the browser attaches cookies itself.
//
// `GET /discovery/*`. One function per route, each returning the tagged
// `ActionResponse` — no throwing, no `any`, no `as` (CLAUDE.md Pattern 3).

import {
  buildQueryString,
  getEnvelope,
  getJson,
  getPaginated,
  sendForm,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  DemandSignalSchema,
  MyProblemReportSchema,
  ProblemClusterDetailSchema,
  ProblemReportPhotoSchema,
  ProblemSubmissionReceiptSchema,
  TalentProfileMeSchema,
  DiscoveryRegionSchema,
  DiscoverySkillSchema,
  MarketInsightSchema,
  ProblemClusterListEnvelopeSchema,
  TalentProfileSchema,
  type DemandSignal,
  type DiscoveryRegion,
  type DiscoverySkill,
  type MarketInsight,
  type MarketInsightStatKind,
  type MyProblemReport,
  type ProblemCluster,
  type ProblemClusterDetail,
  type ProblemReportPhoto,
  type ProblemSubmissionReceipt,
  type ProblemClusterSort,
  type TalentAvailability,
  type TalentProfile,
  type TalentProfileInput,
  type TalentProfileMe,
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
  /**
   * The point `sort: "distance"` orders from. BOTH OR NEITHER, and only with that sort — the
   * backend answers 422 for either mismatch.
   */
  readonly centreLatitudeMicrodegrees?: number;
  readonly centreLongitudeMicrodegrees?: number;
  readonly page?: number;
  readonly limit?: number;
}

/** A page of clusters plus the one envelope-level fact that applies to all of them. */
export interface ProblemClusterListPage {
  readonly rows: ProblemCluster[];
  readonly pagination: PaginationMeta;
  /** `null` when the backend did not send it — never a copied 25 km. */
  readonly matchRadiusMeters: number | null;
}

/**
 * The problem map and the landing teaser.
 *
 * The score filter is `minOpportunityScorePoints`. `R_AND_D_BACKEND_STRUCTURE.md`
 * §11b calls it `minOpportunityScore`, which the `.strict()` query schema rejects
 * with a 422.
 */
export async function listProblemClusters(
  filter: ListProblemClustersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProblemClusterListPage>> {
  // `getEnvelope`, not `getPaginated`: the latter keeps only `data` and `pagination` and would
  // drop `matchRadiusMeters` — the `rankSeed` precedent in `src/lib/feed/api.ts`.
  const envelopeResult = await getEnvelope(
    `/discovery/problem-clusters${buildQueryString({ ...filter })}`,
    ProblemClusterListEnvelopeSchema,
    options,
  );
  if (!envelopeResult.success) return envelopeResult;
  return {
    success: true,
    data: {
      rows: envelopeResult.data.data,
      pagination: envelopeResult.data.pagination,
      matchRadiusMeters: envelopeResult.data.matchRadiusMeters ?? null,
    },
  };
}

export function getProblemCluster(
  clusterId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProblemClusterDetail>> {
  return getJson(`/discovery/problem-clusters/${clusterId}`, ProblemClusterDetailSchema, options);
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

/**
 * One published market insight.
 *
 * SAME PROJECTION AS THE LIST. The backend returns `MarketInsightView` from both reads, so
 * `MarketInsightSchema` is reused rather than forked — a detail schema that drifted from the
 * list's would make a card and its own page disagree about the same row.
 *
 * A `404` COVERS TWO CASES DELIBERATELY: no such insight, and an insight that is still an
 * unpublished draft. The backend refuses to distinguish them so a moderator's work in
 * progress cannot be discovered by id, and this wrapper must not try to either.
 */
export function getMarketInsight(
  insightId: string,
  options?: RequestOptions,
): Promise<ActionResponse<MarketInsight>> {
  return getJson(`/discovery/market-insights/${insightId}`, MarketInsightSchema, options);
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

/**
 * One published talent profile, by handle or user id.
 *
 * AN UNPUBLISHED PROFILE IS A `404`, identical to a person who does not exist. That is
 * the point: a directory that answered differently for "exists but hidden" would let
 * anyone enumerate who has a profile they chose not to publish. Treat the 404 as
 * `notFound()` and never as a permission hint.
 */
export function getTalentProfile(
  talentUserIdOrHandle: string,
  options?: RequestOptions,
): Promise<ActionResponse<TalentProfile>> {
  return getJson(`/discovery/talent/${talentUserIdOrHandle}`, TalentProfileSchema, options);
}

/**
 * What the report sheet sends.
 *
 * Exported because the React Query hook wrapping this needs the identical shape, and it used to
 * declare its own copy inline — two hand-written literals that had to be kept in step by hand, on
 * the one body in this domain that `.strict()` refuses extra keys from.
 */
export interface CreateProblemReportInput {
  readonly title: string;
  readonly categoryId: string;
  readonly description: string;
  /** Free text — "Nakuru County market road". Server-geocoded, and still REQUIRED. */
  readonly locationText: string;
  /**
   * The reporter's optional coarse pin, already rounded to ~110 m by `report-pin.ts`.
   *
   * ⚠️ **BOTH OR NEITHER.** Callers build it with `toApproximatePin`, which returns the pair as one
   * object, so a half pin cannot be constructed here — the server refines the same rule and the
   * database CHECKs it.
   */
  readonly approxLatitudeMicrodegrees?: number;
  readonly approxLongitudeMicrodegrees?: number;
  /**
   * Photos staged by `uploadProblemReportPhoto`, at most three and each once. The submit claims
   * them in the same transaction as the report; one the server cannot claim refuses the whole
   * report with a single 422 on `photoIds`.
   */
  readonly photoIds?: readonly string[];
}

/**
 * Stage one photo for a report that does not exist yet. **`201`** — stored, measured, unclaimed.
 *
 * The server re-encodes the bytes with no metadata carried over, so the GPS a phone writes into
 * a JPEG never reaches storage. It does NOT review or blur what is in the picture. A photo not
 * named by a report within a day is deleted by the server's sweep.
 */
export function uploadProblemReportPhoto(
  photoFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<ProblemReportPhoto>> {
  const formData = new FormData();
  formData.append("photo", photoFile);
  return sendForm(
    "/discovery/problem-reports/photos",
    "POST",
    formData,
    ProblemReportPhotoSchema,
    options,
  );
}

/**
 * Submit a problem report to Civic Pulse. **`202`**, not a verdict.
 *
 * THE REPORT IS NOT A CLUSTER. It is one person's submission; clustering, geocoding and
 * scoring all happen afterwards on a schedule, and the pin a reporter eventually sees may
 * merge theirs with other people's. Nothing here may say "your report is on the map".
 *
 * **`locationText` IS STILL REQUIRED AND IS STILL WHAT DECIDES THE GEOGRAPHY.** The server
 * forward-geocodes it for the country and the region, which feed the opportunity score; there is no
 * reverse geocoder, so the optional pin cannot supply either and a report whose text does not
 * resolve still fails geocoding however precisely it was pinned.
 *
 * ⚠️ **THIS COMMENT USED TO SAY THE CLIENT SENDS NO COORDINATES, AND THE DISTINCTION THAT REPLACED
 * IT IS WORTH KEEPING STRAIGHT.** `latitudeMicrodegrees` / `longitudeMicrodegrees` are where the
 * clustering job PLACED a report and are still rejected with a `422` — an earlier version of this
 * wrapper sent exactly those, plus `locationLabel`, while omitting the required `locationText`, and
 * it had no caller, which is why nobody noticed (R_AND_D_BACKEND_STRUCTURE.md Appendix D). The
 * `approx*` pair is a different claim: what the reporter said, coarse on arrival, refining POSITION
 * only, and discarded by the job when it disagrees with the geocode by more than the clustering
 * radius.
 */
export function createProblemReport(
  input: CreateProblemReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<ProblemSubmissionReceipt>> {
  return sendJson(
    "/discovery/problem-reports",
    "POST",
    input,
    ProblemSubmissionReceiptSchema,
    options,
  );
}

/**
 * The caller's own submissions — the poll target the `202` needs.
 *
 * WITHOUT THIS READ A REPORTER NEVER LEARNS WHAT HAPPENED TO THEIR REPORT. The receipt
 * carries `clusteringStatus: "queued"` and `clusterId: null` by construction, so the only
 * way to see it become `clustered` (or `geocode_failed`, or `rejected`) is here.
 *
 * No `userId` param exists and none may be added — the filter is the session.
 */
export function listMyProblemReports(
  filter: {
    readonly clusteringStatus?: string;
    readonly page?: number;
    readonly limit?: number;
  } = {},
  options?: RequestOptions,
): PagedResult<MyProblemReport> {
  return getPaginated(
    `/discovery/problem-reports/mine${buildQueryString({ ...filter })}`,
    MyProblemReportSchema,
    PaginationMetaSchema,
    options,
  );
}

// --- The caller's own talent profile ------------------------------------------

/**
 * `GET /discovery/talent/me` — the editable copy, with the publish gate's HINT.
 *
 * `completeness` exists so the publish button can be disabled before a round trip and can
 * NAME what is missing. It is not the check: `publishTalentProfile` re-derives it
 * server-side at request time, so a client that ignored this field would simply get a
 * refusal instead of a published profile.
 */
export function getMyTalentProfile(
  options?: RequestOptions,
): Promise<ActionResponse<TalentProfileMe>> {
  return getJson("/discovery/talent/me", TalentProfileMeSchema, options);
}

/**
 * `PUT /discovery/talent/me` — upsert. The whole profile every time, never a patch.
 *
 * `skillSlugs` are CANONICAL `discovery_skill` slugs and are validated as a subset
 * server-side: an unknown slug is a typed `422` naming the offenders rather than silently
 * creating taxonomy. Read the vocabulary from `GET /discovery/skills` and send slugs from
 * it, never free text.
 *
 * `compensationAsks` is a DISCRIMINATED UNION of at most three strands, so an equity ask
 * carrying a salary range is unrepresentable rather than merely discouraged.
 */
export function putMyTalentProfile(
  input: TalentProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<TalentProfileMe>> {
  return sendJson("/discovery/talent/me", "PUT", input, TalentProfileMeSchema, options);
}

/** Publish. The server re-derives completeness; a missing requirement is a refusal. */
export function publishMyTalentProfile(
  options?: RequestOptions,
): Promise<ActionResponse<TalentProfileMe>> {
  return sendJson(
    "/discovery/talent/me/publish",
    "POST",
    undefined,
    TalentProfileMeSchema,
    options,
  );
}

/** Unpublish. The row survives; it stops appearing in the directory and 404s by handle. */
export function unpublishMyTalentProfile(
  options?: RequestOptions,
): Promise<ActionResponse<TalentProfileMe>> {
  return sendJson(
    "/discovery/talent/me/unpublish",
    "POST",
    undefined,
    TalentProfileMeSchema,
    options,
  );
}
