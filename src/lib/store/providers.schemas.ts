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

import { StoreFacetBucketSchema } from "@/lib/store/catalog.schemas";
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
    /**
     * WHAT THIS ORGANIZATION ACTUALLY IS. A directory row used to carry no kind at all — the
     * backend filtered on `commerce_provider_kind_link` and never projected it — so a buyer could
     * narrow to customs brokers and read a page of cards that did not say "customs broker".
     *
     * ⚠️ `verificationState` HERE IS PER-KIND AND IS NOT THE ONE ABOVE. The card's own
     * `verificationState` is PROFILE-level: "we checked this company exists". This one is
     * "we approved them to operate as this kind". Rendering either as the other turns a company
     * check into a licence. `PROVIDER_VERIFICATION_LABELS` says "Profile" in every string for the
     * outer field; the per-kind field gets `PROVIDER_KIND_VERIFICATION_LABELS` below, which never
     * says "profile".
     */
    providerKinds: z.array(
      z
        .object({
          kind: z.enum(PROVIDER_KINDS),
          verificationState: z.enum(PROVIDER_VERIFICATION_STATES),
        })
        .strip(),
    ),
  })
  .strip();

/**
 * What the directory can be narrowed to, and how many providers each choice would leave.
 *
 * SAME SHAPE `/store/search` RETURNS — `{ value, count }` — and the same three rules ride with it:
 * a bucket absent is not a bucket at zero, the counts are of PROVIDERS rather than of matching rows
 * (a forwarder with three sea offerings is one result under `transportMode=sea`), and they describe
 * the UNFILTERED directory so that every alternative stays clickable after a filter is applied.
 *
 * `value` STAYS A PLAIN STRING, deliberately un-narrowed even where an enum exists. A facet
 * vocabulary is whatever the rows contain; asserting into an enum breaks the first time the backend
 * seeds a new member.
 *
 * ONLY FOUR DIMENSIONS ARE FACETED. `jurisdiction`, `standard` and `storageType` are free-text
 * arrays a provider types, so a chip row over them would be one provider's spellings rather than a
 * vocabulary; `acceptingRequests` is a boolean and needs no count to be legible.
 */
export const ProviderDirectoryFacetsSchema = z
  .object({
    providerKinds: z.array(StoreFacetBucketSchema),
    transportModes: z.array(StoreFacetBucketSchema),
    originCountryCodes: z.array(StoreFacetBucketSchema),
    destinationCountryCodes: z.array(StoreFacetBucketSchema),
  })
  .strip();

// `.extend`, not a bare `cursorPageOf` — that helper is `.strip()`, so a `facets` key added to the
// response would be silently discarded rather than surfacing as a parse failure.
export const ProviderDirectoryPageSchema = cursorPageOf(PublicProviderCardSchema).extend({
  facets: ProviderDirectoryFacetsSchema,
});

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
 * `ProvidersQuerySchema` accepts ELEVEN keys: the eight filters STORE_STRUCTURE §9.1 specifies,
 * plus `limit` and `cursor`.
 *
 * SEVEN OF THESE WERE A 422 UNTIL PHASE 31. The query schema is `.strict()`, so sending an
 * unaccepted key did not degrade to an ignored parameter — it killed the whole read. That is why
 * this interface stayed at three keys for so long, and why the rule below still holds: DO NOT ADD A
 * CHIP HERE WITHOUT ADDING THE QUERY KEY THERE.
 *
 * The types are narrow on purpose. `providerKind` and `transportMode` are enums rather than
 * `string` because the backend parses them with `z.enum(...)`; the country codes are ISO-3166-1
 * alpha-2 and `currencyPair` is `AAA/BBB`, both `.regex()`-checked upstream. A value this file
 * types as `string` is one the backend genuinely accepts as free text.
 */
export interface ListProvidersFilter {
  readonly providerKind?: ProviderKind;
  /** ISO-3166-1 alpha-2, uppercase — a lowercase code is a 422, not a case-insensitive match. */
  readonly originCountryCode?: string;
  readonly destinationCountryCode?: string;
  readonly transportMode?: FreightTransportMode;
  /** Free text on a customs broker's `jurisdictions` array. Matched exactly, not fuzzily. */
  readonly jurisdiction?: string;
  /** Free text on a testing provider's `standards` array. */
  readonly standard?: string;
  /** Free text on a warehouse's `storageTypes` array. */
  readonly storageType?: string;
  /** `AAA/BBB`, uppercase — e.g. `USD/INR`. */
  readonly currencyPair?: string;
  /**
   * ABSENT MEANS "NO FILTER", NOT "FALSE". The wire carries `"true"`/`"false"` because a query
   * string has no booleans; `buildQueryString` stringifies this, and omitting the key is what asks
   * for both. Never default it to `false` — that would silently hide every provider who has paused
   * intake, which is a state a buyer may well want to see.
   */
  readonly acceptingRequests?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

export type PublicProviderCard = z.infer<typeof PublicProviderCardSchema>;
export type ProviderDirectoryPage = z.infer<typeof ProviderDirectoryPageSchema>;
export type ProviderDirectoryFacets = z.infer<typeof ProviderDirectoryFacetsSchema>;
export type PublicOfferingCard = z.infer<typeof PublicOfferingCardSchema>;
export type PublicCoverage = z.infer<typeof PublicCoverageSchema>;

/**
 * ⚠️ **THERE IS NO COVERAGE WRITE ON THIS CLIENT, AND THAT IS A BACKEND GAP.**
 *
 * `PUT /commerce/service-offerings/:offeringId/coverage` exists and replaces the WHOLE lane list —
 * an omitted lane is a deletion. **No read returns a provider its own lanes**:
 * `GET /providers/offerings/mine` answers the raw offering row, and `PublicCoverageSchema` above is
 * reached only through the public detail read, which exists solely for `active` listings. A form
 * that cannot show what it is about to replace would delete a provider's lanes the first time they
 * added one, so the wrapper is not written until a `GET …/coverage` exists to seed it.
 *
 * This is the same shape the seller profile had — writes with no owner-side read — and it was fixed
 * there by adding the GET rather than by guessing at the current state.
 */

/**
 * `PATCH /commerce/service-offerings/:offeringId` — a SPARSE patch.
 *
 * An omitted key is untouched; an explicit `null` clears the two nullable pairs. The body is
 * `.strict()`, so a form must send only what it changed rather than echoing the whole row back —
 * echoing would also make an unrelated concurrent edit invisible to whoever made it.
 *
 * ⚠️ **THE TWO RANGES ARE BOTH-OR-NEITHER**, checked server-side: an indicative price range with
 * only a minimum, or a lead time with only a maximum, is a 422. That is the same rule the create
 * body follows and the reason both halves live on one form.
 */
export interface UpdateServiceOfferingInput {
  readonly title?: string;
  readonly summary?: string | null;
  readonly pricingModel?: ServicePricingModel;
  readonly indicativePriceMinInCents?: number | null;
  readonly indicativePriceMaxInCents?: number | null;
  readonly currency?: string;
  readonly minimumLeadTimeDays?: number | null;
  readonly maximumLeadTimeDays?: number | null;
}

/**
 * One lane the provider serves. Every field is optional — a coverage row saying only
 * "hazardous goods, consolidation" is a real answer for a provider who works everywhere.
 */
export interface ServiceCoverageInput {
  readonly originCountryCode?: string;
  readonly destinationCountryCode?: string;
  readonly originRegionLabel?: string;
  readonly destinationRegionLabel?: string;
  readonly locationIdentifier?: string;
  readonly supportsHazardousGoods?: boolean;
  readonly supportsConsolidation?: boolean;
}

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

/**
 * Copy for the PER-KIND verification state — `commerce_provider_kind_link.verificationState`.
 *
 * DELIBERATELY SAYS "PROFILE" IN NO STRING. This state answers "has Qatoto approved them to operate
 * as this kind", which is a strictly stronger claim than the profile map above; a card that renders
 * one map's copy for the other field promotes a company check into a licence, or demotes a licence
 * into a company check. The two are separate maps rather than one shared map for exactly that
 * reason — sharing would make the mistake a one-character edit.
 *
 * Nothing here says "licensed" or "authorised" either. Qatoto approving a kind link is Qatoto's
 * verdict, not a regulator's: a customs broker's actual licence is issued by a customs authority,
 * and no string on this surface may imply otherwise.
 */
export const PROVIDER_KIND_VERIFICATION_LABELS: Record<ProviderVerificationState, string> = {
  unverified: "Not verified for this service",
  documents_pending: "Verification under review",
  verified: "Verified by Qatoto for this service",
  // Neither reaches a public read — an ineligible kind link is filtered out — but the map stays
  // total so a switch cannot fall through.
  rejected: "Rejected for this service",
  suspended: "Suspended for this service",
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
