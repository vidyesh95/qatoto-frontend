// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`.
//
// ALL SEVEN READS ARE PUBLIC. The backend mounts them behind `attachOptionalUser`, and it
// reads the session for exactly one purpose: the substitutes read widens to include drafts
// for a platform moderator. Nothing here authorizes anything, and no call needs a signed-in
// caller to answer.
//
// ONE WRITE WRAPPER, AND IT IS THE ONLY AUTHENTICATED CALL HERE. §11m's three
// `moderate_taxonomy` writes still have no wrapper — they belong to the admin console, and a
// wrapper with no caller is unverified code (`docs/R_AND_D_STRUCTURE.md` §18 exists to catch
// exactly that). `requestPathwayNarrative` is different: it is called from the opportunity
// picker, it needs a signed-in caller, and the reason is the bill. It enqueues a metered
// model call, so the backend puts it behind `requireAuth` plus a rate limiter while every
// read beside it stays public.

import {
  buildQueryString,
  getJson,
  getPaginated,
  sendJson,
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
  ImportReporterSchema,
  LocalizationAssessmentGridCellSchema,
  LocalizationAssessmentSchema,
  PathwayRequestAcceptedSchema,
  type CommodityTradeFlow,
  type DomesticSubstitute,
  type ImportCommodity,
  type ImportCommodityDetail,
  type ImportCommodityKindOption,
  type ImportReporter,
  type ListImportCommoditiesFilter,
  type ListLocalizationAssessmentGridFilter,
  type ListLocalizationAssessmentsFilter,
  type ListSubstitutesFilter,
  type ListTradeFlowsFilter,
  type LocalizationAssessment,
  type LocalizationAssessmentGridCell,
  type PathwayRequestAccepted,
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

/**
 * The whole scored population, counted per score cell.
 *
 * Unpaginated for the reason the schema gives: nine-rung ladders on both axes cap the result
 * at 81 cells. `getJson`, not `getPaginated` — there is no pagination envelope to parse, and
 * asking for one would make an honest 81-row answer look like a truncated page.
 */
export function listLocalizationAssessmentGrid(
  filter: ListLocalizationAssessmentGridFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<LocalizationAssessmentGridCell[]>> {
  return getJson(
    `/localization-assessment-grid${buildQueryString({ ...filter })}`,
    LocalizationAssessmentGridCellSchema.array(),
    options,
  );
}

/**
 * Ask for one product's pathway narrative and capital band.
 *
 * ⚠️ **A 202 IS NOT A RESULT.** Success here means a job is QUEUED — the pathway does not
 * exist yet and neither does the capital figure. The response carries `narrativeStatus` and
 * nothing else precisely so a caller cannot render acceptance as an answer; poll
 * `getImportCommodity` for the real thing.
 *
 * NOT IDEMPOTENCY-KEYED FROM HERE, and that is deliberate rather than an omission: the
 * BACKEND keys the job on the assessment id, which is the natural key — the same key
 * `recompute-localization-assessments` uses — so a double-click, a retry and the nightly
 * recompute all collapse into one job. A client-minted key would create a second.
 *
 * A `200` rather than a `202` means it was already written and no model call was spent.
 */
export function requestPathwayNarrative(
  assessmentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayRequestAccepted>> {
  return sendJson(
    `/localization-assessments/${encodeURIComponent(assessmentId)}/pathway`,
    "POST",
    // No body. The assessment is named by the path and there is nothing else to say.
    undefined,
    PathwayRequestAcceptedSchema,
    options,
  );
}

/**
 * The countries that have trade data, with how much.
 *
 * Unpaginated: the ceiling is the number of countries ingested. An EMPTY array means nothing
 * has been synced, which a picker should say plainly rather than falling back to the region
 * taxonomy and offering countries with nothing behind them.
 */
export function listImportReporters(
  options?: RequestOptions,
): Promise<ActionResponse<ImportReporter[]>> {
  return getJson("/import-reporters", ImportReporterSchema.array(), options);
}

/** The chip vocabulary. Server-owned, so a new commodity kind appears without a deploy. */
export function listImportCommodityKinds(
  options?: RequestOptions,
): Promise<ActionResponse<ImportCommodityKindOption[]>> {
  return getJson("/import-commodity-kinds", ImportCommodityKindOptionSchema.array(), options);
}
