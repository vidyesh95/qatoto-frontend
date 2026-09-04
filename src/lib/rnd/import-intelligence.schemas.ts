import { z } from "zod";

// §20 import intelligence: `GET /import-commodities`, `/import-commodities/:hsCode`,
// `…/trade-flows`, `…/substitutes`, `/localization-assessments` and
// `/import-commodity-kinds`. Mirrors `import-intelligence.service.ts`.
//
// EVERY VALUE HERE WAS READ OFF THE BACKEND, not off a design document. Two of them are
// worth pointing at because they were only settled by ingesting six years of live data:
//
//   importQuantityUnit   TWELVE values, not ten. Codes 9 (`1000u`) and 10 (`U (jeu/pack)`)
//                        appeared only after 2019-2024 was ingested — the client skipped
//                        them and said so rather than guessing, which is how they surfaced.
//   commodityKind        SIXTEEN, one per HS section grouping. Derived from the chapter,
//                        never free text and never client-supplied.
//
// Every object schema ends `.strip()`, so a field a backend minor release adds is ignored
// rather than fatal.

/**
 * What kind of thing a commodity is, derived from its HS chapter by the backend's
 * `hs-chapter-map.ts`.
 *
 * `precious_material` is split out because gold and diamonds distort any ranking they
 * enter — $57bn of unwrought gold is India's second-largest 2024 import line and is not a
 * manufacturing opportunity in any useful sense.
 */
export const IMPORT_COMMODITY_KINDS = [
  "agricultural_product",
  "food_product",
  "mineral_ceramic",
  "energy_fuel",
  "chemical",
  "pharmaceutical",
  "plastic_rubber",
  "wood_paper",
  "textile_leather",
  "precious_material",
  "metal",
  "machinery",
  "electronic_subassembly",
  "transport_equipment",
  "precision_instrument",
  "other_manufactured",
] as const;
export const ImportCommodityKindSchema = z.enum(IMPORT_COMMODITY_KINDS);
export type ImportCommodityKind = z.infer<typeof ImportCommodityKindSchema>;

/**
 * The unit a traded quantity is measured in.
 *
 * `not_applicable` is Comtrade's own `-1`: the commodity is traded by VALUE ALONE and
 * there is no quantity to state. That is a fact about the commodity, NOT a missing
 * measurement, and it must never render as "unknown" — 4,219 of the 60,550 ingested rows
 * carry it.
 */
export const IMPORT_QUANTITY_UNITS = [
  "not_applicable",
  "square_metres",
  "thousand_kilowatt_hours",
  "metres",
  "units",
  "pairs",
  "litres",
  "kilograms",
  "thousand_units",
  "packs",
  "cubic_metres",
  "carats",
] as const;
export const ImportQuantityUnitSchema = z.enum(IMPORT_QUANTITY_UNITS);
export type ImportQuantityUnit = z.infer<typeof ImportQuantityUnitSchema>;

export const TRADE_FLOW_KINDS = ["import", "export"] as const;
export const TradeFlowKindSchema = z.enum(TRADE_FLOW_KINDS);
export type TradeFlowKind = z.infer<typeof TradeFlowKindSchema>;

export const TRADE_PERIOD_KINDS = ["annual", "monthly"] as const;
export const TradePeriodKindSchema = z.enum(TRADE_PERIOD_KINDS);

export const DOMESTIC_SUBSTITUTE_KINDS = [
  "direct_material_substitute",
  "alternative_material",
  "domestic_component",
  "process_change",
] as const;
export const DomesticSubstituteKindSchema = z.enum(DOMESTIC_SUBSTITUTE_KINDS);
export type DomesticSubstituteKind = z.infer<typeof DomesticSubstituteKindSchema>;

/** Ordered, and the order is scored: `mature` pays the full component, `lab_scale` least. */
export const DOMESTIC_SUBSTITUTE_MATURITIES = [
  "lab_scale",
  "pilot_scale",
  "commercial",
  "mature",
] as const;
export const DomesticSubstituteMaturitySchema = z.enum(DOMESTIC_SUBSTITUTE_MATURITIES);
export type DomesticSubstituteMaturity = z.infer<typeof DomesticSubstituteMaturitySchema>;

/**
 * Whether the LLM pathway narrative has been written.
 *
 * `skipped_unconfigured` means the backend has no model key. It is NOT a failure and must
 * not render as one — the score beside it is real and complete.
 */
export const LOCALIZATION_NARRATIVE_STATUSES = [
  "pending",
  "generated",
  "skipped_unconfigured",
  "failed",
] as const;
export const LocalizationNarrativeStatusSchema = z.enum(LOCALIZATION_NARRATIVE_STATUSES);
export type LocalizationNarrativeStatus = z.infer<typeof LocalizationNarrativeStatusSchema>;

export const LOCALIZATION_PATHWAY_STATUSES = ["open", "accepted", "dismissed"] as const;
export const LocalizationPathwayStatusSchema = z.enum(LOCALIZATION_PATHWAY_STATUSES);
export type LocalizationPathwayStatus = z.infer<typeof LocalizationPathwayStatusSchema>;

/** One HS6 commodity. `hsCode` is six digits and is the URL identity — never a slug. */
export const ImportCommoditySchema = z
  .object({
    hsCode: z.string(),
    displayLabel: z.string(),
    descriptionText: z.string().nullable(),
    commodityKind: ImportCommodityKindSchema,
    researchCategoryId: z.string(),
    researchCategorySlug: z.string(),
    defaultQuantityUnit: ImportQuantityUnitSchema,
  })
  .strip();
export type ImportCommodity = z.infer<typeof ImportCommoditySchema>;

/**
 * One country's traded value for one commodity in one period and direction.
 *
 * ⚠️ `tradeValueInCents` IS A DECIMAL STRING, not a number. India's 2024 petroleum line is
 * 14,153,232,225,252 cents — a `bigint` on the backend, and a JSON number the client would
 * have to round. Parse it with `BigInt`, never `Number`.
 *
 * ⚠️ `netWeightMilliKilograms` and `quantityMilli` are NULLABLE and null is not zero. 3,521
 * of the 60,550 ingested rows carry no weight at all: nobody filed one. A zero would say
 * the shipment weighed nothing.
 */
export const CommodityTradeFlowSchema = z
  .object({
    id: z.string(),
    flowKind: TradeFlowKindSchema,
    periodKind: TradePeriodKindSchema,
    periodStartsDate: z.string(),
    periodEndsDate: z.string(),
    tradeValueInCents: z.string(),
    currency: z.string(),
    netWeightMilliKilograms: z.string().nullable(),
    quantityMilli: z.string().nullable(),
    quantityUnit: ImportQuantityUnitSchema,
    reporterCountryCode: z.string().nullable(),
    reporterRegionSlug: z.string(),
    // Estimation provenance. A mirrored estimate and a reported figure are both legitimate
    // data and are not the same claim, so the surface must be able to say which it shows.
    isReported: z.boolean(),
    isAggregate: z.boolean(),
    isNetWeightEstimated: z.boolean(),
    isQuantityEstimated: z.boolean(),
    sourceName: z.string(),
    sourceUrl: z.string().nullable(),
    sourceRetrievedAt: z.string(),
  })
  .strip();
export type CommodityTradeFlow = z.infer<typeof CommodityTradeFlowSchema>;

/**
 * A published domestic substitute.
 *
 * `supplierCapabilitySlug` NULL is a real finding, not a gap — no capability in the curated
 * §11i vocabulary covers this substitute yet, and the surface says so.
 */
export const DomesticSubstituteSchema = z
  .object({
    id: z.string(),
    hsCode: z.string(),
    regionSlug: z.string(),
    substituteKind: DomesticSubstituteKindSchema,
    substituteLabel: z.string(),
    substituteNotes: z.string().nullable(),
    supplierCapabilitySlug: z.string().nullable(),
    maturityLevel: DomesticSubstituteMaturitySchema,
    evidenceSourceName: z.string().nullable(),
    evidenceSourceUrl: z.string().nullable(),
    publishedAt: z.string().nullable(),
  })
  .strip();
export type DomesticSubstitute = z.infer<typeof DomesticSubstituteSchema>;

/**
 * The AI pathway narrative.
 *
 * ⚠️ `confidenceBps` NULL means NO CONFIDENCE WAS RECORDED. It is not zero confidence, and
 * rendering it as 0% would publish a judgement the model declined to make. Provenance
 * (`modelName`, `promptVersion`) is NOT NULL and is always shown — a machine opinion whose
 * origin is hidden reads as a platform ruling.
 */
export const LocalizationPathwaySuggestionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    bodyText: z.string(),
    status: LocalizationPathwayStatusSchema,
    modelName: z.string(),
    modelVersion: z.string().nullable(),
    promptVersion: z.string(),
    confidenceBps: z.number().nullable(),
    asOf: z.string(),
    decidedAt: z.string().nullable(),
    decisionNote: z.string().nullable(),
  })
  .strip();
export type LocalizationPathwaySuggestion = z.infer<typeof LocalizationPathwaySuggestionSchema>;

/**
 * One nightly feasibility assessment.
 *
 * The five component fields sum to `feasibilityScorePoints` — a database CHECK guarantees
 * it, so the UI renders "27 of 35" without re-deriving anything.
 *
 * ⚠️ `medianSupplierLeadTimeDays` NULL is "no supplier published one", never zero days.
 */
export const LocalizationAssessmentSchema = z
  .object({
    id: z.string(),
    hsCode: z.string(),
    commodityLabel: z.string(),
    commodityKind: ImportCommodityKindSchema,
    regionSlug: z.string(),
    regionCountryCode: z.string().nullable(),
    feasibilityScorePoints: z.number(),
    rank: z.number(),
    trendDirection: z.enum(["up", "down", "flat"]),
    previousFeasibilityScorePoints: z.number().nullable(),
    importDependencyPoints: z.number(),
    exportCapabilityPoints: z.number(),
    substituteAvailabilityPoints: z.number(),
    supplierCapacityPoints: z.number(),
    leadTimeAdvantagePoints: z.number(),
    observedImportValueInCents: z.string(),
    observedExportValueInCents: z.string(),
    currency: z.string(),
    substituteCount: z.number(),
    matchedSupplierCount: z.number(),
    verifiedSupplierCount: z.number(),
    medianSupplierLeadTimeDays: z.number().nullable(),
    narrativeStatus: LocalizationNarrativeStatusSchema,
    scoreAlgorithmVersion: z.number(),
    asOf: z.string(),
  })
  .strip();
export type LocalizationAssessment = z.infer<typeof LocalizationAssessmentSchema>;

/**
 * One cell of the score grid: how many commodities scored this exact pair of components.
 *
 * ⚠️ THE SAME POPULATION AS THE LEADERBOARD ABOVE, COUNTED RATHER THAN LISTED. The two share
 * one `where` clause server-side, so `sum(commodityCount)` equals the leaderboard's
 * `pagination.total` — 5,469 for India today, across 67 of the 81 possible cells.
 *
 * WHY A SEPARATE READ EXISTS AT ALL. A ranked list's first page is by construction the
 * top-right corner of the score space; plotting it draws the answer and hides the question.
 * Both axes are nine-rung ladders, so this is the COMPLETE distribution in at most 81 rows —
 * no sampling, no paging, and no `limit` to get wrong.
 */
export const LocalizationAssessmentGridCellSchema = z
  .object({
    importDependencyPoints: z.number(),
    exportCapabilityPoints: z.number(),
    commodityCount: z.number(),
    asOf: z.string(),
  })
  .strip();
export type LocalizationAssessmentGridCell = z.infer<typeof LocalizationAssessmentGridCellSchema>;

/** The grid's filters. No `page`/`limit` — the result is bounded by the ladders. */
export interface ListLocalizationAssessmentGridFilter {
  readonly reporterCountryCode?: string;
  readonly commodityKind?: ImportCommodityKind;
}

/**
 * The commodity detail payload.
 *
 * ⚠️ `assessment` IS NULLABLE AND THAT IS NOT A 404. The commodity read decides whether the
 * page exists; a null assessment means nothing has scored this commodity yet. "Not scored"
 * and "no such commodity" are different facts and the page tells them apart.
 */
export const ImportCommodityDetailSchema = z
  .object({
    commodity: ImportCommoditySchema,
    assessment: LocalizationAssessmentSchema.nullable(),
    pathwaySuggestions: LocalizationPathwaySuggestionSchema.array(),
  })
  .strip();
export type ImportCommodityDetail = z.infer<typeof ImportCommodityDetailSchema>;

/**
 * One country that actually has trade data.
 *
 * ⚠️ THIS IS NOT THE COUNTRY TAXONOMY. `discovery_region` seeds eighteen countries and only the
 * ones ingested appear here — a picker built off the taxonomy would offer seventeen dead ends.
 * The counts ride along so a chip can say how much is behind it before it is clicked.
 */
export const ImportReporterSchema = z
  .object({
    countryCode: z.string(),
    regionSlug: z.string(),
    displayLabel: z.string(),
    commodityCount: z.number(),
    flowCount: z.number(),
    earliestPeriodYear: z.number(),
    latestPeriodYear: z.number(),
  })
  .strip();
export type ImportReporter = z.infer<typeof ImportReporterSchema>;

/** The chip vocabulary. A bare `{ kind }` per value, so the list is server-owned. */
export const ImportCommodityKindOptionSchema = z
  .object({ kind: ImportCommodityKindSchema })
  .strip();
export type ImportCommodityKindOption = z.infer<typeof ImportCommodityKindOptionSchema>;

// --- Filters. Plain readonly interfaces rather than Zod: they are built by this client
// --- and go OUT, so there is nothing untrusted to parse.

export interface ListImportCommoditiesFilter {
  readonly commodityKind?: ImportCommodityKind;
  readonly categoryId?: string;
  readonly reporterCountryCode?: string;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface ListTradeFlowsFilter {
  readonly flowKind?: TradeFlowKind;
  readonly reporterCountryCode?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface ListSubstitutesFilter {
  readonly regionCountryCode?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface ListLocalizationAssessmentsFilter {
  readonly reporterCountryCode?: string;
  readonly commodityKind?: ImportCommodityKind;
  readonly page?: number;
  readonly limit?: number;
}
