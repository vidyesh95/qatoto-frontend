// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the manufacturer directory: `GET /store/factories`,
// `GET /store/factories/:factorySlug` and `POST /commerce/factories/:factorySlug/inquiries`.
//
// NO BACKEND EXISTS FOR ANY OF THE THREE YET. `STORE_BACKEND_STRUCTURE.md` A25 records the gap in
// one sentence: "a seller organization is not a search document, so there is no supplier directory".
// `catalog.schemas.ts` records the specific temptation that gap creates and forbids it — do NOT
// synthesise this directory by searching products and grouping by seller, which would rank a
// manufacturer by whichever of its listings happened to match a keyword.
//
// So this file is a PROPOSED CONTRACT, written first, and the fixtures behind it are parsed through
// it exactly as a real payload would be. When the endpoints land, the schemas are what they are
// checked against, and the only edit is in `factories.api.ts`.
//
// THREE RULES ENCODED HERE, each one a thing the UI must not be able to say:
//
//  1. `verificationState` IS ABOUT THE ORGANIZATION, NEVER ABOUT A CAPABILITY. `site_audited` means
//     somebody visited a site. It does not mean this factory is approved to do injection moulding,
//     and there is no per-capability approval on the wire at all. The label map below says
//     "documents"/"site" in every string for the same reason `PROVIDER_VERIFICATION_LABELS` says
//     "profile" in every string. Never render a bare tick.
//
//  2. A CERTIFICATION IS A CLAIM WITH AN EXPIRY, NOT A BADGE. `FactoryCertificationRecord` carries
//     the validity window and the issuing body precisely so a lapsed ISO 9001 can render as lapsed.
//     A card shows the certification NAME; only the detail read knows whether it is still valid.
//
//  3. EVERY MEASURED FIGURE IS NULLABLE AND NULL IS NOT ZERO. An unmeasured on-time rate means the
//     sample was too small, not that the factory ships late. Renderers must print the sample size
//     instead of a percentage — never `0%`.

import { z } from "zod";

import { cursorPageOf, IsoDateSchema, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------
//
// snake_case, and they stay snake_case. These are future `pgEnum` labels sent verbatim in both
// directions — `?capabilityKind=contract_manufacturing` in the query and `"contract_manufacturing"`
// in the body. Kebab-casing one would be a 422 against a `.strict()` query schema, not an ignored
// value (CLAUDE.md wire-casing rule).

/**
 * What a manufacturer will actually do for you.
 *
 * `odm` and `oem` are the two the tile advertises and they are DIFFERENT PROPOSITIONS: an ODM
 * designs the product and sells you the design, an OEM builds to a design you already own. A buyer
 * arriving with drawings and a buyer arriving with an idea need different rows, so they are two
 * members rather than one "manufacturing" catch-all.
 */
export const FACTORY_CAPABILITY_KINDS = [
  "odm",
  "oem",
  "contract_manufacturing",
  "private_label",
  "tooling_and_moulds",
  "assembly",
] as const;

export type FactoryCapabilityKind = (typeof FACTORY_CAPABILITY_KINDS)[number];

/**
 * The certifications a buyer filters on.
 *
 * A CLOSED SET, deliberately, even though a factory may hold others. An open string field here
 * would make the filter chips unbuildable and let two spellings of one standard sit side by side.
 * Anything outside the set rides in `FactoryCertificationRecord.issuingBody` as free text on the
 * detail read, where it is read rather than matched.
 */
export const FACTORY_CERTIFICATIONS = [
  "iso_9001",
  "iso_14001",
  "bsci",
  "sedex_smeta",
  "gots",
  "fsc",
  "ce_marking",
  "fda_registered",
] as const;

export type FactoryCertification = (typeof FACTORY_CERTIFICATIONS)[number];

/**
 * How far the platform has gone in checking this organization.
 *
 * THREE STATES, AND THE MIDDLE ONE IS NOT A BADGE. `documents_reviewed` means somebody read the
 * papers the factory uploaded; `site_audited` means somebody stood in the building. Collapsing them
 * into one "verified" would let a paper review carry the weight of an audit.
 */
export const FACTORY_VERIFICATION_STATES = [
  "unverified",
  "documents_reviewed",
  "site_audited",
] as const;

export type FactoryVerificationState = (typeof FACTORY_VERIFICATION_STATES)[number];

/**
 * Where an inquiry has got to.
 *
 * `POST …/inquiries` ALWAYS ANSWERS `draft`. Sending is a separate act with its own validation, the
 * same shape as an RFQ: creating a draft notifies nobody. The composer's success copy must not say
 * "sent".
 */
export const FACTORY_INQUIRY_STATES = ["draft", "sent", "answered", "closed"] as const;

export type FactoryInquiryState = (typeof FACTORY_INQUIRY_STATES)[number];

// --- Directory --------------------------------------------------------------

/**
 * One row in `/store/factories`.
 *
 * `capabilityKinds` IS PROJECTED HERE, unlike the provider directory — where the omission is a
 * known defect (`provider-directory-page.tsx` §1: "a row cannot say what it does"). Repeating that
 * mistake in a contract written from scratch would be choosing it.
 */
export const FactoryCardSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    publicSummary: z.string().nullable(),
    capabilityKinds: z.array(z.enum(FACTORY_CAPABILITY_KINDS)),
    /**
     * The smallest order this factory takes, and the unit it counts in.
     *
     * BOTH-OR-NEITHER. A bare `500` is unreadable — 500 pieces and 500 cartons are different
     * businesses — so a renderer must have the unit before it prints the number.
     */
    minimumOrderQuantity: z.number().int().nullable(),
    minimumOrderQuantityUnitLabel: z.string().nullable(),
    minimumLeadTimeDays: z.number().int().nullable(),
    maximumLeadTimeDays: z.number().int().nullable(),
    /** Names only. Validity lives on the detail read — see rule 2 in the header. */
    certifications: z.array(z.enum(FACTORY_CERTIFICATIONS)),
    verificationState: z.enum(FACTORY_VERIFICATION_STATES),
    acceptingInquiries: z.boolean(),
    fulfillmentMetrics: z
      .object({
        onTimeShipmentRate: z.number().nullable(),
        onTimeSampleSize: z.number().int(),
        completedOrderCount: z.number().int(),
      })
      .strip(),
  })
  .strip();

export const FactoryDirectoryPageSchema = cursorPageOf(FactoryCardSchema);

// --- Detail -----------------------------------------------------------------

/**
 * One production line, with the capacity it can hold.
 *
 * `monthlyCapacityUnits` is nullable and the unit is required beside it, for the same reason the
 * MOQ pair is: a capacity without a unit cannot be compared against an order.
 */
export const FactoryProductionLineSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    processSummary: z.string(),
    monthlyCapacityUnits: z.number().int().nullable(),
    unitLabel: z.string(),
  })
  .strip();

/**
 * One certification, with the window it is good for.
 *
 * `validUntil` NULLABLE means "no expiry recorded", NOT "valid forever". A renderer that cannot
 * tell the two apart will show a lapsed certificate as current, which on a compliance filter is the
 * whole ballgame. Dates are `YYYY-MM-DD` and are compared by string parts — never through
 * `new Date()`, which shifts a day for anyone west of UTC.
 */
export const FactoryCertificationRecordSchema = z
  .object({
    certification: z.enum(FACTORY_CERTIFICATIONS),
    certificateNumber: z.string().nullable(),
    issuingBody: z.string().nullable(),
    validFrom: IsoDateSchema.nullable(),
    validUntil: IsoDateSchema.nullable(),
  })
  .strip();

/** One physical site. A factory may run several, in more than one country. */
export const FactorySiteSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    countryCode: z.string(),
    locality: z.string().nullable(),
    floorAreaSquareMetres: z.number().int().nullable(),
    productionStaffCount: z.number().int().nullable(),
  })
  .strip();

/**
 * What the factory will do about samples.
 *
 * `sampleFeeInCents` OF `null` MEANS UNSTATED, AND `0` MEANS FREE. Two different facts, and the one
 * thing this surface must not do is render an unstated fee as free — a buyer who orders a sample on
 * that basis finds out at invoice time.
 */
export const FactorySamplePolicySchema = z
  .object({
    offersSamples: z.boolean(),
    sampleLeadTimeDays: z.number().int().nullable(),
    sampleFeeInCents: z.number().int().nullable(),
    currency: z.string(),
  })
  .strip();

/** `GET /store/factories/:factorySlug`. */
export const FactoryDetailSchema = z
  .object({
    factory: FactoryCardSchema,
    productionLines: z.array(FactoryProductionLineSchema),
    certificationRecords: z.array(FactoryCertificationRecordSchema),
    sites: z.array(FactorySiteSchema),
    samplePolicy: FactorySamplePolicySchema,
    /** ISO date of the most recent site audit, or `null` when nobody has been. */
    lastAuditedAt: IsoDateSchema.nullable(),
    /** ISO country codes this factory has actually shipped to. Empty is a fact, not a gap. */
    exportMarkets: z.array(z.string()),
  })
  .strip();

// --- Filter input -----------------------------------------------------------

/**
 * The query the directory sends.
 *
 * CAMELCASE KEYS, snake_case values. Every key here must exist on the endpoint's schema when it
 * lands — a `.strict()` query schema answers 422 for an unrecognized key rather than ignoring it,
 * which is the failure mode `providers.schemas.ts` documents at length after seven filters were
 * specified and one was built.
 */
export interface ListFactoriesFilter {
  readonly capabilityKind?: string;
  readonly countryCode?: string;
  readonly certification?: string;
  /** An upper bound on the factory's MOQ: "show me factories that will take an order this small". */
  readonly maxMinimumOrderQuantity?: number;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Write body: POST /commerce/factories/:factorySlug/inquiries ------------

/**
 * What a buyer sends to open a conversation with a factory.
 *
 * OPTIONAL FIELDS ARE `?: T` AND NOT NULLABLE — a blank input is OMITTED from the body, never sent
 * as `null`, `""` or `0`. `composer-input.ts` sets out why each of those would be worse than an
 * omission; the short version is that `0` for a blank target price asks the factory to work free.
 *
 * `capabilityKind` IS REQUIRED because it is the one thing that decides whether this inquiry is
 * answerable at all. A buyer who needs tooling and writes to an assembly-only shop should find that
 * out from the form, not from silence three weeks later.
 *
 * Requires an `Idempotency-Key`. A retry without one is a second inquiry in the factory's queue.
 */
export interface CreateFactoryInquiryInput {
  readonly capabilityKind: FactoryCapabilityKind;
  readonly productDescription: string;
  readonly estimatedAnnualQuantity?: number;
  readonly unitLabel?: string;
  readonly targetUnitPriceInCents?: number;
  readonly currency?: string;
  readonly requiredCertifications?: readonly FactoryCertification[];
  readonly desiredFirstDeliveryAt?: string;
  readonly notes?: string;
}

/**
 * What `POST …/inquiries` answers with: `201` and the raw inquiry row.
 *
 * `state` COMES BACK `draft`, ALWAYS. Same discipline as `CreatedServiceOffering` — the response is
 * the TABLE'S OWN COLUMNS, not a projection, so the success screen has no factory object to read
 * and must not pretend otherwise.
 */
export const CreatedFactoryInquirySchema = z
  .object({
    id: z.string(),
    /** A human-quotable handle — the thing a buyer reads out on a call. */
    reference: z.string(),
    factoryOrganizationId: z.string(),
    factorySlug: z.string(),
    state: z.enum(FACTORY_INQUIRY_STATES),
    capabilityKind: z.enum(FACTORY_CAPABILITY_KINDS),
    productDescription: z.string(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

// --- Inferred types ---------------------------------------------------------

export type FactoryCard = z.infer<typeof FactoryCardSchema>;
export type FactoryDirectoryPage = z.infer<typeof FactoryDirectoryPageSchema>;
export type FactoryProductionLine = z.infer<typeof FactoryProductionLineSchema>;
export type FactoryCertificationRecord = z.infer<typeof FactoryCertificationRecordSchema>;
export type FactorySite = z.infer<typeof FactorySiteSchema>;
export type FactorySamplePolicy = z.infer<typeof FactorySamplePolicySchema>;
export type FactoryDetail = z.infer<typeof FactoryDetailSchema>;
export type CreatedFactoryInquiry = z.infer<typeof CreatedFactoryInquirySchema>;

// --- Display maps -----------------------------------------------------------

export const FACTORY_CAPABILITY_LABELS: Record<FactoryCapabilityKind, string> = {
  odm: "ODM — they design it",
  oem: "OEM — they build your design",
  contract_manufacturing: "Contract manufacturing",
  private_label: "Private label",
  tooling_and_moulds: "Tooling & moulds",
  assembly: "Assembly",
};

/** The short form, for chips on a card where the explanatory clause will not fit. */
export const FACTORY_CAPABILITY_SHORT_LABELS: Record<FactoryCapabilityKind, string> = {
  odm: "ODM",
  oem: "OEM",
  contract_manufacturing: "Contract mfg",
  private_label: "Private label",
  tooling_and_moulds: "Tooling",
  assembly: "Assembly",
};

export const FACTORY_CERTIFICATION_LABELS: Record<FactoryCertification, string> = {
  iso_9001: "ISO 9001",
  iso_14001: "ISO 14001",
  bsci: "BSCI",
  sedex_smeta: "Sedex SMETA",
  gots: "GOTS",
  fsc: "FSC",
  ce_marking: "CE marking",
  fda_registered: "FDA registered",
};

/**
 * Copy for the organization-level verification state.
 *
 * SAYS WHAT WAS CHECKED, in every string. "Site audited by Qatoto" is a claim the platform can
 * stand behind; "Verified factory" is not, because nothing here verifies that the factory can make
 * the thing you want. See rule 1 in the header.
 */
export const FACTORY_VERIFICATION_LABELS: Record<FactoryVerificationState, string> = {
  unverified: "No documents reviewed",
  documents_reviewed: "Documents reviewed by Qatoto",
  site_audited: "Site audited by Qatoto",
};

export const FACTORY_INQUIRY_STATE_LABELS: Record<FactoryInquiryState, string> = {
  draft: "Draft — only your organization can see it",
  sent: "Sent to the factory",
  answered: "The factory replied",
  closed: "Closed",
};
