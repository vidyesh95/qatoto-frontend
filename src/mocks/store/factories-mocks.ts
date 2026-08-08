// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Every constant here is deleted when `factories.api.ts` swaps `resolveMockRead` for
// `getJson`. It lives under `src/mocks/store/` rather than beside the schema so that the deletion
// is one command and `rg 'mocks/store' src/lib/store` stays the exhaustive list of what is fake.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies`. Annotation catches a missing REQUIRED
// field at compile time; `satisfies` would let one through. `resolveMockRead` then parses each one
// through the real schema at runtime, which catches what types cannot — a typo'd enum member, an
// `undefined` where the wire says `null`.
//
// WHAT THIS SET IS BUILT TO COVER, chosen so the branches that normally ship unreviewed are all
// reachable from the directory:
//
//   · a factory with a MEASURED on-time rate and one whose sample is too small (`null`) — the
//     second is the branch that prints a count instead of a percentage, and the one a fixture set
//     of happy rows would never exercise;
//   · all three verification states, including `unverified`, so the "no documents reviewed" copy
//     is seen rather than assumed;
//   · a LAPSED certification (`validUntil` in the past) beside current ones, and one with no expiry
//     recorded at all — three different renders from one field;
//   · a factory that is NOT accepting inquiries, so the composer's entry point has a disabled path;
//   · `sampleFeeInCents: 0` (genuinely free) on one factory and `null` (unstated) on another, which
//     must not look the same.
//
// The dates are fixed strings, never computed. `Date.now()` in a fixture makes "is this certificate
// expired" a question with a different answer every day, and a snapshot that drifts is a fixture
// that cannot be reasoned about.

import type {
  CreatedFactoryInquiry,
  FactoryCard,
  FactoryDetail,
  FactoryDirectoryPage,
} from "@/lib/store/factories.schemas";

// --- Cards ------------------------------------------------------------------

const HANGZHOU_PRECISION_MOULDS: FactoryCard = {
  organizationId: "org_factory_hangzhou_precision",
  slug: "hangzhou-precision-moulds",
  displayName: "Hangzhou Precision Moulds",
  countryCode: "CN",
  logoUrl: null,
  publicSummary:
    "Injection tooling and high-cavity moulds for housewares and small appliance housings. Runs its own tool room.",
  capabilityKinds: ["tooling_and_moulds", "oem", "contract_manufacturing"],
  minimumOrderQuantity: 2000,
  minimumOrderQuantityUnitLabel: "pieces",
  minimumLeadTimeDays: 35,
  maximumLeadTimeDays: 60,
  certifications: ["iso_9001", "iso_14001"],
  verificationState: "site_audited",
  acceptingInquiries: true,
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.942,
    onTimeSampleSize: 173,
    completedOrderCount: 208,
  },
};

/**
 * The `null` on-time rate.
 *
 * Nine completed orders is below any defensible sample threshold, so the rate is absent and the
 * card must print the COUNT instead. Rendering `0%` here would publish a failure this factory never
 * earned; rendering nothing at all would hide that it has delivered work.
 */
const BAC_NINH_ASSEMBLY: FactoryCard = {
  organizationId: "org_factory_bac_ninh",
  slug: "bac-ninh-assembly-works",
  displayName: "Bac Ninh Assembly Works",
  countryCode: "VN",
  logoUrl: null,
  publicSummary:
    "Final assembly, kitting and retail-ready packing for consumer electronics accessories.",
  capabilityKinds: ["assembly", "private_label"],
  minimumOrderQuantity: 500,
  minimumOrderQuantityUnitLabel: "units",
  minimumLeadTimeDays: 18,
  maximumLeadTimeDays: 30,
  certifications: ["iso_9001", "bsci"],
  verificationState: "documents_reviewed",
  acceptingInquiries: true,
  fulfillmentMetrics: {
    onTimeShipmentRate: null,
    onTimeSampleSize: 0,
    completedOrderCount: 9,
  },
};

/** The ODM row the "Factories Worldwide" tile is really about: they bring the design. */
const COIMBATORE_TEXTILE_ODM: FactoryCard = {
  organizationId: "org_factory_coimbatore_textile",
  slug: "coimbatore-textile-studio",
  displayName: "Coimbatore Textile Studio",
  countryCode: "IN",
  logoUrl: null,
  publicSummary:
    "In-house design team for knitwear and home textiles. Brings its own seasonal ranges; will adapt one to your brand.",
  capabilityKinds: ["odm", "private_label"],
  minimumOrderQuantity: 300,
  minimumOrderQuantityUnitLabel: "pieces per colourway",
  minimumLeadTimeDays: 45,
  maximumLeadTimeDays: 75,
  certifications: ["gots", "sedex_smeta", "iso_9001"],
  verificationState: "site_audited",
  acceptingInquiries: true,
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.881,
    onTimeSampleSize: 84,
    completedOrderCount: 96,
  },
};

/**
 * The one that is NOT taking inquiries, and is `unverified`.
 *
 * Both branches exist here on purpose: a directory whose every row is verified and available never
 * shows the copy written for the rows that are not.
 */
const MONTERREY_METAL_FORMING: FactoryCard = {
  organizationId: "org_factory_monterrey_metal",
  slug: "monterrey-metal-forming",
  displayName: "Monterrey Metal Forming",
  countryCode: "MX",
  logoUrl: null,
  publicSummary: "Sheet metal stamping and welded sub-assemblies for the North American market.",
  capabilityKinds: ["oem", "contract_manufacturing"],
  minimumOrderQuantity: null,
  minimumOrderQuantityUnitLabel: null,
  minimumLeadTimeDays: 21,
  maximumLeadTimeDays: null,
  certifications: ["iso_9001"],
  verificationState: "unverified",
  acceptingInquiries: false,
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.76,
    onTimeSampleSize: 42,
    completedOrderCount: 51,
  },
};

const IZMIR_FOOD_PACKING: FactoryCard = {
  organizationId: "org_factory_izmir_food",
  slug: "izmir-food-packing",
  displayName: "İzmir Food Packing",
  countryCode: "TR",
  logoUrl: null,
  publicSummary:
    "Dried fruit, nut and preserve packing under private label. Bonded warehouse on site.",
  capabilityKinds: ["private_label", "contract_manufacturing"],
  minimumOrderQuantity: 1000,
  minimumOrderQuantityUnitLabel: "kg",
  minimumLeadTimeDays: 25,
  maximumLeadTimeDays: 40,
  certifications: ["fda_registered", "iso_9001", "ce_marking"],
  verificationState: "documents_reviewed",
  acceptingInquiries: true,
  fulfillmentMetrics: {
    onTimeShipmentRate: 0.913,
    onTimeSampleSize: 61,
    completedOrderCount: 70,
  },
};

// --- Directory pages --------------------------------------------------------

export const MOCK_FACTORY_DIRECTORY_PAGE: FactoryDirectoryPage = {
  items: [
    HANGZHOU_PRECISION_MOULDS,
    COIMBATORE_TEXTILE_ODM,
    IZMIR_FOOD_PACKING,
    BAC_NINH_ASSEMBLY,
    MONTERREY_METAL_FORMING,
  ],
  // `hasMore: false` with a null cursor is the honest end-of-list. `CursorPageControl` renders
  // nothing for this pair, which is the behaviour to see by default — a Next button that navigates
  // to a page the server cannot build is worse than a missing one.
  page: { nextCursor: null, hasMore: false },
};

/**
 * The empty directory. Point `listStoreFactories` at this to reach `StoreEmptyPanel`.
 *
 * Note it is NOT the same branch as a filter that excluded everything: the page distinguishes the
 * two by `appliedFilterCount`, and only the filtered one offers a way to widen.
 */
export const MOCK_FACTORY_DIRECTORY_PAGE_EMPTY: FactoryDirectoryPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

/** Slugs for `generateStaticParams`. Must stay non-empty — see `withSentinelValues`. */
export const MOCK_FEATURED_FACTORY_SLUGS: readonly string[] = MOCK_FACTORY_DIRECTORY_PAGE.items.map(
  (factory) => factory.slug,
);

// --- Details ----------------------------------------------------------------

const HANGZHOU_DETAIL: FactoryDetail = {
  factory: HANGZHOU_PRECISION_MOULDS,
  productionLines: [
    {
      id: "line_hz_tooling",
      name: "Tool room",
      processSummary: "CNC milling, EDM and mould polishing. P20 and H13 steels.",
      monthlyCapacityUnits: 14,
      unitLabel: "moulds",
    },
    {
      id: "line_hz_injection",
      name: "Injection hall A",
      processSummary: "Twelve presses, 90–650 tonne. ABS, PP, PC/ABS.",
      monthlyCapacityUnits: 900_000,
      unitLabel: "pieces",
    },
    {
      id: "line_hz_finishing",
      name: "Finishing",
      processSummary: "Pad printing, ultrasonic welding, manual deburring.",
      // Genuinely unmeasured. Rendering "0 pieces" here would say this line produces nothing.
      monthlyCapacityUnits: null,
      unitLabel: "pieces",
    },
  ],
  certificationRecords: [
    {
      certification: "iso_9001",
      certificateNumber: "CN-Q-118342",
      issuingBody: "SGS",
      validFrom: "2024-03-11",
      validUntil: "2027-03-10",
    },
    {
      // LAPSED. `validUntil` is in the past relative to every other date in this fixture set, so the
      // renderer's "expired" branch is reachable without editing anything.
      certification: "iso_14001",
      certificateNumber: "CN-E-90455",
      issuingBody: "TÜV Rheinland",
      validFrom: "2022-01-20",
      validUntil: "2025-01-19",
    },
  ],
  sites: [
    {
      id: "site_hz_main",
      label: "Xiaoshan plant",
      countryCode: "CN",
      locality: "Hangzhou, Zhejiang",
      floorAreaSquareMetres: 18_400,
      productionStaffCount: 260,
    },
  ],
  samplePolicy: {
    offersSamples: true,
    sampleLeadTimeDays: 12,
    // A REAL FEE. Distinct from the free and the unstated cases below.
    sampleFeeInCents: 45_000,
    currency: "USD",
  },
  lastAuditedAt: "2026-02-17",
  exportMarkets: ["US", "DE", "GB", "AU", "JP"],
};

const COIMBATORE_DETAIL: FactoryDetail = {
  factory: COIMBATORE_TEXTILE_ODM,
  productionLines: [
    {
      id: "line_cb_knit",
      name: "Circular knitting",
      processSummary: "Single jersey, interlock and rib. 18–28 gauge.",
      monthlyCapacityUnits: 120_000,
      unitLabel: "pieces",
    },
    {
      id: "line_cb_dye",
      name: "Dye house",
      processSummary: "Reactive and GOTS-approved low-impact dyeing. Effluent treatment on site.",
      monthlyCapacityUnits: 90_000,
      unitLabel: "pieces",
    },
  ],
  certificationRecords: [
    {
      certification: "gots",
      certificateNumber: "IN-GOTS-77120",
      issuingBody: "Control Union",
      validFrom: "2025-06-01",
      validUntil: "2026-12-31",
    },
    {
      certification: "sedex_smeta",
      certificateNumber: null,
      issuingBody: "Sedex",
      validFrom: "2025-11-04",
      // NO EXPIRY RECORDED — which is NOT "valid forever". The renderer must say so rather than
      // leaving the reader to assume the optimistic reading.
      validUntil: null,
    },
    {
      certification: "iso_9001",
      certificateNumber: "IN-Q-40218",
      issuingBody: "BSI",
      validFrom: "2024-09-15",
      validUntil: "2027-09-14",
    },
  ],
  sites: [
    {
      id: "site_cb_main",
      label: "Peelamedu unit",
      countryCode: "IN",
      locality: "Coimbatore, Tamil Nadu",
      floorAreaSquareMetres: 11_200,
      productionStaffCount: 410,
    },
    {
      id: "site_cb_sampling",
      label: "Sampling studio",
      countryCode: "IN",
      locality: "Tiruppur, Tamil Nadu",
      floorAreaSquareMetres: 900,
      productionStaffCount: null,
    },
  ],
  samplePolicy: {
    offersSamples: true,
    sampleLeadTimeDays: 9,
    // GENUINELY FREE. Zero and `null` are two different answers and must not render alike.
    sampleFeeInCents: 0,
    currency: "USD",
  },
  lastAuditedAt: "2025-12-02",
  exportMarkets: ["GB", "NL", "US", "AE"],
};

const IZMIR_DETAIL: FactoryDetail = {
  factory: IZMIR_FOOD_PACKING,
  productionLines: [
    {
      id: "line_iz_pack",
      name: "Doypack line",
      processSummary: "Nitrogen-flushed stand-up pouches, 50 g to 1 kg.",
      monthlyCapacityUnits: 380_000,
      unitLabel: "pouches",
    },
  ],
  certificationRecords: [
    {
      certification: "fda_registered",
      certificateNumber: "FDA-18829301",
      issuingBody: "US FDA",
      validFrom: "2025-04-22",
      validUntil: "2027-04-21",
    },
    {
      certification: "iso_9001",
      certificateNumber: "TR-Q-5512",
      issuingBody: "TSE",
      validFrom: "2024-08-08",
      validUntil: "2027-08-07",
    },
    {
      certification: "ce_marking",
      certificateNumber: null,
      issuingBody: null,
      validFrom: null,
      validUntil: null,
    },
  ],
  sites: [
    {
      id: "site_iz_main",
      label: "Kemalpaşa facility",
      countryCode: "TR",
      locality: "İzmir",
      floorAreaSquareMetres: 6_800,
      productionStaffCount: 95,
    },
  ],
  samplePolicy: {
    offersSamples: true,
    sampleLeadTimeDays: null,
    // UNSTATED, and it must not read as free. A buyer who orders on that basis finds out at invoice.
    sampleFeeInCents: null,
    currency: "TRY",
  },
  lastAuditedAt: null,
  exportMarkets: ["DE", "GB", "SA"],
};

const BAC_NINH_DETAIL: FactoryDetail = {
  factory: BAC_NINH_ASSEMBLY,
  productionLines: [
    {
      id: "line_bn_assembly",
      name: "Assembly cell 1",
      processSummary: "Manual and semi-automated assembly, functional test, retail packing.",
      monthlyCapacityUnits: 60_000,
      unitLabel: "units",
    },
  ],
  certificationRecords: [
    {
      certification: "iso_9001",
      certificateNumber: "VN-Q-2201",
      issuingBody: "Bureau Veritas",
      validFrom: "2025-02-10",
      validUntil: "2028-02-09",
    },
    {
      certification: "bsci",
      certificateNumber: null,
      issuingBody: "amfori",
      validFrom: "2025-10-01",
      validUntil: "2026-09-30",
    },
  ],
  sites: [
    {
      id: "site_bn_main",
      label: "Que Vo industrial park",
      countryCode: "VN",
      locality: "Bac Ninh",
      floorAreaSquareMetres: 4_100,
      productionStaffCount: 130,
    },
  ],
  samplePolicy: {
    offersSamples: false,
    sampleLeadTimeDays: null,
    sampleFeeInCents: null,
    currency: "USD",
  },
  lastAuditedAt: null,
  exportMarkets: [],
};

const MONTERREY_DETAIL: FactoryDetail = {
  factory: MONTERREY_METAL_FORMING,
  productionLines: [
    {
      id: "line_mty_press",
      name: "Press shop",
      processSummary: "Progressive die stamping to 400 tonne. Mild and stainless steel.",
      monthlyCapacityUnits: 220_000,
      unitLabel: "parts",
    },
    {
      id: "line_mty_weld",
      name: "Weld cell",
      processSummary: "Robotic MIG, manual TIG, leak testing.",
      monthlyCapacityUnits: null,
      unitLabel: "assemblies",
    },
  ],
  certificationRecords: [
    {
      certification: "iso_9001",
      certificateNumber: "MX-Q-7781",
      issuingBody: "NSF",
      validFrom: "2023-05-30",
      // ALSO LAPSED, on an `unverified` organization — the pair a compliance filter must never
      // present as a pass.
      validUntil: "2026-05-29",
    },
  ],
  sites: [
    {
      id: "site_mty_main",
      label: "Apodaca plant",
      countryCode: "MX",
      locality: "Monterrey, Nuevo León",
      floorAreaSquareMetres: 9_600,
      productionStaffCount: 175,
    },
  ],
  samplePolicy: {
    offersSamples: true,
    sampleLeadTimeDays: 20,
    sampleFeeInCents: 12_500,
    currency: "USD",
  },
  lastAuditedAt: null,
  exportMarkets: ["US", "CA"],
};

/**
 * Detail fixtures by slug, for `resolveMockDetail`.
 *
 * A slug that is not a key here answers 404, exactly as the backend would — so the detail route's
 * `notFound()` path is reachable by typing a wrong slug rather than only in theory.
 */
export const MOCK_FACTORY_DETAILS_BY_SLUG: Readonly<Record<string, FactoryDetail>> = {
  "hangzhou-precision-moulds": HANGZHOU_DETAIL,
  "coimbatore-textile-studio": COIMBATORE_DETAIL,
  "izmir-food-packing": IZMIR_DETAIL,
  "bac-ninh-assembly-works": BAC_NINH_DETAIL,
  "monterrey-metal-forming": MONTERREY_DETAIL,
};

// --- Write response ---------------------------------------------------------

/**
 * What the mocked `POST …/inquiries` answers with.
 *
 * A FIXED ROW RATHER THAN AN ECHO OF THE INPUT, the same choice `MOCK_CREATED_SERVICE_OFFERING`
 * makes. Echoing would let the success screen show a reference that resolves to nothing, and the
 * first person to click through would find a 404 — which reads as a lost inquiry.
 *
 * `state: "draft"` is the whole point of the fixture. Nothing has been sent.
 */
export const MOCK_CREATED_FACTORY_INQUIRY: CreatedFactoryInquiry = {
  id: "finq_01JQZ4W8N2K3S7YB",
  reference: "FQ-2026-0418",
  factoryOrganizationId: "org_factory_hangzhou_precision",
  factorySlug: "hangzhou-precision-moulds",
  state: "draft",
  capabilityKind: "oem",
  productDescription: "Wall-mounted charger housing, ABS, 4 colourways.",
  createdAt: "2026-08-08T09:14:00.000Z",
};
