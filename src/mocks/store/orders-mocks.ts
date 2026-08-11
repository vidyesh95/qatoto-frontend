// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `orders.api.ts` and `fulfillment.api.ts` swap their stand-ins for `getJson`.
//
// THE FIXTURES ARE BUILT AROUND THE VIEWER RELATION, because that is what Batch E exists to prove. The
// mock caller belongs to `org_buyer_mock` AND `org_puda` — a buyer on some orders and the seller on
// others — so one component mounted on two routes can be checked against both branches without
// swapping any account. An organization that is only ever one side would hide the bug this batch is
// most likely to have.

import type {
  FulfillmentEngagement,
  OrderFulfillment,
  ServiceEngagement,
  ServiceEngagementListPage,
} from "@/lib/store/fulfillment.schemas";
import type {
  OrderDeliveryAddress,
  OrderDetail,
  OrderListPage,
  OrderSummary,
} from "@/lib/store/orders.schemas";

// `MOCK_VIEWER_ORGANIZATION_IDS` is GONE: `listViewerOrganizationIds` reads
// `GET /commerce/organizations/mine` for real now. The fixture claimed the caller was a buyer at
// `org_buyer_mock` and a seller at `org_puda`, which is what let one `order-detail.tsx` be viewed
// from both sides — against the real route a caller is whichever organizations it actually belongs
// to, and the order fixtures below are keyed on ids no real membership will match. Those are the
// next things to wire.

const BUYER_LEGAL_NAME = "Kuberhunt Procurement Pvt Ltd";
const PUDA_LEGAL_NAME = "Guangdong Puda Electrical Appliance Co., Ltd";
const NORDLYS_LEGAL_NAME = "Nordlys Industrial AS";

// --- Order summaries --------------------------------------------------------

/** The caller is the BUYER here, and the order is still cancellable. */
const ORDER_BUYER_CONFIRMED: OrderSummary = {
  id: "ord_mock_1",
  buyerOrganizationId: "org_buyer_mock",
  counterpartyOrganizationId: "org_nordlys",
  checkoutGroupId: "grp_mock_1",
  source: "direct_checkout",
  state: "confirmed",
  currency: "EUR",
  totalInCents: 74_900_00,
  buyerLegalNameSnapshot: BUYER_LEGAL_NAME,
  counterpartyLegalNameSnapshot: NORDLYS_LEGAL_NAME,
  createdAt: "2026-08-01T10:00:00.000Z",
  settlementRail: "direct_offline",
  hasEscrowProtection: false,
};

/** Buyer again, but `in_fulfillment` — past the point where cancelling is offered. */
const ORDER_BUYER_IN_FULFILMENT: OrderSummary = {
  id: "ord_mock_2",
  buyerOrganizationId: "org_buyer_mock",
  counterpartyOrganizationId: "org_puda",
  checkoutGroupId: "grp_mock_1",
  source: "direct_checkout",
  state: "in_fulfillment",
  currency: "USD",
  totalInCents: 166_144_80,
  buyerLegalNameSnapshot: BUYER_LEGAL_NAME,
  counterpartyLegalNameSnapshot: PUDA_LEGAL_NAME,
  createdAt: "2026-07-22T08:30:00.000Z",
  settlementRail: "direct_offline",
  hasEscrowProtection: false,
};

/**
 * The caller is the SELLER on this one, and it came from an accepted quote.
 *
 * `external_escrow` with `hasEscrowProtection: true` — the only fixture where anybody is holding the
 * money, so the copy that distinguishes the rails has something to distinguish.
 */
const ORDER_SELLER_ESCROW: OrderSummary = {
  id: "ord_mock_3",
  buyerOrganizationId: "org_far_east_retail",
  counterpartyOrganizationId: "org_puda",
  checkoutGroupId: null,
  source: "accepted_quote",
  state: "pending_payment",
  currency: "USD",
  totalInCents: 892_000_00,
  buyerLegalNameSnapshot: "Far East Retail Group Ltd",
  counterpartyLegalNameSnapshot: PUDA_LEGAL_NAME,
  createdAt: "2026-08-05T14:12:00.000Z",
  settlementRail: "external_escrow",
  hasEscrowProtection: true,
};

/** A disputed order, so the state that freezes fulfillment is reachable. */
const ORDER_SELLER_DISPUTED: OrderSummary = {
  id: "ord_mock_4",
  buyerOrganizationId: "org_far_east_retail",
  counterpartyOrganizationId: "org_puda",
  checkoutGroupId: "grp_mock_9",
  source: "direct_checkout",
  state: "disputed",
  currency: "USD",
  totalInCents: 41_200_00,
  buyerLegalNameSnapshot: "Far East Retail Group Ltd",
  counterpartyLegalNameSnapshot: PUDA_LEGAL_NAME,
  createdAt: "2026-06-30T09:00:00.000Z",
  settlementRail: "direct_offline",
  hasEscrowProtection: false,
};

/** `GET /commerce/orders` — the caller as BUYER. */
export const MOCK_BUYER_ORDER_LIST: OrderListPage = {
  items: [ORDER_BUYER_CONFIRMED, ORDER_BUYER_IN_FULFILMENT],
  page: { nextCursor: null, hasMore: false },
};

/** `GET /commerce/provider/orders` — the caller as SELLER. A different endpoint, different rows. */
export const MOCK_PROVIDER_ORDER_LIST: OrderListPage = {
  items: [ORDER_SELLER_ESCROW, ORDER_SELLER_DISPUTED, ORDER_BUYER_IN_FULFILMENT],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_ORDER_LIST_EMPTY: OrderListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Order details ----------------------------------------------------------

function toDetail(summary: OrderSummary, overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: summary.id,
    buyerOrganizationId: summary.buyerOrganizationId,
    counterpartyOrganizationId: summary.counterpartyOrganizationId,
    checkoutGroupId: summary.checkoutGroupId,
    source: summary.source,
    state: summary.state,
    acceptedQuoteId: summary.source === "accepted_quote" ? "qte_mock_7" : null,
    currency: summary.currency,
    subtotalInCents: summary.totalInCents,
    taxInCents: 0,
    serviceFeeInCents: 0,
    // Literal `0` because nothing is charged for freight. Not a gap — a decision.
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: summary.totalInCents,
    paymentTermsSnapshot: null,
    incotermSnapshot: null,
    buyerLegalNameSnapshot: summary.buyerLegalNameSnapshot,
    counterpartyLegalNameSnapshot: summary.counterpartyLegalNameSnapshot,
    createdAt: summary.createdAt,
    productLines: [],
    serviceLines: [],
    completionIds: [],
    settlementRail: summary.settlementRail,
    hasEscrowProtection: summary.hasEscrowProtection,
    ...overrides,
  };
}

export const MOCK_ORDER_DETAILS_BY_ID: Readonly<Record<string, OrderDetail>> = {
  ord_mock_1: toDetail(ORDER_BUYER_CONFIRMED, {
    productLines: [
      {
        id: "opl_1",
        // Null until the line completes — and it is the id the review write demands, so a null here
        // is why a "Leave a review" control must not appear yet.
        completionId: null,
        productId: "prd_office_chair",
        titleSnapshot: "Mesh-back task chair, adjustable arms",
        specificationSnapshot: "Mesh back, adjustable arms, 5-star nylon base",
        quantityOrdered: 100,
        quantityReserved: 100,
        quantityFulfilled: 0,
        quantityCancelled: 0,
        quantityRefunded: 0,
        unitPriceInCents: 74_900,
        lineTotalInCents: 74_900_00,
        siblingOrder: 0,
      },
    ],
  }),
  ord_mock_2: toDetail(ORDER_BUYER_IN_FULFILMENT, {
    productLines: [
      {
        id: "opl_2",
        // COMPLETED, so this is the line a buyer can review — and `completionIds` carries it too.
        completionId: "cmp_mock_1",
        productId: "prd_folding_chair",
        titleSnapshot: "Powder-coated steel folding chair, stackable",
        specificationSnapshot: "Raspberry red, powder-coated steel, stackable to 12",
        quantityOrdered: 120,
        quantityReserved: 120,
        quantityFulfilled: 120,
        quantityCancelled: 0,
        quantityRefunded: 0,
        unitPriceInCents: 123_079,
        lineTotalInCents: 147_694_80,
        siblingOrder: 0,
      },
      {
        id: "opl_3",
        completionId: null,
        productId: "prd_massage_chair",
        titleSnapshot: "Zero-gravity reclining massage chair",
        specificationSnapshot: "Sample unit, single",
        quantityOrdered: 1,
        quantityReserved: 0,
        // A PARTIALLY REFUNDED, PARTIALLY CANCELLED LINE. The five counters do not sum to each other,
        // and this row is the one that proves a client must not compute one from the others.
        quantityFulfilled: 0,
        quantityCancelled: 1,
        quantityRefunded: 1,
        unitPriceInCents: 1_845_000,
        lineTotalInCents: 18_450_00,
        siblingOrder: 1,
      },
    ],
    serviceLines: [
      {
        id: "osl_1",
        providerKind: "freight_forwarder",
        titleSnapshot: "FCL ocean freight, South China to North Europe",
        scopeSnapshot: "One 40ft container, Yantian to Rotterdam, customs excluded",
        feeInCents: 185_000,
        siblingOrder: 0,
      },
    ],
    completionIds: ["cmp_mock_1"],
  }),
  ord_mock_3: toDetail(ORDER_SELLER_ESCROW, {
    productLines: [
      {
        id: "opl_4",
        completionId: null,
        // Null `productId`: a quote-originated line for something that was never a catalog listing.
        productId: null,
        titleSnapshot: "Custom banquet chair, 2,000 units, buyer specification",
        specificationSnapshot: "Per drawing FER-2026-11, powder-coated RAL 3020",
        quantityOrdered: 2_000,
        quantityReserved: 0,
        quantityFulfilled: 0,
        quantityCancelled: 0,
        quantityRefunded: 0,
        unitPriceInCents: 44_600,
        lineTotalInCents: 892_000_00,
        siblingOrder: 0,
      },
    ],
  }),
  ord_mock_4: toDetail(ORDER_SELLER_DISPUTED, {
    productLines: [
      {
        id: "opl_5",
        completionId: "cmp_mock_2",
        productId: "prd_desk_lamp",
        titleSnapshot: "Brass desk lamp, dimmable",
        specificationSnapshot: "Brushed brass, dimmable, EU plug",
        quantityOrdered: 200,
        quantityReserved: 200,
        quantityFulfilled: 200,
        quantityCancelled: 0,
        quantityRefunded: 40,
        unitPriceInCents: 20_600,
        lineTotalInCents: 41_200_00,
        siblingOrder: 0,
      },
    ],
    completionIds: ["cmp_mock_2"],
  }),
};

/**
 * The decrypted delivery address, behind the audited reveal.
 *
 * Deliberately only ONE fixture, for the one order a seller is looking at — a map keyed by every order
 * would suggest this is data a page can hold, and it is not: every read of it writes an audit entry to
 * the buyer's stream.
 */
export const MOCK_ORDER_DELIVERY_ADDRESS: OrderDeliveryAddress = {
  recipientName: "Priya Raman",
  phone: "+91 98200 41122",
  streetLines: ["Unit 14, Kuberhunt Works", "Andheri East Industrial Estate"],
  locality: "Mumbai",
  region: "MH",
  postalCode: "400093",
  countryCode: "IN",
};

// --- Engagements ------------------------------------------------------------

/**
 * THE VIEWER IS THE PROVIDER ON THIS ONE, and that is the whole reason it is here.
 *
 * Every other engagement fixture has the viewer as the buyer, which left the provider's transition
 * branch — `scheduled`, `in_progress`, `awaiting_buyer`, and NOT `completed` — unreachable in the
 * browser. An untested branch on a surface where the wrong button lets a provider sign off its own
 * deliverable is not a branch worth shipping unseen, so `providerOrganizationId` is one of the
 * viewer's organizations here and the buyer is somebody else.
 */
const ENGAGEMENT_FREIGHT: ServiceEngagement = {
  id: "eng_mock_1",
  buyerOrganizationId: "org_far_east_retail",
  providerOrganizationId: "org_puda",
  orderId: "ord_mock_2",
  orderServiceLineId: "osl_1",
  providerKind: "freight_forwarder",
  state: "in_progress",
  titleSnapshot: "FCL ocean freight, South China to North Europe",
  scopeSnapshot: "One 40ft container, Yantian to Rotterdam, customs excluded",
  scheduledAt: "2026-07-25T00:00:00.000Z",
  startedAt: "2026-07-28T06:00:00.000Z",
  completedAt: null,
  cancelledAt: null,
  createdAt: "2026-07-22T08:31:00.000Z",
};

/**
 * `awaiting_buyer` — the state that decides who is blocked.
 *
 * On the buyer's route this must offer "accept the work"; on the provider's it must say the provider is
 * waiting. One state, two different pages, which is precisely the dual-surface case.
 */
const ENGAGEMENT_INSPECTION_AWAITING_BUYER: ServiceEngagement = {
  id: "eng_mock_2",
  buyerOrganizationId: "org_buyer_mock",
  providerOrganizationId: "org_certus",
  orderId: "ord_mock_2",
  orderServiceLineId: "osl_2",
  providerKind: "inspection_agency",
  state: "awaiting_buyer",
  titleSnapshot: "Pre-shipment inspection, furniture and fixtures",
  scopeSnapshot: "AQL 2.5 sampling, photo report inside 48 hours of loading",
  scheduledAt: "2026-07-24T00:00:00.000Z",
  startedAt: "2026-07-26T03:00:00.000Z",
  completedAt: null,
  cancelledAt: null,
  createdAt: "2026-07-22T08:32:00.000Z",
};

/** CANCELLED WITH A `startedAt` SET — the row that proves these instants are not a progress bar. */
const ENGAGEMENT_LAB_CANCELLED: ServiceEngagement = {
  id: "eng_mock_3",
  buyerOrganizationId: "org_buyer_mock",
  providerOrganizationId: "org_apex_labs",
  orderId: "ord_mock_2",
  orderServiceLineId: "osl_3",
  providerKind: "testing_certification_lab",
  state: "cancelled",
  titleSnapshot: "EN 16139 seating strength and durability test",
  scopeSnapshot: "Level 2 non-domestic seating, full report",
  scheduledAt: "2026-07-20T00:00:00.000Z",
  startedAt: "2026-07-21T09:00:00.000Z",
  completedAt: null,
  cancelledAt: "2026-07-23T11:00:00.000Z",
  createdAt: "2026-07-19T15:00:00.000Z",
};

export const MOCK_ENGAGEMENT_LIST: ServiceEngagementListPage = {
  items: [ENGAGEMENT_FREIGHT, ENGAGEMENT_INSPECTION_AWAITING_BUYER, ENGAGEMENT_LAB_CANCELLED],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_ENGAGEMENTS_BY_ID: Readonly<Record<string, ServiceEngagement>> = {
  eng_mock_1: ENGAGEMENT_FREIGHT,
  eng_mock_2: ENGAGEMENT_INSPECTION_AWAITING_BUYER,
  eng_mock_3: ENGAGEMENT_LAB_CANCELLED,
};

// --- Fulfillment ------------------------------------------------------------

function toFulfillmentEngagement(engagement: ServiceEngagement): FulfillmentEngagement {
  return {
    ...engagement,
    executionContractState: "snapshotted",
    executionContractProvenance: "quote_revision",
    requiresDeliverableNormalization: false,
    version: 3,
  };
}

export const MOCK_ORDER_FULFILLMENTS_BY_ID: Readonly<Record<string, OrderFulfillment>> = {
  ord_mock_2: {
    orderId: "ord_mock_2",
    orderState: "in_fulfillment",
    // `attention_required` rather than `in_progress`, because one engagement is awaiting the buyer and
    // another predates typed snapshots. Something needs a human; nothing has failed.
    overallState: "attention_required",
    progress: { completedUnits: 120, totalUnits: 121, basisPoints: 9_917 },
    shipments: [
      {
        id: "shp_mock_1",
        state: "in_transit",
        version: 4,
        legs: [
          {
            id: "leg_mock_1",
            shipmentId: "shp_mock_1",
            sequence: 0,
            mode: "sea",
            state: "in_transit",
            version: 2,
            originCountryCode: "CN",
            originLocality: "Shenzhen",
            originLocationIdentifier: "CNYTN",
            destinationCountryCode: "NL",
            destinationLocality: "Rotterdam",
            destinationLocationIdentifier: "NLRTM",
            logisticsEngagementId: "eng_mock_1",
            carrierReference: "MAEU-4471820",
            trackingReference: "MSKU7741183",
            estimatedDepartureAt: "2026-07-28T06:00:00.000Z",
            estimatedArrivalAt: "2026-08-22T00:00:00.000Z",
            actualDepartureAt: "2026-07-28T11:40:00.000Z",
            // NULL: it has not arrived. The estimate above must never be shown in this field's place.
            actualArrivalAt: null,
            createdAt: "2026-07-25T00:00:00.000Z",
          },
          {
            id: "leg_mock_2",
            shipmentId: "shp_mock_1",
            sequence: 1,
            mode: "land",
            state: "planned",
            version: 1,
            originCountryCode: "NL",
            originLocality: "Rotterdam",
            originLocationIdentifier: "NLRTM",
            destinationCountryCode: "IN",
            destinationLocality: "Mumbai",
            destinationLocationIdentifier: null,
            // Null: the seller is moving this leg themselves, NOT that it is unassigned.
            logisticsEngagementId: null,
            carrierReference: null,
            trackingReference: null,
            estimatedDepartureAt: null,
            estimatedArrivalAt: null,
            actualDepartureAt: null,
            actualArrivalAt: null,
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      },
    ],
    engagements: [
      toFulfillmentEngagement(ENGAGEMENT_FREIGHT),
      toFulfillmentEngagement(ENGAGEMENT_INSPECTION_AWAITING_BUYER),
      {
        ...toFulfillmentEngagement(ENGAGEMENT_LAB_CANCELLED),
        // The legacy value the attention list surfaces — its deliverables cannot be read back.
        executionContractState: "legacy_missing_snapshot",
        executionContractProvenance: null,
        requiresDeliverableNormalization: true,
      },
    ],
    attentionItems: [
      { kind: "engagement_awaiting_buyer", engagementId: "eng_mock_2" },
      { kind: "legacy_missing_snapshot", engagementId: "eng_mock_3" },
    ],
    computedAt: "2026-08-08T09:00:00.000Z",
  },
};
