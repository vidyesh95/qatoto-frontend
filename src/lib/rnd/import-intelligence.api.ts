// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`.
//
// ALL SIX READS ARE PUBLIC. The backend mounts them behind `attachOptionalUser`, and it
// reads the session for exactly one purpose: the substitutes read widens to include drafts
// for a platform moderator. Nothing here authorizes anything, and no call needs a signed-in
// caller to answer.
//
// THERE ARE NO WRITE WRAPPERS IN THIS FILE, deliberately. §11m's three writes are all
// `moderate_taxonomy` and belong to the admin console; a wrapper with no caller is
// unverified code, and the audit in `docs/R_AND_D_STRUCTURE.md` §18 exists to catch exactly
// that.

import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  CommodityTradeFlowSchema,
  DomesticSubstituteSchema,
  ImportCommodityDetailSchema,
  ImportCommodityKindOptionSchema,
  ImportCommoditySchema,
  LocalizationAssessmentSchema,
  type CommodityTradeFlow,
  type DomesticSubstitute,
  type ImportCommodity,
  type ImportCommodityDetail,
  type ImportCommodityKindOption,
  type ListImportCommoditiesFilter,
  type ListLocalizationAssessmentsFilter,
  type ListSubstitutesFilter,
  type ListTradeFlowsFilter,
  type LocalizationAssessment,
} from "@/lib/rnd/import-intelligence.schemas";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";

/**
 * The HS6 commodity directory.
 *
 * `reporterCountryCode` narrows to commodities that country actually trades, applied as an
 * EXISTS in SQL — so the page count is a count of commodities rather than of flow rows.
 * `search` matches the label or the code prefix, because a founder types "lithium" and an
 * analyst types "850760" and both mean the same thing.
 */
export function listImportCommodities(
  filter: ListImportCommoditiesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ImportCommodity[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/import-commodities${buildQueryString({ ...filter })}`,
    ImportCommoditySchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * One commodity, its newest assessment for the requested country, and that assessment's
 * pathway suggestions.
 *
 * A `404` here means no such commodity. It does NOT mean "not scored yet" — that is an
 * `assessment: null` inside a `200`, and the two must be rendered differently.
 */
export function getImportCommodity(
  hsCode: string,
  reporterCountryCode?: string,
  options?: RequestOptions,
): Promise<ActionResponse<ImportCommodityDetail>> {
  return getJson(
    `/import-commodities/${hsCode}${buildQueryString({ reporterCountryCode })}`,
    ImportCommodityDetailSchema,
    options,
  );
}

/**
 * One commodity's traded magnitudes, newest period first.
 *
 * These are ALL-PARTNERS AGGREGATES — the figure a localization question needs, which is
 * how much of this the country buys from anywhere. Per-partner rows are representable in
 * the schema but the ingest does not write them and this read does not return them.
 */
export function listCommodityTradeFlows(
  hsCode: string,
  filter: ListTradeFlowsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: CommodityTradeFlow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/import-commodities/${hsCode}/trade-flows${buildQueryString({ ...filter })}`,
    CommodityTradeFlowSchema,
    PaginationMetaSchema,
    options,
  );
}

/** Published substitutes only, unless the caller holds `moderate_taxonomy`. */
export function listCommoditySubstitutes(
  hsCode: string,
  filter: ListSubstitutesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: DomesticSubstitute[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/import-commodities/${hsCode}/substitutes${buildQueryString({ ...filter })}`,
    DomesticSubstituteSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * The rank-ordered feasibility leaderboard for the newest `asOf`.
 *
 * The backend excludes commodities with no imports BEFORE ranking rather than trusting the
 * score to sort them down — an evidence-free cell still scores, so filtering after the fact
 * would leave zeroes interleaved through the tail.
 *
 * An EMPTY result means no scoring run has happened, not that nothing is feasible.
 */
export function listLocalizationAssessments(
  filter: ListLocalizationAssessmentsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: LocalizationAssessment[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/localization-assessments${buildQueryString({ ...filter })}`,
    LocalizationAssessmentSchema,
    PaginationMetaSchema,
    options,
  );
}

/** The chip vocabulary. Server-owned, so a new commodity kind appears without a deploy. */
export function listImportCommodityKinds(
  options?: RequestOptions,
): Promise<ActionResponse<ImportCommodityKindOption[]>> {
  return getJson("/import-commodity-kinds", ImportCommodityKindOptionSchema.array(), options);
}
