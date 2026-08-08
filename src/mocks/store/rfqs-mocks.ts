// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `rfqs.api.ts` swaps `resolveMockRead` for `getJson`.
//
// THE FIXTURES ARE ORGANISED BY `callerRelation`, because that is the field this batch turns on. One RFQ
// where the caller is the buyer, one where they are an invited provider, one where they are a matched
// provider — so the same `rfq-detail.tsx` can be checked against all three without swapping accounts.
//
// The service lines also cover ALL NINE provider kinds across the three RFQs, since the requirement panel
// switches exhaustively on `providerKind`. An arm with no fixture is an arm nobody has watched render.

import type { RfqDetail, RfqListPage, RfqServiceLine, RfqSummary } from "@/lib/store/rfqs.schemas";

const RFQ_HOTEL_FITOUT: RfqSummary = {
  id: "rfq_mock_1",
  buyerOrganizationId: "org_buyer_mock",
  title: "Hotel fit-out, 120 rooms — seating and lighting",
  state: "open",
  visibility: "invited_only",
  responseDeadlineAt: "2026-08-20T23:59:00.000Z",
  settlementCurrency: "USD",
  openedAt: "2026-08-02T09:00:00.000Z",
  closedAt: null,
  createdAt: "2026-08-01T14:00:00.000Z",
  updatedAt: "2026-08-02T09:00:00.000Z",
};

/** A DRAFT — editable, not yet visible to anybody, no deadline set. */
const RFQ_DRAFT: RfqSummary = {
  id: "rfq_mock_2",
  buyerOrganizationId: "org_buyer_mock",
  title: "Q4 packaging and inland freight",
  state: "draft",
  visibility: "matched_providers",
  responseDeadlineAt: null,
  settlementCurrency: "EUR",
  openedAt: null,
  closedAt: null,
  createdAt: "2026-08-06T11:20:00.000Z",
  updatedAt: "2026-08-07T16:05:00.000Z",
};

/** AWARDED — terminal, so nothing may be edited, opened or closed. */
const RFQ_AWARDED: RfqSummary = {
  id: "rfq_mock_3",
  buyerOrganizationId: "org_far_east_retail",
  title: "Container line-haul, Shenzhen to Rotterdam, Q3",
  state: "awarded",
  visibility: "matched_providers",
  responseDeadlineAt: "2026-07-15T23:59:00.000Z",
  settlementCurrency: "USD",
  openedAt: "2026-07-01T08:00:00.000Z",
  closedAt: "2026-07-16T00:00:00.000Z",
  createdAt: "2026-06-28T10:00:00.000Z",
  updatedAt: "2026-07-18T12:00:00.000Z",
};

/** `GET /commerce/rfqs/mine` — the caller as BUYER. */
export const MOCK_BUYER_RFQ_LIST: RfqListPage = {
  items: [RFQ_HOTEL_FITOUT, RFQ_DRAFT],
  page: { nextCursor: null, hasMore: false },
};

/**
 * `GET /commerce/provider/rfqs` — the caller's provider work queue.
 *
 * A DIFFERENT ENDPOINT with different rows, not the buyer list filtered. Note the draft is absent: a
 * draft is invisible to providers, and a queue that showed one would leak a requirement before the buyer
 * chose to publish it.
 */
export const MOCK_PROVIDER_RFQ_LIST: RfqListPage = {
  items: [RFQ_AWARDED],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_RFQ_LIST_EMPTY: RfqListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Service lines, covering all nine kinds ---------------------------------

const SERVICE_LINE_FREIGHT: RfqServiceLine = {
  id: "rsl_1",
  rfqId: "rfq_mock_1",
  providerKind: "freight_forwarder",
  serviceOfferingId: "off_meridian_fcl",
  linkedProductLineId: "rpl_1",
  requirementSummary: "Ocean freight for the seating, consolidated where possible.",
  siblingOrder: 0,
  createdAt: "2026-08-01T14:05:00.000Z",
  requirementDetail: {
    providerKind: "freight_forwarder",
    transportModes: ["sea"],
    originCountryCode: "CN",
    destinationCountryCode: "IN",
    requiresConsolidation: true,
    // `requiresHazardousGoodsSupport` OMITTED — absent means "not asked for", which is different from
    // asking for it and saying no. The panel must not print "No" for an unasked requirement.
    cargoDescription: "Flat-packed steel seating, 120 rooms",
  },
};

const SERVICE_LINE_CUSTOMS: RfqServiceLine = {
  id: "rsl_2",
  rfqId: "rfq_mock_1",
  providerKind: "customs_broker",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "Import clearance at Nhava Sheva.",
  siblingOrder: 1,
  createdAt: "2026-08-01T14:06:00.000Z",
  requirementDetail: {
    providerKind: "customs_broker",
    jurisdictions: ["IN"],
    importRequired: true,
    exportRequired: false,
    commoditySummary: null,
  },
};

const SERVICE_LINE_INSPECTION: RfqServiceLine = {
  id: "rsl_3",
  rfqId: "rfq_mock_1",
  providerKind: "inspection_agency",
  serviceOfferingId: null,
  linkedProductLineId: "rpl_1",
  requirementSummary: "Pre-shipment inspection before each container loads.",
  siblingOrder: 2,
  createdAt: "2026-08-01T14:07:00.000Z",
  requirementDetail: {
    providerKind: "inspection_agency",
    preShipment: true,
    loadingSupervision: true,
    // `preProduction` and `duringProduction` omitted — not asked for.
  },
};

const SERVICE_LINE_INSURANCE: RfqServiceLine = {
  id: "rsl_4",
  rfqId: "rfq_mock_1",
  providerKind: "insurance_provider",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "All-risk cover for the full consignment value.",
  siblingOrder: 3,
  createdAt: "2026-08-01T14:08:00.000Z",
  requirementDetail: {
    providerKind: "insurance_provider",
    cargoCoverageClasses: ["All risks (ICC A)"],
    coverageLimitInCents: 250_000_00,
    currency: "USD",
  },
};

const SERVICE_LINE_LAB: RfqServiceLine = {
  id: "rsl_5",
  rfqId: "rfq_mock_1",
  providerKind: "testing_certification_lab",
  serviceOfferingId: null,
  linkedProductLineId: "rpl_1",
  requirementSummary: "EN 16139 certification for contract seating.",
  siblingOrder: 4,
  createdAt: "2026-08-01T14:09:00.000Z",
  requirementDetail: {
    providerKind: "testing_certification_lab",
    standards: ["EN 16139", "EN 1728"],
    laboratoryLocationPreference: null,
  },
};

const SERVICE_LINE_WAREHOUSE: RfqServiceLine = {
  id: "rsl_6",
  rfqId: "rfq_mock_2",
  providerKind: "warehouse_provider",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "Bonded staging near Rotterdam for six weeks.",
  siblingOrder: 0,
  createdAt: "2026-08-06T11:25:00.000Z",
  requirementDetail: {
    providerKind: "warehouse_provider",
    storageTypes: ["Bonded", "Racked pallet"],
    bondedStatusRequired: true,
    temperatureControlled: false,
    capacityUnits: "600 pallet positions",
  },
};

const SERVICE_LINE_MARKETING: RfqServiceLine = {
  id: "rsl_7",
  rfqId: "rfq_mock_2",
  providerKind: "marketing_agency",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "Trade-press programme for the Q4 range.",
  siblingOrder: 1,
  createdAt: "2026-08-06T11:26:00.000Z",
  requirementDetail: {
    providerKind: "marketing_agency",
    channels: ["Trade press", "Email"],
    targetRegions: ["Benelux", "Germany"],
    languageCapabilities: ["English", "Dutch", "German"],
  },
};

const SERVICE_LINE_FX: RfqServiceLine = {
  id: "rsl_8",
  rfqId: "rfq_mock_2",
  providerKind: "foreign_exchange_facilitator",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "EUR settlement against a CNY invoice.",
  siblingOrder: 2,
  createdAt: "2026-08-06T11:27:00.000Z",
  requirementDetail: {
    providerKind: "foreign_exchange_facilitator",
    currencyPairs: ["CNY/EUR"],
    settlementRails: ["SEPA"],
    notionalAmountInCents: 1_800_000_00,
    notionalCurrency: "EUR",
  },
};

const SERVICE_LINE_LOGISTICS: RfqServiceLine = {
  id: "rsl_9",
  rfqId: "rfq_mock_3",
  providerKind: "logistics_operator",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary: "Weekly block-train capacity, Q3.",
  siblingOrder: 0,
  createdAt: "2026-06-28T10:05:00.000Z",
  requirementDetail: {
    providerKind: "logistics_operator",
    transportModes: ["rail", "multimodal"],
    originCountryCode: "CN",
    destinationCountryCode: "NL",
    requiresHazardousGoodsSupport: false,
    cargoDescription: null,
  },
};

/**
 * A service line with NO typed requirement.
 *
 * `requirementDetail: null` is a real state — the buyer described it in prose and never filled a typed
 * form. Rendering it as "no requirement" would be wrong; the summary IS the requirement.
 */
const SERVICE_LINE_PROSE_ONLY: RfqServiceLine = {
  id: "rsl_10",
  rfqId: "rfq_mock_3",
  providerKind: "customs_broker",
  serviceOfferingId: null,
  linkedProductLineId: null,
  requirementSummary:
    "Export clearance from Shenzhen. We will share the commodity list once a provider is shortlisted.",
  siblingOrder: 1,
  createdAt: "2026-06-28T10:06:00.000Z",
  requirementDetail: null,
};

// --- Details ----------------------------------------------------------------

export const MOCK_RFQ_DETAILS_BY_ID: Readonly<Record<string, RfqDetail>> = {
  rfq_mock_1: {
    id: "rfq_mock_1",
    buyerOrganizationId: "org_buyer_mock",
    createdByMemberId: "mem_mock_1",
    title: RFQ_HOTEL_FITOUT.title,
    description:
      "Fitting out 120 rooms in two phases. Seating and bedside lighting, plus the freight, customs, inspection, insurance and certification around them.",
    state: "open",
    visibility: "invited_only",
    responseDeadlineAt: "2026-08-20T23:59:00.000Z",
    desiredDeliveryStartsAt: "2026-10-01T00:00:00.000Z",
    desiredDeliveryEndsAt: "2026-11-15T00:00:00.000Z",
    destinationAddressId: "adr_mock_1",
    // Country and city only. The street lines are encrypted and do NOT appear on this read — a
    // provider quoting a lane needs a city, not a door.
    destinationCountryCode: "IN",
    destinationLocality: "Mumbai",
    settlementCurrency: "USD",
    openedAt: "2026-08-02T09:00:00.000Z",
    closedAt: null,
    awardedAt: null,
    createdAt: "2026-08-01T14:00:00.000Z",
    updatedAt: "2026-08-02T09:00:00.000Z",
    productLines: [
      {
        id: "rpl_1",
        rfqId: "rfq_mock_1",
        // Null: the buyer is sourcing something not listed on the platform, which is the point of an RFQ.
        productId: null,
        categoryId: "cat_chairs",
        requestedTitle: "Contract stacking chair, upholstered",
        requestedSpecificationSnapshot:
          "Steel frame, upholstered seat, stackable to 10, EN 16139 level 2",
        quantity: 480,
        unitLabel: "units",
        siblingOrder: 0,
        createdAt: "2026-08-01T14:02:00.000Z",
      },
      {
        id: "rpl_2",
        rfqId: "rfq_mock_1",
        productId: "prd_desk_lamp",
        categoryId: "cat_lighting",
        requestedTitle: "Bedside lamp, dimmable",
        requestedSpecificationSnapshot: "Brushed brass, dimmable, IN plug",
        quantity: 240,
        unitLabel: "units",
        siblingOrder: 1,
        createdAt: "2026-08-01T14:03:00.000Z",
      },
    ],
    serviceLines: [
      SERVICE_LINE_FREIGHT,
      SERVICE_LINE_CUSTOMS,
      SERVICE_LINE_INSPECTION,
      SERVICE_LINE_INSURANCE,
      SERVICE_LINE_LAB,
    ],
    documents: [
      { id: "rdoc_1", encryptedDocumentId: "edoc_mock_1", createdAt: "2026-08-01T14:10:00.000Z" },
    ],
    invitations: [
      {
        id: "rinv_1",
        providerOrganizationId: "org_meridian",
        state: "responded",
        sentAt: "2026-08-02T09:05:00.000Z",
        createdAt: "2026-08-02T09:00:00.000Z",
      },
      {
        id: "rinv_2",
        providerOrganizationId: "org_hansa",
        state: "read",
        sentAt: "2026-08-02T09:05:00.000Z",
        createdAt: "2026-08-02T09:00:00.000Z",
      },
      {
        id: "rinv_3",
        providerOrganizationId: "org_certus",
        // NOT SENT YET — a pending invitation is one the buyer created and has not dispatched.
        state: "pending",
        sentAt: null,
        createdAt: "2026-08-02T09:00:00.000Z",
      },
    ],
    callerRelation: "buyer",
  },

  rfq_mock_2: {
    id: "rfq_mock_2",
    buyerOrganizationId: "org_buyer_mock",
    createdByMemberId: "mem_mock_1",
    title: RFQ_DRAFT.title,
    description: null,
    state: "draft",
    visibility: "matched_providers",
    responseDeadlineAt: null,
    desiredDeliveryStartsAt: null,
    desiredDeliveryEndsAt: null,
    destinationAddressId: null,
    destinationCountryCode: null,
    destinationLocality: null,
    settlementCurrency: "EUR",
    openedAt: null,
    closedAt: null,
    awardedAt: null,
    createdAt: "2026-08-06T11:20:00.000Z",
    updatedAt: "2026-08-07T16:05:00.000Z",
    productLines: [],
    serviceLines: [SERVICE_LINE_WAREHOUSE, SERVICE_LINE_MARKETING, SERVICE_LINE_FX],
    documents: [],
    // A DRAFT WITH NO INVITATIONS. Nothing has been sent, which is what makes it still private.
    invitations: [],
    callerRelation: "buyer",
  },

  /**
   * The caller is an INVITED PROVIDER here.
   *
   * Note what a provider must NOT see on the same read the buyer sees: the invitation list is another
   * provider's competitive information, so this fixture carries only the caller's own row. If the
   * backend ever sends the full list to a provider, this page must still not render it.
   */
  rfq_mock_3: {
    id: "rfq_mock_3",
    buyerOrganizationId: "org_far_east_retail",
    createdByMemberId: "mem_other_1",
    title: RFQ_AWARDED.title,
    description: "Weekly capacity for Q3, awarded to a single carrier.",
    state: "awarded",
    visibility: "matched_providers",
    responseDeadlineAt: "2026-07-15T23:59:00.000Z",
    desiredDeliveryStartsAt: "2026-07-20T00:00:00.000Z",
    desiredDeliveryEndsAt: "2026-09-30T00:00:00.000Z",
    destinationAddressId: null,
    destinationCountryCode: "NL",
    destinationLocality: "Rotterdam",
    settlementCurrency: "USD",
    openedAt: "2026-07-01T08:00:00.000Z",
    closedAt: "2026-07-16T00:00:00.000Z",
    awardedAt: "2026-07-18T12:00:00.000Z",
    createdAt: "2026-06-28T10:00:00.000Z",
    updatedAt: "2026-07-18T12:00:00.000Z",
    productLines: [],
    serviceLines: [SERVICE_LINE_LOGISTICS, SERVICE_LINE_PROSE_ONLY],
    documents: [],
    invitations: [
      {
        id: "rinv_9",
        providerOrganizationId: "org_puda",
        state: "responded",
        sentAt: "2026-07-01T08:10:00.000Z",
        createdAt: "2026-07-01T08:00:00.000Z",
      },
    ],
    callerRelation: "invited_provider",
  },
};

export const MOCK_FEATURED_RFQ_IDS: readonly string[] = Object.keys(MOCK_RFQ_DETAILS_BY_ID);
