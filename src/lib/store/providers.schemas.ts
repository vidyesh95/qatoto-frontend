// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the connector marketplace: `GET /store/providers`,
// `GET /store/providers/:organizationSlug` and `GET /store/services/:offeringSlug`.
//
// Transcribed from `commerce-providers.service.ts` — `PublicProviderCard` (:143),
// `PublicCoverageProjection` (:178), `PublicOfferingCard` (:187) and
// `ServiceOfferingDetailProjection` (:72).
//
// THREE THINGS THIS FILE ENCODES, AND EACH ONE IS A RULE RATHER THAN A SHAPE:
//
//  1. THE DISCRIMINANT IS `detail.kind`, NOT `providerKind`. STORE_STRUCTURE §9.2's example
//     switches on `offering.providerKind` and is wrong: the typed extension is a SIBLING object,
//     so the read is `{offering, provider, detail, coverage}` and `detail.kind` is what selects the
//     arm. `providerKind` lives on the offering card and is the same value, but switching on it
//     gives TypeScript no narrowing over `detail` — which is the entire point of the union.
//
//  2. THE FIRST ARM IS DECLARED TWICE, deliberately. The backend types it
//     `kind: "freight_forwarder" | "logistics_operator"` with one body, because freight forwarding
//     and logistics operation carry identical fields. `z.discriminatedUnion` needs ONE literal per
//     option, so the arm is written out twice with the same shape. The switch still has nine cases
//     and the `never` default still fires when a tenth kind is seeded.
//
//  3. VERIFICATION IS PER KIND, AND THIS READ CANNOT SHOW IT. `verificationState` on the card is
//     the PROFILE-level state from `commerce_provider_profile`. Per-kind verification lives on
//     `commerce_provider_kind_link.verificationState`, which the public reads FILTER on and never
//     PROJECT. So a card can say "this organization's profile is verified" and cannot say "verified
//     as a customs broker" — and conflating the two is exactly the failure A13 exists to prevent.
//     Nor does any read list the kinds an organization holds: the directory can filter by kind but
//     a row cannot state its own. Recorded as a backend ask; see `provider-directory-page.tsx`.

import { z } from "zod";

import {
  OrganizationMeasuredMetricsSchema,
  SellerDeclaredProfileSchema,
} from "@/lib/store/organizations.schemas";
import {
  cursorPageOf,
  FREIGHT_TRANSPORT_MODES,
  PROVIDER_KINDS,
  type FreightTransportMode,
  type ProviderKind,
} from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

/**
 * A provider profile's own verification state.
 *
 * `rejected` and `suspended` never reach a public read — the eligibility predicate excludes
 * them — so the two values that matter here are `unverified` and `documents_pending`, which are
 * DIFFERENT and must not both render as "pending". Uploading evidence creates evidence awaiting
 * review; it never grants a badge.
 */
export const PROVIDER_VERIFICATION_STATES = [
  "unverified",
  "documents_pending",
  "verified",
  "rejected",
  "suspended",
] as const;

export type ProviderVerificationState = (typeof PROVIDER_VERIFICATION_STATES)[number];

/**
 * How an offering is priced.
 *
 * `quote_only` means the indicative range is absent, not zero — most connector work is quoted.
 */
export const SERVICE_PRICING_MODELS = [
  "quote_only",
  "fixed_fee",
  "per_unit",
  "subscription",
] as const;

export type ServicePricingModel = (typeof SERVICE_PRICING_MODELS)[number];

// --- Provider directory -----------------------------------------------------

export const PublicProviderCardSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    publicSummary: z.string().nullable(),
    verificationState: z.enum(PROVIDER_VERIFICATION_STATES),
    acceptingRequests: z.boolean(),
    serviceRegionSummary: z.string().nullable(),
    /**
     * AN INTEGER THE PROVIDER TYPES ABOUT ITSELF. Renamed from `averageResponseTimeHours` in
     * Phase 12 precisely so the provenance rides in the name: under the old name it sat as a flat
     * sibling of the platform-derived `fulfillmentMetrics.onTimeShipmentRate`, presenting an
     * assertion and a measurement as the same kind of fact.
     *
     * The MEASURED figure is `measuredMetrics.measuredResponseTimeHours` on the detail read. Never
     * render the two in one row, and never fall back from one to the other.
     */
    declaredResponseTimeHours: z.number().int().nullable(),
    reviewMetrics: z
      .object({ averageRating: z.number().nullable(), reviewCount: z.number().int() })
      .strip(),
    fulfillmentMetrics: z
      .object({
        onTimeShipmentRate: z.number().nullable(),
        onTimeSampleSize: z.number().int(),
        completedOrderCount: z.number().int(),
      })
      .strip(),
  })
  .strip();

export const ProviderDirectoryPageSchema = cursorPageOf(PublicProviderCardSchema);

// --- Offerings --------------------------------------------------------------

export const PublicOfferingCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    providerKind: z.enum(PROVIDER_KINDS),
    pricingModel: z.enum(SERVICE_PRICING_MODELS),
    // A RANGE, and both ends nullable together with `quote_only`. An indicative price is not a
    // quote — never render one end of it as "the price".
    indicativePriceMinInCents: z.number().int().nullable(),
    indicativePriceMaxInCents: z.number().int().nullable(),
    currency: z.string(),
    minimumLeadTimeDays: z.number().int().nullable(),
    maximumLeadTimeDays: z.number().int().nullable(),
  })
  .strip();

/**
 * Where a provider will actually work.
 *
 * A country pair, a region label, or a named port/airport — the backend allows any combination and
 * all five identity fields are nullable, so a row may be as specific as "CNSHA → INNSA" or as
 * broad as "East Asia → Europe".
 *
 * THE FLAGS ARE FILTER INPUTS, NOT PERMISSION. `supportsHazardousGoods` is the provider saying it
 * handles dangerous goods; it is not proof it may legally carry them on that lane. Render it as a
 * capability claim, never as a compliance clearance.
 */
export const PublicCoverageSchema = z
  .object({
    originCountryCode: z.string().nullable(),
    destinationCountryCode: z.string().nullable(),
    originRegionLabel: z.string().nullable(),
    destinationRegionLabel: z.string().nullable(),
    locationIdentifier: z.string().nullable(),
    supportsHazardousGoods: z.boolean(),
    supportsConsolidation: z.boolean(),
  })
  .strip();

// --- The nine-arm typed extension -------------------------------------------
//
// One arm per provider kind, each with the fields that kind actually needs. A single nullable
// blob would let a warehouse capacity sit on an insurance policy, which is §2.1's whole argument
// for typed extension tables in the first place.
//
// Optional fields are `.optional()` and NOT `.nullable()`: the backend types them `field?: T`, so
// they are ABSENT from the payload rather than present-and-null. Parsing them as nullable would
// accept a shape the server never sends and reject nothing.

const FreightDetailShape = {
  transportModes: z.array(z.enum(FREIGHT_TRANSPORT_MODES)),
  supportsConsolidation: z.boolean(),
  supportsContainers: z.boolean(),
  supportsHazardousGoods: z.boolean(),
};

export const ServiceOfferingDetailSchema = z.discriminatedUnion("kind", [
  // Declared twice on purpose — see the header. The backend gives these two kinds one body.
  z.object({ kind: z.literal("freight_forwarder"), ...FreightDetailShape }).strip(),
  z.object({ kind: z.literal("logistics_operator"), ...FreightDetailShape }).strip(),
  z
    .object({
      kind: z.literal("customs_broker"),
      jurisdictions: z.array(z.string()),
      importSupported: z.boolean(),
      exportSupported: z.boolean(),
      commodityCoverageSummary: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("insurance_provider"),
      cargoCoverageClasses: z.array(z.string()),
      coverageLimitMinInCents: z.number().int().optional(),
      coverageLimitMaxInCents: z.number().int().optional(),
      currency: z.string().optional(),
      exclusionsDocumentReference: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("inspection_agency"),
      preProduction: z.boolean(),
      duringProduction: z.boolean(),
      preShipment: z.boolean(),
      loadingSupervision: z.boolean(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("testing_certification_lab"),
      standards: z.array(z.string()),
      accreditationBodies: z.array(z.string()),
      laboratoryLocations: z.array(z.string()),
    })
    .strip(),
  z
    .object({
      kind: z.literal("marketing_agency"),
      channels: z.array(z.string()),
      targetRegions: z.array(z.string()),
      languageCapabilities: z.array(z.string()),
      engagementModel: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("warehouse_provider"),
      storageTypes: z.array(z.string()),
      temperatureControlled: z.boolean(),
      bondedStatus: z.boolean(),
      capacityUnits: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("foreign_exchange_facilitator"),
      currencyPairs: z.array(z.string()),
      settlementRails: z.array(z.string()),
      minimumNotionalInCents: z.number().int().optional(),
      maximumNotionalInCents: z.number().int().optional(),
      notionalCurrency: z.string().optional(),
    })
    .strip(),
]);

// --- Detail reads -----------------------------------------------------------

/**
 * `GET /store/providers/:organizationSlug`.
 *
 * Note that it reuses the SELLER profile shapes: an organization may be a seller and a provider at
 * once, and `commerce_seller_profile` is where company depth lives either way. The
 * declared/measured split is the same invariant the storefront enforces — two objects, never one
 * flat stat list.
 */
export const PublicProviderDetailSchema = z
  .object({
    provider: PublicProviderCardSchema,
    declaredProfile: SellerDeclaredProfileSchema.nullable(),
    measuredMetrics: OrganizationMeasuredMetricsSchema,
    offerings: z.array(PublicOfferingCardSchema),
  })
  .strip();

/**
 * `GET /store/services/:offeringSlug`.
 *
 * `offering.state` is narrowed to `"active"` by the backend — a draft, pending, suspended or
 * retired offering is a 404, identical to one that never existed. Do not render a "withdrawn"
 * state from a 404.
 */
export const PublicServiceOfferingSchema = z
  .object({
    offering: PublicOfferingCardSchema.extend({ state: z.literal("active") }),
    provider: PublicProviderCardSchema,
    detail: ServiceOfferingDetailSchema,
    coverage: z.array(PublicCoverageSchema),
  })
  .strip();

// --- Filter inputs ----------------------------------------------------------

/**
 * `ProvidersQuerySchema` accepts THREE keys and that is the whole filter surface:
 * `providerKind`, `limit`, `cursor`.
 *
 * STORE_STRUCTURE §9.1 specifies eight filters — origin/destination coverage, transport mode,
 * jurisdiction, standards, storage capability, currency pair, verification state, accepting-requests
 * state. SEVEN OF THEM DO NOT EXIST. The query schema is `.strict()`, so sending one is a **422**,
 * not an ignored param. They are a backend ask, not a frontend build.
 */
export interface ListProvidersFilter {
  readonly providerKind?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export type PublicProviderCard = z.infer<typeof PublicProviderCardSchema>;
export type ProviderDirectoryPage = z.infer<typeof ProviderDirectoryPageSchema>;
export type PublicOfferingCard = z.infer<typeof PublicOfferingCardSchema>;
export type PublicCoverage = z.infer<typeof PublicCoverageSchema>;
export type ServiceOfferingDetail = z.infer<typeof ServiceOfferingDetailSchema>;
export type PublicProviderDetail = z.infer<typeof PublicProviderDetailSchema>;
export type PublicServiceOffering = z.infer<typeof PublicServiceOfferingSchema>;

// --- Display maps -----------------------------------------------------------

/**
 * Copy for the PROFILE-level verification state.
 *
 * Deliberately says "profile" in every string that claims anything. This state is about the
 * organization's own documents; it is NOT an approval to operate as any particular provider kind,
 * and `commerce_provider_kind_link.verificationState` — which is — never reaches the wire.
 */
export const PROVIDER_VERIFICATION_LABELS: Record<ProviderVerificationState, string> = {
  unverified: "Profile not verified",
  documents_pending: "Profile documents under review",
  verified: "Profile verified by Qatoto",
  // Neither reaches a public read; present so the map is total and a switch cannot fall through.
  rejected: "Profile rejected",
  suspended: "Profile suspended",
};

export const SERVICE_PRICING_MODEL_LABELS: Record<ServicePricingModel, string> = {
  quote_only: "Quoted per request",
  fixed_fee: "Fixed fee",
  per_unit: "Per unit",
  subscription: "Subscription",
};

// --- Request body: POST /commerce/providers/:organizationId/offerings ------
//
// TRANSCRIBED FROM `CreateOfferingSchema`, which is `.strict()`.
//
// READ THIS BESIDE `RfqRequirementDetailInput` AND DO NOT MERGE THEM. The two unions cover the same nine
// provider kinds and are NOT the same type:
//
//   the DISCRIMINANT differs — `kind` here, `providerKind` there;
//   the BOOLEANS ARE REQUIRED here and optional there, because an offering states a capability (`false`
//     means "we do not do that") while a requirement states a need (absent means "not asked");
//   several FIELD NAMES differ — `importSupported`/`commodityCoverageSummary` here against
//     `importRequired`/`commoditySummary` there, `bondedStatus` against `bondedStatusRequired`;
//   the offering carries RANGES where the requirement carries a single figure
//     (`coverageLimitMinInCents`/`…Max` against `coverageLimitInCents`), and it has fields the requirement
//     has no equivalent for at all (`accreditationBodies`, `laboratoryLocations`, `engagementModel`,
//     `exclusionsDocumentReference`).
//
// Two `.strict()` schemas, two vocabularies. A shared type would send the wrong field names to one of them.

/**
 * What the price on the listing MEANS. `quote_only` is the honest default for trade services.
 *
 * KEYED OFF `SERVICE_PRICING_MODELS`, the tuple the READ side of this file already declares — the create
 * body and the public card carry the same four `commerce_service_pricing_model` labels, so a second tuple
 * here would be two spellings of one Postgres enum and only one of them would get fixed when it changes.
 *
 * The copy says what a buyer gets, not what the enum is called: `per_unit` without a unit named in the
 * summary is a number nobody can act on, which is why the composer asks for one.
 */
export const OFFERING_PRICING_MODEL_LABELS: Record<ServicePricingModel, string> = {
  quote_only: "Quote only — the price depends on the job",
  fixed_fee: "Fixed fee — one price for the whole service",
  per_unit: "Per unit — priced per container, pallet, shipment or item",
  subscription: "Subscription — a recurring charge",
};

/** The nine-arm capability union, discriminating on `kind`. Freight covers two kinds in one arm. */
export type ServiceOfferingDetailInput =
  | {
      readonly kind: "freight_forwarder" | "logistics_operator";
      readonly transportModes: readonly FreightTransportMode[];
      // REQUIRED. `false` is a published statement that this provider does not consolidate — which is what
      // a buyer filtering on consolidation needs to know, and is not the same as leaving it unanswered.
      readonly supportsConsolidation: boolean;
      readonly supportsContainers: boolean;
      readonly supportsHazardousGoods: boolean;
    }
  | {
      readonly kind: "customs_broker";
      readonly jurisdictions: readonly string[];
      readonly importSupported: boolean;
      readonly exportSupported: boolean;
      readonly commodityCoverageSummary?: string;
    }
  | {
      readonly kind: "insurance_provider";
      readonly cargoCoverageClasses: readonly string[];
      readonly coverageLimitMinInCents?: number;
      readonly coverageLimitMaxInCents?: number;
      readonly currency?: string;
      readonly exclusionsDocumentReference?: string;
    }
  | {
      readonly kind: "inspection_agency";
      readonly preProduction: boolean;
      readonly duringProduction: boolean;
      readonly preShipment: boolean;
      readonly loadingSupervision: boolean;
    }
  | {
      readonly kind: "testing_certification_lab";
      readonly standards: readonly string[];
      readonly accreditationBodies: readonly string[];
      readonly laboratoryLocations: readonly string[];
    }
  | {
      readonly kind: "marketing_agency";
      readonly channels: readonly string[];
      readonly targetRegions: readonly string[];
      readonly languageCapabilities: readonly string[];
      readonly engagementModel?: string;
    }
  | {
      readonly kind: "warehouse_provider";
      readonly storageTypes: readonly string[];
      readonly temperatureControlled: boolean;
      readonly bondedStatus: boolean;
      readonly capacityUnits?: string;
    }
  | {
      readonly kind: "foreign_exchange_facilitator";
      readonly currencyPairs: readonly string[];
      readonly settlementRails: readonly string[];
      readonly minimumNotionalInCents?: number;
      readonly maximumNotionalInCents?: number;
      readonly notionalCurrency?: string;
    };

/**
 * `POST /commerce/providers/:organizationId/offerings` — creates a DRAFT offering.
 *
 * IT DOES NOT PUBLISH. Publishing is `POST /service-offerings/:id/submit`, which sends it for moderation,
 * and moderation is a separate admin act. So the composer's success copy must not say "live".
 *
 * `providerKind` AND `detail.kind` ARE REFINED TO MATCH. The composer sets both from one control.
 *
 * The money and lead-time fields are `.optional()` and NOT nullable — a blank input is omitted from the
 * body. Sending `0` for "we did not say" would publish a free service with a same-day lead time.
 *
 * Requires an `Idempotency-Key`.
 */
export interface CreateServiceOfferingInput {
  readonly providerKind: ProviderKind;
  readonly title: string;
  readonly summary?: string;
  readonly pricingModel: ServicePricingModel;
  readonly indicativePriceMinInCents?: number;
  readonly indicativePriceMaxInCents?: number;
  readonly currency?: string;
  readonly minimumLeadTimeDays?: number;
  readonly maximumLeadTimeDays?: number;
  readonly detail: ServiceOfferingDetailInput;
}

/**
 * Every state a `commerce_service_offering` row can hold.
 *
 * The PUBLIC reads only ever return `active`, so the read side of this file never needed this tuple. The
 * CREATE response does: it comes back `draft`, and `pending_review` is what `submit` produces. Those three
 * are different facts and the composer must not print any of them as "live".
 */
export const SERVICE_OFFERING_STATES = [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "retired",
] as const;

export type ServiceOfferingState = (typeof SERVICE_OFFERING_STATES)[number];

export const SERVICE_OFFERING_STATE_LABELS: Record<ServiceOfferingState, string> = {
  draft: "Draft — only your organization can see it",
  pending_review: "Waiting for review",
  active: "Published",
  suspended: "Suspended",
  retired: "Retired",
};

/**
 * What `POST …/offerings` answers with: `201` and a RAW DRIZZLE ROW of `commerce_service_offering`.
 *
 * NOT `PublicServiceOffering`. That is a projection built for the public detail page and it carries the
 * provider, the coverage and the typed detail; this carries the table's own columns and nothing joined. The
 * two must not share a schema — the create response has no `provider` object to read, and pretending
 * otherwise would crash the success screen.
 *
 * `state` COMES BACK `draft`, ALWAYS. Creating is not publishing: `POST /service-offerings/:id/submit` sends
 * it for moderation and an admin decides. `.strip()` so a column added by a backend release is ignored.
 */
export const CreatedServiceOfferingSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    providerOrganizationId: z.string(),
    providerKind: z.enum(PROVIDER_KINDS),
    title: z.string(),
    summary: z.string().nullable(),
    state: z.enum(SERVICE_OFFERING_STATES),
    pricingModel: z.enum(SERVICE_PRICING_MODELS),
    indicativePriceMinInCents: z.number().int().nullable(),
    indicativePriceMaxInCents: z.number().int().nullable(),
    // NOT NULLABLE on the wire — the column defaults to `USD`. So a listing always has a currency even
    // when it has no price, which is why an absent range must render as "no price given" and not as free.
    currency: z.string(),
    minimumLeadTimeDays: z.number().int().nullable(),
    maximumLeadTimeDays: z.number().int().nullable(),
  })
  .strip();

export type CreatedServiceOffering = z.infer<typeof CreatedServiceOfferingSchema>;

/**
 * `GET /commerce/providers/:organizationId/offerings/mine` — a BARE ARRAY of the same raw rows.
 *
 * No `{ items }` wrapper and no cursor: `listMineOfferings` selects every offering the organization owns and
 * returns the array as `data`. Bounded by how many services one provider publishes, so there is nothing to
 * page.
 *
 * IT INCLUDES DRAFTS AND RETIRED ROWS, which is the whole reason this read exists — the public directory
 * shows only `active`, so a provider looking for the draft they just created can find it nowhere else.
 */
export const MyServiceOfferingListSchema = z.array(CreatedServiceOfferingSchema);
