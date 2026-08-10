// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the manufacturer directory: the two public reads under `/store/factories`,
// the manufacturing-inquiry lifecycle under `/commerce/factories/inquiries/*`, the three
// seller-side whole-object PUTs on `/commerce/organizations/:organizationId/*`, and the staff
// site-audit routes under `/commerce/admin/*`. `STORE_BACKEND_STRUCTURE.md` §6.6 and §16.
//
// THE BACKEND SHIPPED THIS (Phase 17, migrations `0099`–`0101`) and it did NOT ship the contract
// this file first proposed. Three conflicts were resolved against our version (§16.2) and one
// field was added beyond it; all four are marked in place below. `factories.api.ts` is still
// mock-backed, so the fixtures behind these schemas are parsed through them exactly as a real
// payload would be, and wiring stays a one-line swap per call.
//
// `catalog.schemas.ts` records the temptation this surface creates and forbids it — do NOT
// synthesise this directory by searching products and grouping by seller, which would rank a
// manufacturer by whichever of its listings happened to match a keyword. §16.1 forbids the other
// direction too: a factory is a PROJECTION over the Phase 12 seller profile, never a parallel
// entity, because two capability lists for one organization can disagree and the disagreement is
// the bug.
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
 *
 * THIS TUPLE IS THE UNION OF TWO VOCABULARIES, and that is the resolution of §16.2's first
 * conflict rather than an accident. Phase 12 had already collected rows against `oem`, `odm`,
 * `customization`, `in_house_inspection`, `in_house_rnd` and `sample_production`; this file
 * proposed a different six. The backend widened its enum additively (`ALTER TYPE … ADD VALUE`, no
 * data migration) and we widen to match, so both sets of rows stay readable.
 *
 * `customization` AND `private_label` ARE NOT THE SAME THING and must never be merged:
 * customization is "we will change this product for you", private label is "we will put your name
 * on ours". A factory frequently does one and refuses the other.
 */
export const FACTORY_CAPABILITY_KINDS = [
  "odm",
  "oem",
  "contract_manufacturing",
  "private_label",
  "tooling_and_moulds",
  "assembly",
  "customization",
  "in_house_inspection",
  "in_house_rnd",
  "sample_production",
] as const;

export type FactoryCapabilityKind = (typeof FACTORY_CAPABILITY_KINDS)[number];

/**
 * The certifications a buyer filters on.
 *
 * A CLOSED SET, deliberately, even though a factory may hold others. An open string field here
 * would make the filter chips unbuildable and let two spellings of one standard sit side by side.
 *
 * §16.2's second conflict resolved to BOTH being right, and the backend built the split: this
 * tuple is `commerce_organization_certification.standardCode`, a nullable column over a seeded
 * enum, and the free-text `standardName` rides beside it as the display string. The filter reads
 * the code; a standard outside these eight carries a null code and arrives on the detail read in
 * `otherCertifications[]` instead, where it is read rather than matched. The vocabulary of
 * certification is the world's, and no enum will ever finish enumerating it.
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
    /**
     * The certificate's own display string, free text.
     *
     * NOT DERIVABLE FROM `certification`. `FACTORY_CERTIFICATION_LABELS` gives the standard a
     * short name for a chip; this is what the paper actually says, which is frequently longer and
     * carries a revision year. Render this where there is room and the label where there is not.
     */
    standardName: z.string(),
    certificateNumber: z.string().nullable(),
    issuingBody: z.string().nullable(),
    validFrom: IsoDateSchema.nullable(),
    validUntil: IsoDateSchema.nullable(),
  })
  .strip();

/**
 * An approved certificate whose standard is outside the closed eight.
 *
 * THE ONE FIELD THE BACKEND ADDED BEYOND THIS CONTRACT (Phase 17). `FactoryCertificationRecord`
 * cannot hold these — its `certification` field is a closed enum — and dropping them would mean
 * the platform silently refusing to show a valid certificate somebody paid an auditor for. They
 * carry no `certification` code, so they are readable and never filterable.
 *
 * Same expiry rule as the records above: `validUntil` null means no expiry was recorded, not
 * valid forever.
 */
export const FactoryOtherCertificationSchema = z
  .object({
    standardName: z.string(),
    certificateNumber: z.string().nullable(),
    issuingBody: z.string().nullable(),
    validFrom: IsoDateSchema.nullable(),
    validUntil: IsoDateSchema.nullable(),
  })
  .strip();

/**
 * One physical site. A factory may run several, in more than one country.
 *
 * `floorAreaSquareMetres` HERE AND `factoryAreaSquareMetres` ON THE ORG ARE BOTH SELLER-DECLARED
 * AND MAY DISAGREE. When they do, the read publishes both and the renderer shows both (§16.3). Do
 * not sum these into an org total and do not prefer one over the other — a platform that silently
 * reconciles them is asserting something neither party said.
 */
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
    /** Approved certificates outside the closed eight. Readable, never filterable. */
    otherCertifications: z.array(FactoryOtherCertificationSchema),
    sites: z.array(FactorySiteSchema),
    samplePolicy: FactorySamplePolicySchema,
    /**
     * ISO date of the most recent site audit, or `null` when nobody has been.
     *
     * A DATE AND NOTHING ELSE. `commerce_organization_site_audit` carries the auditor's identity
     * and the scope covered, and this read projects neither: publishing an auditor's name on a
     * browse page is a disclosure about a third party who never consented to it (§6.6).
     *
     * `site_audited` IS NEVER DERIVED FROM `documents_reviewed`. The backend's
     * `deriveVerificationState` reads the audit record first and falls through to the document
     * review only when there is no audit — it never turns one into the other, which is the precise
     * collapse the three-state enum exists to prevent.
     */
    lastAuditedAt: IsoDateSchema.nullable(),
    /**
     * ISO country codes this factory has actually shipped to. Empty is a fact, not a gap.
     *
     * DERIVED, NOT DECLARED (Phase 17 decided this). The backend computes it from distinct
     * delivery-address country codes over completed orders where this factory is the
     * counterparty. There is no column and no seller can edit it, which is why it appears on no
     * write input in this file. A13's rule is what forces the choice: a derived stat and a
     * declared stat must be visibly different on the wire, so this one must never be rendered
     * beside declared figures as though the factory typed it.
     */
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

// --- The inquiry lifecycle --------------------------------------------------
//
// `GET /commerce/factories/inquiries/mine`, `…/received`, `…/:inquiryId`, and the three
// transitions `send`, `answer`, `close` (§6.6).
//
// WITHOUT THESE A CREATE IS A WRITE INTO A HOLE — §16.5's phrase, and the reason
// `useCreateFactoryInquiry` used to invalidate nothing. A buyer who posts a `draft` and has no
// list to read it back from never learns the inquiry exists.

/**
 * One manufacturing inquiry, as both parties read it.
 *
 * ONE ROW SHAPE FOR THREE READS. `/mine` is the buyer's, `/received` is the factory's queue and
 * `/:inquiryId` serves either party, and none of them projects a different set of columns — a
 * second shape would be a second place for the two sides to disagree about what was asked.
 *
 * `/received` NEVER CONTAINS A `draft`. Creating notifies nobody, so a factory that could see
 * drafts would be reading mail nobody posted.
 */
export const FactoryInquirySchema = z
  .object({
    id: z.string(),
    /** A human-quotable handle — the thing a buyer reads out on a call. */
    reference: z.string(),
    state: z.enum(FACTORY_INQUIRY_STATES),
    factoryOrganizationId: z.string(),
    factorySlug: z.string(),
    factoryDisplayName: z.string(),
    buyerOrganizationId: z.string(),
    buyerDisplayName: z.string(),
    capabilityKind: z.enum(FACTORY_CAPABILITY_KINDS),
    productDescription: z.string(),
    estimatedAnnualQuantity: z.number().int().nullable(),
    unitLabel: z.string().nullable(),
    targetUnitPriceInCents: z.number().int().nullable(),
    currency: z.string().nullable(),
    requiredCertifications: z.array(z.enum(FACTORY_CERTIFICATIONS)),
    desiredFirstDeliveryAt: IsoDateSchema.nullable(),
    notes: z.string().nullable(),
    /**
     * The one-to-one thread opened by `send`, or `null` while the inquiry is still a draft.
     *
     * ONE-TO-ONE BY DEFINITION (§16.5). An RFQ thread has every invited provider in it; folding a
     * manufacturing inquiry into that shape would expose one seller's conversation to its
     * competitors.
     */
    threadId: z.string().nullable(),
    /** Set by `send`. `null` while `draft`, and a renderer must not print "sent" without it. */
    sentAt: IsoDateTimeSchema.nullable(),
    answeredAt: IsoDateTimeSchema.nullable(),
    closedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export const FactoryInquiryListPageSchema = cursorPageOf(FactoryInquirySchema);

/** `GET /commerce/factories/inquiries/:inquiryId` — the same row, unwrapped from a page. */
export const FactoryInquiryDetailSchema = z.object({ inquiry: FactoryInquirySchema }).strip();

/**
 * The query `/mine` and `/received` send.
 *
 * `state` IS ACCEPTED HERE AND NOWHERE PUBLIC. These are a participant's own records, so filtering
 * them by lifecycle is bookkeeping rather than merchandising.
 */
export interface ListFactoryInquiriesFilter {
  readonly state?: FactoryInquiryState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST …/inquiries/:inquiryId/close` — either party, from any state but `closed`.
 *
 * The reason is optional because a buyer who simply changed their mind owes nobody an explanation,
 * and a required field there would collect fiction.
 */
export interface CloseFactoryInquiryInput {
  readonly reason?: string;
}

// --- Seller-side profile writes ---------------------------------------------
//
// `PUT /commerce/organizations/:organizationId/{production-lines,sites,factory-terms}` (§6.6).
//
// ALL THREE ARE WHOLE-OBJECT PUTS, NOT PATCHES, and for the two lists that is what "replace the
// whole named list" means: the body IS the new list, an omitted row is a deletion, and order is
// the array's order. A per-row endpoint would need intermediate positions that violate the
// server's unique `(organizationId, position)` index mid-transaction — the same argument the
// category reorder makes.

/** One line as the seller states it. No `id`: the list is replaced, not edited row by row. */
export interface FactoryProductionLineInput {
  readonly name: string;
  readonly processSummary: string;
  /** Nullable, and `unitLabel` is required beside it — a capacity with no unit is uncomparable. */
  readonly monthlyCapacityUnits?: number;
  readonly unitLabel: string;
}

export interface ReplaceProductionLinesInput {
  readonly productionLines: readonly FactoryProductionLineInput[];
}

export interface FactorySiteInput {
  readonly label: string;
  readonly countryCode: string;
  readonly locality?: string;
  readonly floorAreaSquareMetres?: number;
  readonly productionStaffCount?: number;
}

export interface ReplaceFactorySitesInput {
  readonly sites: readonly FactorySiteInput[];
}

/**
 * `PUT …/factory-terms` — sample policy, order bounds and the inbox switch, in one object.
 *
 * NOT PART OF THE SELLER-PROFILE PATCH AND NOT A PARTIAL ONE, because both its invariants are
 * CROSS-FIELD (§6.6): a sample fee is only meaningful when samples are offered, and an MOQ is only
 * readable beside its unit. A partial patch could validate neither without first reading the
 * stored row and merging, which is a race.
 *
 * `sampleFeeInCents` OMITTED MEANS UNSTATED AND `0` MEANS FREE. The form must offer those as two
 * different answers, because a buyer who reads an unstated fee as free finds out at invoice time.
 */
export interface UpdateFactoryTermsInput {
  readonly offersSamples: boolean;
  readonly sampleLeadTimeDays?: number;
  readonly sampleFeeInCents?: number;
  readonly currency: string;
  readonly minimumOrderQuantity?: number;
  readonly minimumOrderQuantityUnitLabel?: string;
  readonly minimumLeadTimeDays?: number;
  readonly maximumLeadTimeDays?: number;
  /** The inbox switch. `false` means the directory row shows the factory is not taking inquiries. */
  readonly acceptingInquiries: boolean;
}

/** What the three PUTs answer with — the stored terms, read back. */
export const FactoryTermsSchema = z
  .object({
    organizationId: z.string(),
    samplePolicy: FactorySamplePolicySchema,
    minimumOrderQuantity: z.number().int().nullable(),
    minimumOrderQuantityUnitLabel: z.string().nullable(),
    minimumLeadTimeDays: z.number().int().nullable(),
    maximumLeadTimeDays: z.number().int().nullable(),
    acceptingInquiries: z.boolean(),
  })
  .strip();

export const FactoryProductionLineListSchema = z
  .object({ productionLines: z.array(FactoryProductionLineSchema) })
  .strip();

export const FactorySiteListSchema = z.object({ sites: z.array(FactorySiteSchema) }).strip();

// --- Staff site audits ------------------------------------------------------
//
// `GET|POST /commerce/admin/organizations/:organizationId/site-audits` and
// `POST /commerce/admin/site-audits/:auditId/withdraw`, gated by `moderate_commerce` (§6.6).
//
// THIS RECORD IS WHY `site_audited` EXISTS AT ALL. Before Phase 17 the state asserted that
// somebody had stood in the building with nothing behind it;
// `commerce_organization_verification` covers registration, tax, identity, address and bank
// account — paperwork, all of it. The resolution was to build the record rather than drop the
// state (§16.2 conflict 3), and it carries a NOT NULL audit entry so every row names an
// accountable human.

export const FACTORY_SITE_AUDIT_STATES = ["recorded", "withdrawn"] as const;

export type FactorySiteAuditState = (typeof FACTORY_SITE_AUDIT_STATES)[number];

/**
 * One audit, as staff read it.
 *
 * NONE OF THIS REACHES THE PUBLIC DETAIL READ except the date, as `lastAuditedAt`. The auditor and
 * the sites covered are a disclosure about third parties.
 */
export const FactorySiteAuditSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    state: z.enum(FACTORY_SITE_AUDIT_STATES),
    auditedAt: IsoDateSchema,
    auditorName: z.string(),
    scopeSummary: z.string(),
    /** Ids from `FactorySite`. Empty means the audit covered the organization, not a named site. */
    coveredSiteIds: z.array(z.string()),
    /** Names the accountable human. NOT NULL on the backend, so never null here. */
    auditEntryId: z.string(),
    withdrawnAt: IsoDateTimeSchema.nullable(),
    /** Required by the withdraw route, so it is present whenever `withdrawnAt` is. */
    withdrawnReason: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export const FactorySiteAuditListSchema = z
  .object({ audits: z.array(FactorySiteAuditSchema) })
  .strip();

/** `POST …/site-audits`. Requires an `Idempotency-Key` — a retry without one audits twice. */
export interface RecordSiteAuditInput {
  readonly auditedAt: string;
  readonly auditorName: string;
  readonly scopeSummary: string;
  readonly coveredSiteIds?: readonly string[];
}

/**
 * `POST /commerce/admin/site-audits/:auditId/withdraw`.
 *
 * THE REASON IS REQUIRED, unlike the inquiry close above. Retracting an audit removes a platform
 * claim a buyer may have relied on, and a retraction nobody has to justify is one nobody can
 * review.
 */
export interface WithdrawSiteAuditInput {
  readonly reason: string;
}

// --- Inferred types ---------------------------------------------------------

export type FactoryCard = z.infer<typeof FactoryCardSchema>;
export type FactoryDirectoryPage = z.infer<typeof FactoryDirectoryPageSchema>;
export type FactoryProductionLine = z.infer<typeof FactoryProductionLineSchema>;
export type FactoryCertificationRecord = z.infer<typeof FactoryCertificationRecordSchema>;
export type FactoryOtherCertification = z.infer<typeof FactoryOtherCertificationSchema>;
export type FactorySite = z.infer<typeof FactorySiteSchema>;
export type FactorySamplePolicy = z.infer<typeof FactorySamplePolicySchema>;
export type FactoryDetail = z.infer<typeof FactoryDetailSchema>;
export type CreatedFactoryInquiry = z.infer<typeof CreatedFactoryInquirySchema>;
export type FactoryInquiry = z.infer<typeof FactoryInquirySchema>;
export type FactoryInquiryListPage = z.infer<typeof FactoryInquiryListPageSchema>;
export type FactoryTerms = z.infer<typeof FactoryTermsSchema>;
export type FactorySiteAudit = z.infer<typeof FactorySiteAuditSchema>;

// --- Display maps -----------------------------------------------------------

export const FACTORY_CAPABILITY_LABELS: Record<FactoryCapabilityKind, string> = {
  odm: "ODM — they design it",
  oem: "OEM — they build your design",
  contract_manufacturing: "Contract manufacturing",
  private_label: "Private label — your name on their product",
  tooling_and_moulds: "Tooling & moulds",
  assembly: "Assembly",
  customization: "Customization — they change their product for you",
  in_house_inspection: "In-house inspection",
  in_house_rnd: "In-house R&D",
  sample_production: "Sample production",
};

/** The short form, for chips on a card where the explanatory clause will not fit. */
export const FACTORY_CAPABILITY_SHORT_LABELS: Record<FactoryCapabilityKind, string> = {
  odm: "ODM",
  oem: "OEM",
  contract_manufacturing: "Contract mfg",
  private_label: "Private label",
  tooling_and_moulds: "Tooling",
  assembly: "Assembly",
  customization: "Customization",
  in_house_inspection: "In-house QC",
  in_house_rnd: "In-house R&D",
  sample_production: "Samples",
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

/**
 * Copy for a site audit, on the staff console only.
 *
 * "Recorded", NOT "verified" or "passed". This row says an audit happened and who did it. Whether
 * the factory is any good at the thing you want made is not what it claims.
 */
export const FACTORY_SITE_AUDIT_STATE_LABELS: Record<FactorySiteAuditState, string> = {
  recorded: "Recorded",
  withdrawn: "Withdrawn",
};
