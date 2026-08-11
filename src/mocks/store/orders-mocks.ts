// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY, AND SHRINKING. The ONE-ORDER fixtures are GONE — `getOrder`, `getOrderFulfillment`,
// `getOrderArrivalWindow` and `cancelOrder` read the real backend, so `MOCK_ORDER_DETAILS_BY_ID` and
// `MOCK_ORDER_FULFILLMENTS_BY_ID` were deleted rather than left as fixtures nothing resolves. What is
// left is the two LISTS, the delivery-address reveal and the service engagements; this file is
// deleted when those swap their stand-ins for `getJson`.
//
// THE FIXTURES ARE BUILT AROUND THE VIEWER RELATION, because that is what Batch E exists to prove. The
// mock caller belongs to `org_buyer_mock` AND `org_puda` — a buyer on some orders and the seller on
// others — so one component mounted on two routes can be checked against both branches without
// swapping any account. An organization that is only ever one side would hide the bug this batch is
// most likely to have.

import type { ServiceEngagement, ServiceEngagementListPage } from "@/lib/store/fulfillment.schemas";
import type { OrderDeliveryAddress, OrderListPage, OrderSummary } from "@/lib/store/orders.schemas";

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
