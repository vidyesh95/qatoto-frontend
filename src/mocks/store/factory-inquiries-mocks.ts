// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when the inquiry calls in `factories.api.ts` swap `resolveMockRead` for
// `getJson`.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies` — annotation catches a missing REQUIRED
// field at compile time, and `resolveMockRead` parses each one through the real schema at runtime.
//
// WHAT THIS SET COVERS, which is the whole lifecycle rather than a happy row:
//
//   · ALL FOUR STATES — `draft`, `sent`, `answered`, `closed` — because each one enables a
//     different control, and a set with only `sent` in it ships three untested buttons;
//   · a `draft` with `threadId: null` and `sentAt: null` beside a `sent` one that has both, which
//     is the pair proving a renderer cannot print "sent" from a row that was never sent;
//   · an inquiry with almost every optional field OMITTED (null on the wire), because the composer
//     omits blanks rather than sending zeros and the read has to survive that;
//   · one with a `targetUnitPriceInCents` and one without — the second must not render as free.
//
// THE `received` PAGE CONTAINS NO `draft` ROW, and that is a contract fact rather than a choice
// about test data. Creating an inquiry notifies nobody (§16.5), so a factory that could see drafts
// would be reading mail nobody posted. A fixture that grew one would be modelling a backend bug.

import type { FactoryInquiry, FactoryInquiryListPage } from "@/lib/store/factories.schemas";

// --- Rows -------------------------------------------------------------------

/**
 * A DRAFT. Created, notified nobody, visible to its buyer alone.
 *
 * `threadId` AND `sentAt` ARE BOTH `null`, and they are the two fields a renderer must read before
 * saying anything about the factory having heard from you.
 */
const INQUIRY_DRAFT_ENCLOSURES: FactoryInquiry = {
  id: "minq_draft_enclosures",
  reference: "MI-2026-0841",
  state: "draft",
  factoryOrganizationId: "org_factory_hangzhou_precision",
  factorySlug: "hangzhou-precision-moulds",
  factoryDisplayName: "Hangzhou Precision Moulds",
  buyerOrganizationId: "org_buyer_northwind",
  buyerDisplayName: "Northwind Housewares",
  capabilityKind: "tooling_and_moulds",
  productDescription:
    "Two-part ABS enclosure for a countertop appliance, 180 × 120 × 95 mm, textured finish on the visible face. Drawings and a printed prototype exist.",
  estimatedAnnualQuantity: 24_000,
  unitLabel: "pieces",
  targetUnitPriceInCents: 310,
  currency: "USD",
  requiredCertifications: ["iso_9001"],
  desiredFirstDeliveryAt: "2026-11-30",
  notes: "Happy to pay for the tool outright if we own it. Need that in writing before we commit.",
  threadId: null,
  sentAt: null,
  answeredAt: null,
  closedAt: null,
  createdAt: "2026-08-07T15:12:00.000Z",
};

/**
 * SENT, and therefore carrying the thread the send opened.
 *
 * ALMOST EVERY OPTIONAL FIELD IS `null` HERE. The composer omits a blank rather than sending `0`
 * or `""`, so this is what a minimally-filled inquiry actually looks like on the way back — and a
 * renderer that assumes a quantity or a target price will find neither.
 */
const INQUIRY_SENT_KNITWEAR: FactoryInquiry = {
  id: "minq_sent_knitwear",
  reference: "MI-2026-0798",
  state: "sent",
  factoryOrganizationId: "org_factory_coimbatore_textile",
  factorySlug: "coimbatore-textile-studio",
  factoryDisplayName: "Coimbatore Textile Studio",
  buyerOrganizationId: "org_buyer_northwind",
  buyerDisplayName: "Northwind Housewares",
  capabilityKind: "odm",
  productDescription:
    "Organic cotton kitchen textiles — tea towels and aprons. No design yet; looking for a partner who has a range we can adapt.",
  estimatedAnnualQuantity: null,
  unitLabel: null,
  // UNSTATED, NOT FREE. Nobody has named a price, and a renderer printing "$0.00" here would be
  // asking the factory to work for nothing.
  targetUnitPriceInCents: null,
  currency: null,
  requiredCertifications: ["gots", "sedex_smeta"],
  desiredFirstDeliveryAt: null,
  notes: null,
  threadId: "thr_minq_sent_knitwear",
  sentAt: "2026-08-02T09:40:00.000Z",
  answeredAt: null,
  closedAt: null,
  createdAt: "2026-08-01T18:55:00.000Z",
};

/**
 * ANSWERED — the factory pressed the bookkeeping button.
 *
 * That mark means the row left the unworked part of their queue. It does NOT mean the buyer has
 * been written to; the actual reply is a message in `threadId`. Copy on this state must not claim
 * otherwise.
 */
const INQUIRY_ANSWERED_CARTONS: FactoryInquiry = {
  id: "minq_answered_cartons",
  reference: "MI-2026-0703",
  state: "answered",
  factoryOrganizationId: "org_factory_poznan_packaging",
  factorySlug: "poznan-packaging-works",
  factoryDisplayName: "Poznań Packaging Works",
  buyerOrganizationId: "org_buyer_northwind",
  buyerDisplayName: "Northwind Housewares",
  capabilityKind: "contract_manufacturing",
  productDescription:
    "Printed corrugated shippers, E-flute, four colours outside. Need a structural change from our current supplier's die line.",
  estimatedAnnualQuantity: 90_000,
  unitLabel: "cartons",
  targetUnitPriceInCents: 84,
  currency: "EUR",
  requiredCertifications: ["fsc"],
  desiredFirstDeliveryAt: "2026-10-15",
  notes: null,
  threadId: "thr_minq_answered_cartons",
  sentAt: "2026-07-19T11:02:00.000Z",
  answeredAt: "2026-07-22T08:30:00.000Z",
  closedAt: null,
  createdAt: "2026-07-18T16:44:00.000Z",
};

/** CLOSED. Either party may close from any state but `closed`, and a reason is optional. */
const INQUIRY_CLOSED_SILICONE: FactoryInquiry = {
  id: "minq_closed_silicone",
  reference: "MI-2026-0612",
  state: "closed",
  factoryOrganizationId: "org_factory_hangzhou_precision",
  factorySlug: "hangzhou-precision-moulds",
  factoryDisplayName: "Hangzhou Precision Moulds",
  buyerOrganizationId: "org_buyer_fjord",
  buyerDisplayName: "Fjord Kitchenware",
  capabilityKind: "oem",
  productDescription:
    "Food-grade silicone bakeware to our existing drawings. Two SKUs, one colour each.",
  estimatedAnnualQuantity: 15_000,
  unitLabel: "pieces",
  targetUnitPriceInCents: 210,
  currency: "USD",
  requiredCertifications: ["fda_registered"],
  desiredFirstDeliveryAt: "2026-09-01",
  notes: null,
  threadId: "thr_minq_closed_silicone",
  sentAt: "2026-06-14T07:20:00.000Z",
  answeredAt: "2026-06-17T12:05:00.000Z",
  closedAt: "2026-07-02T10:00:00.000Z",
  createdAt: "2026-06-13T13:31:00.000Z",
};

// --- Pages ------------------------------------------------------------------

/** `GET /commerce/factories/inquiries/mine` — the buyer's own, any state, drafts included. */
export const MOCK_OWN_FACTORY_INQUIRY_PAGE: FactoryInquiryListPage = {
  items: [INQUIRY_DRAFT_ENCLOSURES, INQUIRY_SENT_KNITWEAR, INQUIRY_ANSWERED_CARTONS],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_OWN_FACTORY_INQUIRY_PAGE_EMPTY: FactoryInquiryListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

/**
 * `GET /commerce/factories/inquiries/received` — the factory's queue.
 *
 * NO `draft` ROW, and never one. See the file header.
 */
export const MOCK_RECEIVED_FACTORY_INQUIRY_PAGE: FactoryInquiryListPage = {
  items: [INQUIRY_SENT_KNITWEAR, INQUIRY_ANSWERED_CARTONS, INQUIRY_CLOSED_SILICONE],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_RECEIVED_FACTORY_INQUIRY_PAGE_EMPTY: FactoryInquiryListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

/**
 * `GET /commerce/factories/inquiries/:inquiryId`, and what the three transitions answer with.
 *
 * KEYED BY ID RATHER THAN SLUG, which is what `resolveMockDetail` wants — an id it does not know
 * answers 404, so the detail page's `notFound()` branch is reachable by typing a wrong id rather
 * than by editing this file.
 */
export const MOCK_FACTORY_INQUIRIES_BY_ID: Readonly<Record<string, { inquiry: FactoryInquiry }>> = {
  minq_draft_enclosures: { inquiry: INQUIRY_DRAFT_ENCLOSURES },
  minq_sent_knitwear: { inquiry: INQUIRY_SENT_KNITWEAR },
  minq_answered_cartons: { inquiry: INQUIRY_ANSWERED_CARTONS },
  minq_closed_silicone: { inquiry: INQUIRY_CLOSED_SILICONE },
};
