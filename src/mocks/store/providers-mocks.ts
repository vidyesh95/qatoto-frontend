// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `providers.api.ts` swaps `resolveMockRead` for `getJson`.
//
// NINE OFFERINGS, ONE PER PROVIDER KIND, and that is the point rather than thoroughness for its
// own sake: `service-offering-page.tsx` switches exhaustively over `detail.kind`, and an arm with
// no fixture is an arm nobody has ever seen render. Eight of nine would ship a page that throws on
// the ninth.
//
// Every fixture is explicitly annotated, not `satisfies`, so a missing required field fails at
// compile time; `resolveMockRead` then parses each through the real schema at runtime.

import type {
  CreatedServiceOffering,
  ProviderDirectoryPage,
  PublicOfferingCard,
  PublicProviderCard,
  PublicProviderDetail,
  PublicServiceOffering,
} from "@/lib/store/providers.schemas";

// --- Provider cards ---------------------------------------------------------
//
// Coverage of the branches the directory has to render: all three reachable verification states,
// `acceptingRequests` both ways, a null summary, a null region, a provider with no reviews
// (`averageRating: null` — NOT zero stars), and one whose `onTimeShipmentRate` is null with a
// non-zero sample size, which is what "below the threshold" looks like on the wire.

const MERIDIAN_FREIGHT: PublicProviderCard = {
  organizationId: "org_meridian",
  slug: "meridian-freight",
  displayName: "Meridian Freight Partners",
  countryCode: "SG",
  logoUrl: null,
  publicSummary: "Consolidated ocean and air freight between East Asia and Northern Europe.",
  verificationState: "verified",
  acceptingRequests: true,
  serviceRegionSummary: "East Asia → Europe, North America",
  declaredResponseTimeHours: 4,
  reviewMetrics: { averageRating: 4.7, reviewCount: 128 },
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.962,
    onTimeSampleSize: 214,
    completedOrderCount: 268,
  },
};

const HANSA_CUSTOMS: PublicProviderCard = {
  organizationId: "org_hansa",
  slug: "hansa-customs",
  displayName: "Hansa Customs Agency",
  countryCode: "DE",
  logoUrl: null,
  publicSummary: "Indirect customs representation for non-EU sellers in DE, NL and BE.",
  verificationState: "verified",
  acceptingRequests: true,
  serviceRegionSummary: "European Union",
  declaredResponseTimeHours: 8,
  reviewMetrics: { averageRating: 4.4, reviewCount: 41 },
  // A rate of `null` with a sample size of 6 is "not enough evidence yet", NOT 0% on time.
  // Rendering it as a percentage would publish a performance claim the platform has not earned.
  fulfillmentMetrics: { onTimeShipmentRate: null, onTimeSampleSize: 6, completedOrderCount: 9 },
};

const CERTUS_INSPECTION: PublicProviderCard = {
  organizationId: "org_certus",
  slug: "certus-inspection",
  displayName: "Certus Inspection Services",
  countryCode: "IN",
  logoUrl: null,
  publicSummary: null,
  // Documents submitted, nobody has adjudicated them. NOT the same as `unverified`, and neither
  // is a badge.
  verificationState: "documents_pending",
  acceptingRequests: true,
  serviceRegionSummary: null,
  declaredResponseTimeHours: null,
  reviewMetrics: { averageRating: null, reviewCount: 0 },
  fulfillmentMetrics: { onTimeShipmentRate: null, onTimeSampleSize: 0, completedOrderCount: 0 },
};

const NORDIC_ASSURANCE: PublicProviderCard = {
  organizationId: "org_nordic_assurance",
  slug: "nordic-cargo-assurance",
  displayName: "Nordic Cargo Assurance",
  countryCode: "NO",
  logoUrl: null,
  publicSummary: "All-risk marine cargo cover for containerised and break-bulk shipments.",
  verificationState: "verified",
  acceptingRequests: false,
  serviceRegionSummary: "Worldwide, excluding sanctioned territories",
  declaredResponseTimeHours: 24,
  reviewMetrics: { averageRating: 4.1, reviewCount: 17 },
  fulfillmentMetrics: { onTimeShipmentRate: null, onTimeSampleSize: 0, completedOrderCount: 3 },
};

const APEX_LABS: PublicProviderCard = {
  organizationId: "org_apex_labs",
  slug: "apex-testing-labs",
  displayName: "Apex Testing Laboratories",
  countryCode: "VN",
  logoUrl: null,
  publicSummary: "Furniture, textile and electrical safety testing to EN and ASTM standards.",
  verificationState: "unverified",
  acceptingRequests: true,
  serviceRegionSummary: "Southeast Asia",
  declaredResponseTimeHours: 12,
  reviewMetrics: { averageRating: 4.9, reviewCount: 63 },
  fulfillmentMetrics: { onTimeShipmentRate: 0.988, onTimeSampleSize: 84, completedOrderCount: 91 },
};

const HARBOUR_STORAGE: PublicProviderCard = {
  organizationId: "org_harbour",
  slug: "harbour-bonded-storage",
  displayName: "Harbour Bonded Storage",
  countryCode: "NL",
  logoUrl: null,
  publicSummary: "Bonded and ambient warehousing minutes from Rotterdam.",
  verificationState: "verified",
  acceptingRequests: true,
  serviceRegionSummary: "Benelux",
  declaredResponseTimeHours: 6,
  reviewMetrics: { averageRating: 4.5, reviewCount: 29 },
  fulfillmentMetrics: { onTimeShipmentRate: 0.941, onTimeSampleSize: 52, completedOrderCount: 61 },
};

const LATERAL_MARKETING: PublicProviderCard = {
  organizationId: "org_lateral",
  slug: "lateral-trade-marketing",
  displayName: "Lateral Trade Marketing",
  countryCode: "GB",
  logoUrl: null,
  publicSummary: "Category launches and trade-show programmes for industrial brands.",
  verificationState: "unverified",
  acceptingRequests: true,
  serviceRegionSummary: "United Kingdom, EU",
  declaredResponseTimeHours: 48,
  reviewMetrics: { averageRating: null, reviewCount: 0 },
  fulfillmentMetrics: { onTimeShipmentRate: null, onTimeSampleSize: 0, completedOrderCount: 0 },
};

const KAMBER_FX: PublicProviderCard = {
  organizationId: "org_kamber",
  slug: "kamber-settlement",
  displayName: "Kamber Settlement Services",
  countryCode: "AE",
  logoUrl: null,
  publicSummary: "Corridor pricing and settlement for CNY, INR, EUR and USD pairs.",
  verificationState: "documents_pending",
  acceptingRequests: true,
  serviceRegionSummary: "GCC, South Asia, EU",
  declaredResponseTimeHours: 2,
  reviewMetrics: { averageRating: 4.3, reviewCount: 11 },
  fulfillmentMetrics: { onTimeShipmentRate: null, onTimeSampleSize: 0, completedOrderCount: 7 },
};

const TRANSPACIFIC_LOGISTICS: PublicProviderCard = {
  organizationId: "org_transpacific",
  slug: "transpacific-logistics",
  displayName: "TransPacific Logistics",
  countryCode: "CN",
  logoUrl: null,
  publicSummary: "Door-to-door road and rail across mainland China, with EU rail onward.",
  verificationState: "verified",
  acceptingRequests: true,
  serviceRegionSummary: "China → Central Asia, Europe",
  declaredResponseTimeHours: 3,
  reviewMetrics: { averageRating: 4.6, reviewCount: 204 },
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.917,
    onTimeSampleSize: 331,
    completedOrderCount: 412,
  },
};

export const MOCK_PROVIDER_DIRECTORY_PAGE: ProviderDirectoryPage = {
  items: [
    MERIDIAN_FREIGHT,
    TRANSPACIFIC_LOGISTICS,
    HANSA_CUSTOMS,
    NORDIC_ASSURANCE,
    CERTUS_INSPECTION,
    APEX_LABS,
    LATERAL_MARKETING,
    HARBOUR_STORAGE,
    KAMBER_FX,
  ],
  page: { nextCursor: "cursor_providers_page_2", hasMore: true },
};

/** No provider matched the filter. Distinct from a directory with nothing in it at all. */
export const MOCK_PROVIDER_DIRECTORY_PAGE_EMPTY: ProviderDirectoryPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Offering cards ---------------------------------------------------------

const OFFERING_MERIDIAN_FCL: PublicOfferingCard = {
  id: "off_meridian_fcl",
  slug: "meridian-fcl-asia-europe",
  title: "FCL ocean freight, South China to North Europe",
  summary: "Weekly consolidated sailings from Yantian and Shekou to Rotterdam and Hamburg.",
  providerKind: "freight_forwarder",
  pricingModel: "per_unit",
  indicativePriceMinInCents: 185_000,
  indicativePriceMaxInCents: 240_000,
  currency: "USD",
  minimumLeadTimeDays: 28,
  maximumLeadTimeDays: 38,
};

const OFFERING_TRANSPACIFIC_RAIL: PublicOfferingCard = {
  id: "off_transpacific_rail",
  slug: "transpacific-china-eu-rail",
  title: "China–Europe block train, container space",
  summary: "Xi'an and Chengdu departures, onward road delivery in the EU.",
  providerKind: "logistics_operator",
  pricingModel: "per_unit",
  indicativePriceMinInCents: 310_000,
  indicativePriceMaxInCents: 395_000,
  currency: "USD",
  minimumLeadTimeDays: 18,
  maximumLeadTimeDays: 24,
};

const OFFERING_HANSA_CLEARANCE: PublicOfferingCard = {
  id: "off_hansa_customs",
  slug: "hansa-eu-import-clearance",
  title: "EU import clearance and duty representation",
  summary: "Indirect representation, duty deferment and post-clearance audit support.",
  providerKind: "customs_broker",
  // Quote-only: BOTH price ends are null. `currency` is still present because the column is
  // not nullable — it describes what a quote would be denominated in, not a price.
  pricingModel: "quote_only",
  indicativePriceMinInCents: null,
  indicativePriceMaxInCents: null,
  currency: "EUR",
  minimumLeadTimeDays: 1,
  maximumLeadTimeDays: 3,
};

const OFFERING_NORDIC_CARGO: PublicOfferingCard = {
  id: "off_nordic_cargo",
  slug: "nordic-all-risk-marine-cover",
  title: "All-risk marine cargo cover",
  summary: null,
  providerKind: "insurance_provider",
  pricingModel: "per_unit",
  indicativePriceMinInCents: 4_500,
  indicativePriceMaxInCents: 32_000,
  currency: "EUR",
  minimumLeadTimeDays: null,
  maximumLeadTimeDays: null,
};

const OFFERING_CERTUS_PRESHIPMENT: PublicOfferingCard = {
  id: "off_certus_preshipment",
  slug: "certus-pre-shipment-inspection",
  title: "Pre-shipment inspection, furniture and fixtures",
  summary: "AQL 2.5 sampling with a photo report inside 48 hours of loading.",
  providerKind: "inspection_agency",
  pricingModel: "fixed_fee",
  indicativePriceMinInCents: 42_000,
  indicativePriceMaxInCents: 42_000,
  currency: "USD",
  minimumLeadTimeDays: 2,
  maximumLeadTimeDays: 5,
};

const OFFERING_APEX_EN16139: PublicOfferingCard = {
  id: "off_apex_en16139",
  slug: "apex-en16139-seating-test",
  title: "EN 16139 seating strength and durability test",
  summary: "Level 2 non-domestic seating, full report and CE-support documentation.",
  providerKind: "testing_certification_lab",
  pricingModel: "fixed_fee",
  indicativePriceMinInCents: 128_000,
  indicativePriceMaxInCents: 128_000,
  currency: "USD",
  minimumLeadTimeDays: 10,
  maximumLeadTimeDays: 15,
};

const OFFERING_LATERAL_LAUNCH: PublicOfferingCard = {
  id: "off_lateral_launch",
  slug: "lateral-category-launch-programme",
  title: "Category launch programme, trade press and shows",
  summary: "Positioning, trade-show stand and press programme for one product family.",
  providerKind: "marketing_agency",
  pricingModel: "subscription",
  indicativePriceMinInCents: 850_000,
  indicativePriceMaxInCents: 2_400_000,
  currency: "GBP",
  minimumLeadTimeDays: 30,
  maximumLeadTimeDays: 90,
};

const OFFERING_HARBOUR_BONDED: PublicOfferingCard = {
  id: "off_harbour_bonded",
  slug: "harbour-bonded-pallet-storage",
  title: "Bonded pallet storage, Rotterdam",
  summary: "Duty-suspended storage with pick-and-pack and EU onward dispatch.",
  providerKind: "warehouse_provider",
  pricingModel: "per_unit",
  indicativePriceMinInCents: 1_150,
  indicativePriceMaxInCents: 2_800,
  currency: "EUR",
  minimumLeadTimeDays: null,
  maximumLeadTimeDays: null,
};

const OFFERING_KAMBER_CORRIDOR: PublicOfferingCard = {
  id: "off_kamber_corridor",
  slug: "kamber-cny-eur-corridor",
  title: "CNY–EUR corridor pricing and settlement",
  summary: "Forward-dated corridor rates with same-day settlement on major pairs.",
  providerKind: "foreign_exchange_facilitator",
  pricingModel: "quote_only",
  indicativePriceMinInCents: null,
  indicativePriceMaxInCents: null,
  currency: "USD",
  minimumLeadTimeDays: null,
  maximumLeadTimeDays: 1,
};

// --- Provider detail --------------------------------------------------------

export const MOCK_PROVIDER_DETAILS_BY_SLUG: Readonly<Record<string, PublicProviderDetail>> = {
  "meridian-freight": {
    provider: MERIDIAN_FREIGHT,
    // A provider that has never filled in company depth. `null` and not an empty object: "we
    // have no profile for this organization" and "it filled the form in and left it blank" are
    // different facts, and only one deserves an empty state.
    declaredProfile: null,
    measuredMetrics: {
      onTimeShipmentRate: 0.962,
      onTimeSampleSize: 214,
      completedOrderCount: 268,
      reorderRate: 0.41,
      reorderSampleSize: 96,
      measuredResponseTimeHours: 5.2,
      responseSampleSize: 173,
    },
    offerings: [OFFERING_MERIDIAN_FCL],
  },
  "certus-inspection": {
    provider: CERTUS_INSPECTION,
    declaredProfile: null,
    // A provider with no history at all: zeros where a count belongs, nulls where a rate would
    // be, and honest sample sizes of zero beside both.
    measuredMetrics: {
      onTimeShipmentRate: null,
      onTimeSampleSize: 0,
      completedOrderCount: 0,
      reorderRate: null,
      reorderSampleSize: 0,
      measuredResponseTimeHours: null,
      responseSampleSize: 0,
    },
    offerings: [OFFERING_CERTUS_PRESHIPMENT],
  },
  "harbour-bonded-storage": {
    provider: HARBOUR_STORAGE,
    declaredProfile: null,
    measuredMetrics: {
      onTimeShipmentRate: 0.941,
      onTimeSampleSize: 52,
      completedOrderCount: 61,
      reorderRate: null,
      reorderSampleSize: 4,
      measuredResponseTimeHours: 7.1,
      responseSampleSize: 38,
    },
    // A provider with no published offerings yet — the empty branch of the detail page.
    offerings: [],
  },
};

// --- Service offering detail, one per kind ----------------------------------

export const MOCK_SERVICE_OFFERINGS_BY_SLUG: Readonly<Record<string, PublicServiceOffering>> = {
  "meridian-fcl-asia-europe": {
    offering: { ...OFFERING_MERIDIAN_FCL, state: "active" },
    provider: MERIDIAN_FREIGHT,
    detail: {
      kind: "freight_forwarder",
      transportModes: ["sea", "air"],
      supportsConsolidation: true,
      supportsContainers: true,
      supportsHazardousGoods: false,
    },
    coverage: [
      {
        originCountryCode: "CN",
        destinationCountryCode: "NL",
        originRegionLabel: null,
        destinationRegionLabel: null,
        locationIdentifier: "CNYTN → NLRTM",
        supportsHazardousGoods: false,
        supportsConsolidation: true,
      },
      {
        originCountryCode: "CN",
        destinationCountryCode: "DE",
        originRegionLabel: null,
        destinationRegionLabel: null,
        locationIdentifier: "CNSHK → DEHAM",
        supportsHazardousGoods: false,
        supportsConsolidation: true,
      },
      // A broad lane: region labels, no country codes, no named port. The backend allows any
      // combination of the five identity fields, so the row has to render either way.
      {
        originCountryCode: null,
        destinationCountryCode: null,
        originRegionLabel: "East Asia",
        destinationRegionLabel: "Northern Europe",
        locationIdentifier: null,
        supportsHazardousGoods: false,
        supportsConsolidation: true,
      },
    ],
  },
  "transpacific-china-eu-rail": {
    offering: { ...OFFERING_TRANSPACIFIC_RAIL, state: "active" },
    provider: TRANSPACIFIC_LOGISTICS,
    detail: {
      kind: "logistics_operator",
      transportModes: ["rail", "land", "multimodal"],
      supportsConsolidation: true,
      supportsContainers: true,
      supportsHazardousGoods: true,
    },
    coverage: [
      {
        originCountryCode: "CN",
        destinationCountryCode: "PL",
        originRegionLabel: null,
        destinationRegionLabel: "Central Europe",
        locationIdentifier: "Xi'an → Małaszewicze",
        supportsHazardousGoods: true,
        supportsConsolidation: true,
      },
    ],
  },
  "hansa-eu-import-clearance": {
    offering: { ...OFFERING_HANSA_CLEARANCE, state: "active" },
    provider: HANSA_CUSTOMS,
    detail: {
      kind: "customs_broker",
      jurisdictions: ["DE", "NL", "BE"],
      importSupported: true,
      exportSupported: false,
      commodityCoverageSummary: "Furniture, textiles, consumer electronics. No foodstuffs.",
    },
    coverage: [
      {
        originCountryCode: null,
        destinationCountryCode: "DE",
        originRegionLabel: null,
        destinationRegionLabel: null,
        locationIdentifier: null,
        supportsHazardousGoods: false,
        supportsConsolidation: false,
      },
    ],
  },
  "nordic-all-risk-marine-cover": {
    offering: { ...OFFERING_NORDIC_CARGO, state: "active" },
    provider: NORDIC_ASSURANCE,
    detail: {
      kind: "insurance_provider",
      cargoCoverageClasses: ["All risks (Institute Cargo Clauses A)", "War", "Strikes"],
      coverageLimitMinInCents: 500_000,
      coverageLimitMaxInCents: 250_000_000,
      currency: "EUR",
      exclusionsDocumentReference: "NCA-EXCL-2026-03",
    },
    coverage: [],
  },
  "certus-pre-shipment-inspection": {
    offering: { ...OFFERING_CERTUS_PRESHIPMENT, state: "active" },
    provider: CERTUS_INSPECTION,
    detail: {
      kind: "inspection_agency",
      preProduction: false,
      duringProduction: true,
      preShipment: true,
      loadingSupervision: true,
    },
    coverage: [
      {
        originCountryCode: "IN",
        destinationCountryCode: null,
        originRegionLabel: null,
        destinationRegionLabel: null,
        locationIdentifier: null,
        supportsHazardousGoods: false,
        supportsConsolidation: false,
      },
    ],
  },
  "apex-en16139-seating-test": {
    offering: { ...OFFERING_APEX_EN16139, state: "active" },
    provider: APEX_LABS,
    detail: {
      kind: "testing_certification_lab",
      standards: ["EN 16139", "EN 1728", "ASTM F1858"],
      accreditationBodies: ["VILAS", "ILAC-MRA"],
      laboratoryLocations: ["Hanoi, VN", "Ho Chi Minh City, VN"],
    },
    coverage: [],
  },
  "lateral-category-launch-programme": {
    offering: { ...OFFERING_LATERAL_LAUNCH, state: "active" },
    provider: LATERAL_MARKETING,
    detail: {
      kind: "marketing_agency",
      channels: ["Trade press", "Trade shows", "Paid search", "Email"],
      targetRegions: ["United Kingdom", "Germany", "Benelux"],
      languageCapabilities: ["English", "German", "Dutch"],
      // `engagementModel` omitted on purpose — it is `?: string` on the wire, so ABSENT rather
      // than null, and the page must render its absence without printing "undefined".
    },
    coverage: [],
  },
  "harbour-bonded-pallet-storage": {
    offering: { ...OFFERING_HARBOUR_BONDED, state: "active" },
    provider: HARBOUR_STORAGE,
    detail: {
      kind: "warehouse_provider",
      storageTypes: ["Ambient", "Bonded", "Racked pallet"],
      temperatureControlled: false,
      bondedStatus: true,
      capacityUnits: "4,800 pallet positions",
    },
    coverage: [
      {
        originCountryCode: null,
        destinationCountryCode: "NL",
        originRegionLabel: null,
        destinationRegionLabel: "Benelux",
        locationIdentifier: "NLRTM",
        supportsHazardousGoods: false,
        supportsConsolidation: true,
      },
    ],
  },
  "kamber-cny-eur-corridor": {
    offering: { ...OFFERING_KAMBER_CORRIDOR, state: "active" },
    provider: KAMBER_FX,
    detail: {
      kind: "foreign_exchange_facilitator",
      currencyPairs: ["CNY/EUR", "CNY/USD", "INR/USD", "AED/EUR"],
      settlementRails: ["SWIFT", "SEPA", "Local ACH"],
      minimumNotionalInCents: 1_000_000,
      maximumNotionalInCents: 500_000_000,
      notionalCurrency: "USD",
    },
    coverage: [],
  },
};

/** Slugs worth prerendering. Everything else renders on demand. */
export const MOCK_FEATURED_PROVIDER_SLUGS: readonly string[] = Object.keys(
  MOCK_PROVIDER_DETAILS_BY_SLUG,
);

export const MOCK_FEATURED_OFFERING_SLUGS: readonly string[] = Object.keys(
  MOCK_SERVICE_OFFERINGS_BY_SLUG,
);

/**
 * What `POST …/offerings` answers with — a DRAFT row, not a published listing.
 *
 * `state: "draft"` is the point of the fixture. The composer's success screen reads this field, and a
 * fixture that said `active` would teach the screen to claim a listing is live when creation never
 * publishes anything.
 *
 * The price range is BOTH-NULL and the lead time is BOTH-NULL, which is the `quote_only` shape the backend's
 * paired-range check enforces. A fixture with one end filled would be a row Postgres rejects.
 */
export const MOCK_CREATED_SERVICE_OFFERING: CreatedServiceOffering = {
  id: "off_mock_new",
  slug: "pre-shipment-inspection-south-china",
  providerOrganizationId: "org_certus",
  providerKind: "inspection_agency",
  title: "Pre-shipment inspection, South China",
  summary: "AQL 2.5 sampling, photo report within 48 hours of the visit.",
  state: "draft",
  pricingModel: "quote_only",
  indicativePriceMinInCents: null,
  indicativePriceMaxInCents: null,
  // NOT NULLABLE on the wire — the column defaults to USD. A listing has a currency even with no price,
  // which is why an absent range must read as "quoted per job" and never as free.
  currency: "USD",
  minimumLeadTimeDays: null,
  maximumLeadTimeDays: null,
};

/**
 * The provider's own offerings, spanning FOUR STATES.
 *
 * Deliberately not four `active` rows. This is the only read on the surface that returns a draft, a
 * pending-review row and a retired one, so it is the only place a state-aware list can be reviewed at all —
 * and each of those three must read differently from "published".
 */
export const MOCK_MY_SERVICE_OFFERINGS: readonly CreatedServiceOffering[] = [
  MOCK_CREATED_SERVICE_OFFERING,
  {
    id: "off_mock_review",
    slug: "container-loading-supervision-yantian",
    providerOrganizationId: "org_certus",
    providerKind: "inspection_agency",
    title: "Container loading supervision, Yantian",
    summary: null,
    state: "pending_review",
    pricingModel: "fixed_fee",
    indicativePriceMinInCents: 60_000,
    indicativePriceMaxInCents: 90_000,
    currency: "USD",
    minimumLeadTimeDays: 2,
    maximumLeadTimeDays: 5,
  },
  {
    id: "off_mock_active",
    slug: "pre-production-audit-guangdong",
    providerOrganizationId: "org_certus",
    providerKind: "inspection_agency",
    title: "Pre-production audit, Guangdong",
    summary: "Factory audit against the buyer's own checklist.",
    state: "active",
    pricingModel: "per_unit",
    indicativePriceMinInCents: 45_000,
    indicativePriceMaxInCents: 45_000,
    currency: "USD",
    minimumLeadTimeDays: 3,
    maximumLeadTimeDays: 7,
  },
  {
    id: "off_mock_retired",
    slug: "textile-lab-testing-legacy",
    providerOrganizationId: "org_certus",
    providerKind: "testing_certification_lab",
    title: "Textile lab testing (withdrawn)",
    summary: null,
    state: "retired",
    pricingModel: "quote_only",
    indicativePriceMinInCents: null,
    indicativePriceMaxInCents: null,
    currency: "USD",
    minimumLeadTimeDays: null,
    maximumLeadTimeDays: null,
  },
];
