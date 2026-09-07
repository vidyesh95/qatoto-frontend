// Fixture for `chargeback-evidence.api.ts` (TRANSPORT: mock). One order, one thread, one
// shipment — enough to render every section of the export page. Every nested value is typed
// against the real schemas it stands in for (`OrderDetail`, `ThreadMessage`, `ShipmentDetail`),
// so a real backend response and this fixture are interchangeable as far as the page is concerned.

import type { OrderDetail } from "@/lib/store/orders.schemas";
import type { ThreadMessage } from "@/lib/store/messages.schemas";
import type { ShipmentDetail } from "@/lib/store/shipments.schemas";
import type { ChargebackEvidenceBundle } from "@/lib/store/chargeback-evidence.schemas";

const MOCK_ORDER: OrderDetail = {
  id: "order_mock_chargeback_01",
  buyerOrganizationId: "org_buyer_mock_01",
  counterpartyOrganizationId: "org_seller_mock_01",
  checkoutGroupId: null,
  source: "direct_checkout",
  state: "disputed",
  acceptedQuoteId: null,
  currency: "USD",
  subtotalInCents: 480000,
  taxInCents: 0,
  serviceFeeInCents: 9600,
  shippingInCents: 32000,
  discountInCents: 0,
  totalInCents: 521600,
  paymentTermsSnapshot: "net_30",
  incotermSnapshot: "FOB",
  requestedFreightModeSnapshot: "sea",
  buyerLegalNameSnapshot: "Kuberhunt Trading LLC",
  counterpartyLegalNameSnapshot: "Zhejiang Precision Components Co.",
  createdAt: "2026-06-12T09:14:00.000Z",
  productLines: [
    {
      id: "opl_mock_01",
      completionId: null,
      productId: "product_mock_01",
      titleSnapshot: "CNC-machined aluminum enclosure, IP65",
      variantNameSnapshot: "Matte black",
      specificationSnapshot: "6061-T6, 220x140x60mm, anodized",
      quantityOrdered: 500,
      quantityReserved: 0,
      quantityFulfilled: 500,
      quantityCancelled: 0,
      quantityRefunded: 0,
      unitPriceInCents: 960,
      lineTotalInCents: 480000,
      siblingOrder: 0,
    },
  ],
  serviceLines: [],
  completionIds: [],
  settlementRail: "direct_processor",
  hasEscrowProtection: false,
  paymentIntentId: "pi_mock_chargeback_01",
};

const MOCK_MESSAGES: ThreadMessage[] = [
  {
    id: "msg_mock_01",
    threadId: "thread_mock_01",
    authorOrganizationId: "org_buyer_mock_01",
    authorMemberId: "member_mock_buyer_01",
    bodyText: "Half the enclosures arrived with cracked mounting tabs. Photos attached.",
    createdAt: "2026-07-02T15:40:00.000Z",
    encryptedDocumentIds: ["doc_mock_photo_01", "doc_mock_photo_02"],
  },
  {
    id: "msg_mock_02",
    threadId: "thread_mock_01",
    authorOrganizationId: "org_seller_mock_01",
    authorMemberId: "member_mock_seller_01",
    bodyText:
      "We can requote a replacement batch, but the freight forwarder logged no damage on pickup.",
    createdAt: "2026-07-03T08:05:00.000Z",
    encryptedDocumentIds: [],
  },
];

const MOCK_SHIPMENT: ShipmentDetail = {
  id: "shipment_mock_01",
  orderId: "order_mock_chargeback_01",
  state: "delivered",
  originCountryCode: "CN",
  originLocality: "Ningbo",
  destinationCountryCode: "US",
  destinationLocality: "Long Beach, CA",
  packageCount: 20,
  totalWeightGrams: 410000,
  createdAt: "2026-06-13T02:00:00.000Z",
  productLines: [{ id: "spl_mock_01", orderProductLineId: "opl_mock_01", quantity: 500 }],
  events: [
    {
      id: "sev_mock_01",
      eventKind: "created",
      occurredAt: "2026-06-13T02:00:00.000Z",
      description: null,
    },
    {
      id: "sev_mock_02",
      eventKind: "delivered",
      occurredAt: "2026-06-29T18:22:00.000Z",
      description: "Signed for at dock 4",
    },
  ],
  version: 3,
  legs: [
    {
      id: "leg_mock_01",
      shipmentId: "shipment_mock_01",
      sequence: 0,
      mode: "sea",
      state: "completed",
      version: 3,
      originCountryCode: "CN",
      originLocality: "Ningbo",
      originLocationIdentifier: "CNNGB",
      destinationCountryCode: "US",
      destinationLocality: "Long Beach, CA",
      destinationLocationIdentifier: "USLGB",
      logisticsEngagementId: "engagement_mock_01",
      carrierReference: "MOCK-BOL-88213",
      trackingReference: "MOCKTRK998877",
      estimatedDepartureAt: "2026-06-14T00:00:00.000Z",
      estimatedArrivalAt: "2026-06-28T00:00:00.000Z",
      actualDepartureAt: "2026-06-14T06:12:00.000Z",
      actualArrivalAt: "2026-06-29T14:50:00.000Z",
      createdAt: "2026-06-13T02:00:00.000Z",
    },
  ],
};

export function buildMockChargebackEvidenceBundle(orderId: string): ChargebackEvidenceBundle {
  return {
    order: { ...MOCK_ORDER, id: orderId },
    messages: MOCK_MESSAGES,
    shipments: [MOCK_SHIPMENT],
    generatedAt: new Date().toISOString(),
    exportedByStaffEmail: "staff@qatoto.com",
    exportAuditId: "audit_mock_01",
  };
}
