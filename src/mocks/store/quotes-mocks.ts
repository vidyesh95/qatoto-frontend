// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `quotes.api.ts` swaps `resolveMockRead` for `getJson`.
//
// THE COMPARISON FIXTURE IS BUILT TO BE HARD TO COMPARE, on purpose. Three quotes against one RFQ where:
//
//   one is CHEAPEST but excludes the thing the others include,
//   one is in a DIFFERENT CURRENCY, so no total is comparable to the others,
//   one has NO SUBMITTED REVISION at all, so it has no money on it.
//
// A comparison table that looked good against three tidy same-currency quotes would be the wrong table.
// The one thing this surface must never do is compute a winner, and these rows are what makes that
// obvious rather than theoretical.

import type { QuoteComparisonItem, QuoteDetail } from "@/lib/store/quotes.schemas";

// --- Detail: an accepted quote where the provider appended AFTER acceptance --

/**
 * `latestRevisionNumber: 3` with `acceptedRevisionNumber: 2`.
 *
 * That gap is the whole reason acceptance snapshots a specific revision rather than "the latest": the
 * buyer accepted revision 2, the provider appended 3 afterwards, and the ORDER is bound to 2. A page that
 * showed the latest revision as "the accepted terms" would misreport what was agreed.
 */
const QUOTE_ACCEPTED: QuoteDetail = {
  id: "qte_mock_1",
  rfqId: "rfq_mock_3",
  providerOrganizationId: "org_puda",
  status: "accepted",
  latestRevisionNumber: 3,
  acceptedRevisionNumber: 2,
  submittedAt: "2026-07-10T09:00:00.000Z",
  acceptedAt: "2026-07-18T12:00:00.000Z",
  declinedAt: null,
  withdrawnAt: null,
  expiredAt: null,
  createdAt: "2026-07-05T08:00:00.000Z",
  latestRevision: {
    revisionNumber: 3,
    currency: "USD",
    validityDeadlineAt: "2026-08-30T23:59:00.000Z",
    subtotalInCents: 880_000_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    // NON-ZERO SHIPPING, which only ever enters this system through a provider typing it onto a quote.
    // Checkout writes literal `0`; a quote is where freight can actually be priced.
    shippingInCents: 12_000_00,
    discountInCents: 0,
    totalInCents: 892_000_00,
    submittedAt: "2026-07-17T14:00:00.000Z",
    paymentTerms: "30% deposit, balance against B/L copy",
    incoterm: "FOB Shenzhen",
    notes: "Rate held to 30 August. Container availability confirmed weekly.",
    productLines: [
      {
        id: "qpl_1",
        rfqProductLineId: "rpl_x",
        quantity: 2_000,
        unitPriceInCents: 44_000,
        lineTotalInCents: 880_000_00,
        titleSnapshot: "Custom banquet chair, buyer specification",
        specificationSnapshot: "Per drawing FER-2026-11, powder-coated RAL 3020",
        leadTimeDays: 45,
        exclusionsSnapshot: "Excludes destination handling and duties.",
        siblingOrder: 0,
      },
    ],
    serviceLines: [
      {
        id: "qsl_1",
        rfqServiceLineId: "rsl_9",
        providerKind: "logistics_operator",
        feeInCents: 12_000_00,
        titleSnapshot: "Block-train capacity, Shenzhen to Rotterdam",
        scopeSnapshot: "Weekly departures, 40ft high-cube",
        leadTimeDays: 22,
        exclusionsSnapshot: null,
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "logistics_operator",
          transportModes: ["rail", "multimodal"],
          originCountryCode: "CN",
          destinationCountryCode: "NL",
          estimatedTransitDays: 22,
        },
        deliverables: [
          {
            id: "qd_1",
            sequence: 0,
            title: "Booking confirmation with container numbers",
            isRequired: true,
            dueAt: "2026-08-01T00:00:00.000Z",
          },
          {
            id: "qd_2",
            sequence: 1,
            title: "Bill of lading copy",
            isRequired: true,
            // Null due date on a required deliverable — it is owed, but no date was agreed. Not the
            // same as optional, and a table that sorted by date would drop it.
            dueAt: null,
          },
        ],
        siblingOrder: 0,
      },
    ],
  },
};

/** A live submitted quote the buyer can act on, with an FX line carrying a fixed-point rate. */
const QUOTE_SUBMITTED: QuoteDetail = {
  id: "qte_mock_2",
  rfqId: "rfq_mock_1",
  providerOrganizationId: "org_meridian",
  status: "submitted",
  latestRevisionNumber: 2,
  acceptedRevisionNumber: null,
  submittedAt: "2026-08-06T10:00:00.000Z",
  acceptedAt: null,
  declinedAt: null,
  withdrawnAt: null,
  expiredAt: null,
  createdAt: "2026-08-03T09:00:00.000Z",
  latestRevision: {
    revisionNumber: 2,
    currency: "USD",
    validityDeadlineAt: "2026-08-25T23:59:00.000Z",
    subtotalInCents: 218_000_00,
    taxInCents: 0,
    serviceFeeInCents: 4_000_00,
    shippingInCents: 0,
    discountInCents: 8_000_00,
    totalInCents: 214_000_00,
    submittedAt: "2026-08-06T10:00:00.000Z",
    paymentTerms: "Net 30 from B/L date",
    incoterm: "CIF Nhava Sheva",
    notes: null,
    productLines: [],
    serviceLines: [
      {
        id: "qsl_2",
        rfqServiceLineId: "rsl_1",
        providerKind: "freight_forwarder",
        feeInCents: 185_000_00,
        titleSnapshot: "FCL ocean freight, Yantian to Nhava Sheva",
        scopeSnapshot: "Two 40ft containers, weekly sailing",
        leadTimeDays: 32,
        exclusionsSnapshot: "Excludes destination demurrage beyond 7 free days.",
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "freight_forwarder",
          transportModes: ["sea"],
          originCountryCode: "CN",
          destinationCountryCode: "IN",
          estimatedTransitDays: 32,
        },
        deliverables: [],
        siblingOrder: 0,
      },
      {
        id: "qsl_3",
        rfqServiceLineId: "rsl_11",
        providerKind: "foreign_exchange_facilitator",
        feeInCents: 33_000_00,
        titleSnapshot: "USD settlement against the INR invoice",
        scopeSnapshot: "Corridor rate held for 14 days",
        leadTimeDays: 1,
        exclusionsSnapshot: null,
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "foreign_exchange_facilitator",
          currencyPair: "USD/INR",
          // 88.4250 as an integer with an explicit scale. Rendering `rateFixedPoint` raw would show
          // "884250" — a rate wrong by four orders of magnitude. The trailing zero matters too: 88.4250
          // is a different quoted rate from 88.425.
          rateFixedPoint: 884_250,
          rateScale: 4,
          settlementRail: "SWIFT",
          notionalAmountInCents: 214_000_00,
          notionalCurrency: "USD",
        },
        deliverables: [],
        siblingOrder: 1,
      },
    ],
  },
};

/** A quote shell with NO revision — a provider who started and stopped. `latestRevision` is null. */
const QUOTE_EMPTY_SHELL: QuoteDetail = {
  id: "qte_mock_3",
  rfqId: "rfq_mock_1",
  providerOrganizationId: "org_hansa",
  // WITHDRAWN, not `draft` — see `COMPARISON_HANSA_NO_REVISION`. The buyer's comparison excludes drafts, so
  // a draft here would make the detail page unreachable from the row that links to it.
  status: "withdrawn",
  latestRevisionNumber: 0,
  acceptedRevisionNumber: null,
  submittedAt: null,
  acceptedAt: null,
  declinedAt: null,
  withdrawnAt: "2026-08-05T11:00:00.000Z",
  expiredAt: null,
  createdAt: "2026-08-04T11:00:00.000Z",
  latestRevision: null,
};

/** EXPIRED — the validity deadline passed. Nobody decided; the clock did. */
const QUOTE_EXPIRED: QuoteDetail = {
  id: "qte_mock_4",
  rfqId: "rfq_mock_1",
  providerOrganizationId: "org_certus",
  status: "expired",
  latestRevisionNumber: 1,
  acceptedRevisionNumber: null,
  submittedAt: "2026-07-20T09:00:00.000Z",
  acceptedAt: null,
  declinedAt: null,
  withdrawnAt: null,
  expiredAt: "2026-08-05T00:00:00.000Z",
  createdAt: "2026-07-19T09:00:00.000Z",
  latestRevision: {
    revisionNumber: 1,
    currency: "USD",
    validityDeadlineAt: "2026-08-05T00:00:00.000Z",
    subtotalInCents: 42_000_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 42_000_00,
    submittedAt: "2026-07-20T09:00:00.000Z",
    paymentTerms: null,
    incoterm: null,
    notes: null,
    productLines: [],
    serviceLines: [
      {
        id: "qsl_4",
        rfqServiceLineId: "rsl_3",
        providerKind: "inspection_agency",
        feeInCents: 42_000_00,
        titleSnapshot: "Pre-shipment inspection, two containers",
        scopeSnapshot: "AQL 2.5, photo report",
        leadTimeDays: 5,
        exclusionsSnapshot: null,
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "inspection_agency",
          // FREE-TEXT STAGES here, not the four booleans the RFQ requirement uses. A quote says what the
          // provider is including, in their own words.
          includedStages: ["During production", "Pre-shipment", "Container loading"],
        },
        deliverables: [],
        siblingOrder: 0,
      },
    ],
  },
};

/**
 * The two quotes that LOST `rfq_mock_3`, priced in EUR and GBP.
 *
 * They exist as full details, not just comparison rows, because the comparison table links every row to
 * `/store/quotes/:id` — a row whose detail 404s is a broken mock, and it would 404 exactly where a reviewer
 * clicks to check the multi-currency case.
 *
 * `declined` with a submitted revision is the ordinary losing shape: the buyer accepted someone else and
 * these two keep their numbers. The comparison must still show them (rule 4) — a buyer who remembers
 * £9,600 needs to find it, with the reason it is not an option.
 */
const QUOTE_DECLINED_EUR: QuoteDetail = {
  id: "qte_mock_5",
  rfqId: "rfq_mock_3",
  providerOrganizationId: "org_harbour",
  status: "declined",
  latestRevisionNumber: 1,
  acceptedRevisionNumber: null,
  submittedAt: "2026-07-08T09:00:00.000Z",
  acceptedAt: null,
  declinedAt: "2026-07-18T12:00:00.000Z",
  withdrawnAt: null,
  expiredAt: null,
  createdAt: "2026-07-06T09:00:00.000Z",
  latestRevision: {
    revisionNumber: 1,
    currency: "EUR",
    validityDeadlineAt: "2026-09-01T23:59:00.000Z",
    subtotalInCents: 18_400_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 18_400_00,
    submittedAt: "2026-07-08T09:00:00.000Z",
    paymentTerms: "Monthly, 14 days net",
    incoterm: null,
    notes: null,
    productLines: [],
    serviceLines: [
      {
        id: "qsl_5",
        rfqServiceLineId: "rsl_4",
        providerKind: "warehouse_provider",
        feeInCents: 18_400_00,
        titleSnapshot: "Bonded pallet storage, six weeks",
        scopeSnapshot: "120 euro pallets, bonded bay, weekly stock report",
        leadTimeDays: null,
        exclusionsSnapshot: "Excludes inbound unloading and any duty payable on exit from bond.",
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "warehouse_provider",
          storageTypes: ["Bonded", "Ambient"],
          // REQUIRED on a quote. `false` is a commitment — "not temperature controlled" — not a silence.
          temperatureControlled: false,
          capacityUnits: "120 pallets",
        },
        deliverables: [
          {
            id: "qd_1",
            sequence: 0,
            title: "Weekly stock report",
            isRequired: true,
            // A REQUIRED deliverable with no agreed date. Still owed; the page says so rather than
            // dropping the row along with the missing date.
            dueAt: null,
          },
        ],
        siblingOrder: 0,
      },
    ],
  },
};

const QUOTE_DECLINED_GBP: QuoteDetail = {
  id: "qte_mock_6",
  rfqId: "rfq_mock_3",
  providerOrganizationId: "org_lateral",
  status: "declined",
  latestRevisionNumber: 1,
  acceptedRevisionNumber: null,
  submittedAt: "2026-07-09T15:00:00.000Z",
  acceptedAt: null,
  declinedAt: "2026-07-18T12:00:00.000Z",
  withdrawnAt: null,
  expiredAt: null,
  createdAt: "2026-07-06T15:00:00.000Z",
  latestRevision: {
    revisionNumber: 1,
    currency: "GBP",
    validityDeadlineAt: "2026-09-10T23:59:00.000Z",
    subtotalInCents: 9_600_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 9_600_00,
    submittedAt: "2026-07-09T15:00:00.000Z",
    paymentTerms: "50% on brief sign-off, 50% on delivery",
    incoterm: null,
    notes: null,
    productLines: [],
    serviceLines: [
      {
        id: "qsl_6",
        rfqServiceLineId: "rsl_5",
        providerKind: "marketing_agency",
        feeInCents: 9_600_00,
        titleSnapshot: "Trade-press programme, Q4 range",
        scopeSnapshot: "Three trade titles, one launch feature, four months",
        leadTimeDays: 21,
        exclusionsSnapshot: "Excludes media spend, which is billed at cost by the publisher.",
        deliverableSnapshot: null,
        serviceDetail: {
          kind: "marketing_agency",
          channels: ["Trade press", "Email"],
          deliverablesSummary: "One launch feature, three product placements, monthly report",
        },
        deliverables: [
          {
            id: "qd_2",
            sequence: 0,
            title: "Launch feature placement",
            isRequired: true,
            dueAt: "2026-10-15T00:00:00.000Z",
          },
          {
            id: "qd_3",
            sequence: 1,
            title: "Retargeting pilot",
            isRequired: false,
            dueAt: null,
          },
        ],
        siblingOrder: 0,
      },
    ],
  },
};

export const MOCK_QUOTE_DETAILS_BY_ID: Readonly<Record<string, QuoteDetail>> = {
  qte_mock_1: QUOTE_ACCEPTED,
  qte_mock_2: QUOTE_SUBMITTED,
  qte_mock_3: QUOTE_EMPTY_SHELL,
  qte_mock_4: QUOTE_EXPIRED,
  qte_mock_5: QUOTE_DECLINED_EUR,
  qte_mock_6: QUOTE_DECLINED_GBP,
};

// --- Comparison, keyed by RFQ ----------------------------------------------

/**
 * Three quotes against `rfq_mock_1`, deliberately incommensurable.
 *
 * Meridian: USD 214,000, excludes destination demurrage.
 * Certus: USD 42,000 but EXPIRED — cheapest number on the page and not buyable.
 * Hansa: no submitted revision, so no money at all.
 *
 * There is no winner here and the table must not pick one.
 */
const COMPARISON_MERIDIAN: QuoteComparisonItem = {
  quoteId: "qte_mock_2",
  status: "submitted",
  provider: {
    organizationId: "org_meridian",
    displayName: "Meridian Freight Partners",
    slug: "meridian-freight",
  },
  latestSubmittedRevision: {
    revisionNumber: 2,
    currency: "USD",
    validityDeadlineAt: "2026-08-25T23:59:00.000Z",
    subtotalInCents: 218_000_00,
    taxInCents: 0,
    serviceFeeInCents: 4_000_00,
    shippingInCents: 0,
    discountInCents: 8_000_00,
    totalInCents: 214_000_00,
    submittedAt: "2026-08-06T10:00:00.000Z",
  },
  productLineSummaries: [],
  serviceLineSummaries: [
    {
      titleSnapshot: "FCL ocean freight, Yantian to Nhava Sheva",
      providerKind: "freight_forwarder",
      feeInCents: 185_000_00,
    },
    {
      titleSnapshot: "USD settlement against the INR invoice",
      providerKind: "foreign_exchange_facilitator",
      feeInCents: 33_000_00,
    },
  ],
};

const COMPARISON_CERTUS_EXPIRED: QuoteComparisonItem = {
  quoteId: "qte_mock_4",
  status: "expired",
  provider: {
    organizationId: "org_certus",
    displayName: "Certus Inspection Services",
    slug: "certus-inspection",
  },
  latestSubmittedRevision: {
    revisionNumber: 1,
    currency: "USD",
    validityDeadlineAt: "2026-08-05T00:00:00.000Z",
    subtotalInCents: 42_000_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 42_000_00,
    submittedAt: "2026-07-20T09:00:00.000Z",
  },
  productLineSummaries: [],
  serviceLineSummaries: [
    {
      titleSnapshot: "Pre-shipment inspection, two containers",
      providerKind: "inspection_agency",
      feeInCents: 42_000_00,
    },
  ],
};

/**
 * WITHDRAWN BEFORE ANYTHING WAS SUBMITTED, and the status is chosen for a reason worth stating.
 *
 * `withdrawn` is the only status that makes a null-revision row visible to a BUYER. `listQuotesForRfq`
 * excludes `draft` from the buyer's set, so a draft row could never appear on the page this fixture drives —
 * the three rows on `rfq_mock_1` are exactly what a buyer sees, and a draft among them would be a mock
 * rendering a view no caller can hold. A provider may withdraw a shell (`draft` is a mutable status), which
 * leaves precisely this: a real, buyer-visible quote with no money on it.
 */
const COMPARISON_HANSA_NO_REVISION: QuoteComparisonItem = {
  quoteId: "qte_mock_3",
  status: "withdrawn",
  provider: {
    organizationId: "org_hansa",
    displayName: "Hansa Customs Agency",
    slug: "hansa-customs",
  },
  // NULL. Nothing was ever submitted, so there is no money — and a table that rendered `$0` here would put
  // the cheapest-looking row against a provider who never quoted.
  latestSubmittedRevision: null,
  productLineSummaries: [],
  serviceLineSummaries: [],
};

/**
 * The quote that WON `rfq_mock_3`, as the comparison sees it.
 *
 * `revisionNumber: 3` while `QUOTE_ACCEPTED.acceptedRevisionNumber` is 2 — deliberately. The provider
 * appended a third revision after acceptance, so the newest submitted number is NOT the number the order is
 * bound to. Any UI that reads "latest" as "agreed" is wrong, and this fixture is where that shows.
 */
const COMPARISON_ACCEPTED: QuoteComparisonItem = {
  quoteId: "qte_mock_1",
  status: "accepted",
  provider: {
    organizationId: "org_puda",
    displayName: "Puda Furnishings",
    slug: "puda-furnishings",
  },
  latestSubmittedRevision: {
    revisionNumber: 3,
    currency: "USD",
    validityDeadlineAt: "2026-08-30T23:59:00.000Z",
    subtotalInCents: 880_000_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 12_000_00,
    discountInCents: 0,
    totalInCents: 892_000_00,
    submittedAt: "2026-07-17T14:00:00.000Z",
  },
  productLineSummaries: [
    {
      titleSnapshot: "Guest-room armchair, oak frame",
      quantity: 2_000,
      unitPriceInCents: 44_000,
      lineTotalInCents: 880_000_00,
    },
  ],
  serviceLineSummaries: [],
};

/** A EUR quote that lost `rfq_mock_3` — one of the two that make the multi-currency branch reachable. */
const COMPARISON_HARBOUR_EUR: QuoteComparisonItem = {
  quoteId: "qte_mock_5",
  status: "declined",
  provider: {
    organizationId: "org_harbour",
    displayName: "Harbour Bonded Storage",
    slug: "harbour-bonded-storage",
  },
  latestSubmittedRevision: {
    revisionNumber: 1,
    currency: "EUR",
    validityDeadlineAt: "2026-09-01T23:59:00.000Z",
    subtotalInCents: 18_400_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 18_400_00,
    submittedAt: "2026-07-08T09:00:00.000Z",
  },
  productLineSummaries: [],
  serviceLineSummaries: [
    {
      titleSnapshot: "Bonded pallet storage, six weeks",
      providerKind: "warehouse_provider",
      feeInCents: 18_400_00,
    },
  ],
};

const COMPARISON_LATERAL_GBP: QuoteComparisonItem = {
  quoteId: "qte_mock_6",
  status: "declined",
  provider: {
    organizationId: "org_lateral",
    displayName: "Lateral Trade Marketing",
    slug: "lateral-trade-marketing",
  },
  latestSubmittedRevision: {
    revisionNumber: 1,
    currency: "GBP",
    validityDeadlineAt: "2026-09-10T23:59:00.000Z",
    subtotalInCents: 9_600_00,
    taxInCents: 0,
    serviceFeeInCents: 0,
    shippingInCents: 0,
    discountInCents: 0,
    totalInCents: 9_600_00,
    submittedAt: "2026-07-09T15:00:00.000Z",
  },
  productLineSummaries: [],
  serviceLineSummaries: [
    {
      titleSnapshot: "Trade-press programme, Q4 range",
      providerKind: "marketing_agency",
      feeInCents: 9_600_00,
    },
  ],
};

/**
 * Comparison rows keyed by RFQ. EVERY ROW'S `quoteId` HAS A DETAIL FIXTURE and every row's `rfqId` in that
 * fixture points back here — the table links each row to `/store/quotes/:id`, so a one-way mapping is a
 * mock that 404s under the first click.
 *
 * The three RFQ states carry three genuinely different comparisons, and which state an RFQ is in decides
 * what it can hold:
 *   `rfq_mock_1` is OPEN — a live three-way decision, all USD, no winner, one expired and one unpriced.
 *   `rfq_mock_2` is a DRAFT, so it has NO quotes and cannot: a draft was never opened, so nobody could
 *     have answered it. This is the empty branch, empty for the right reason.
 *   `rfq_mock_3` is AWARDED — one accepted quote plus the two that lost, in three currencies.
 */
export const MOCK_QUOTE_COMPARISONS_BY_RFQ_ID: Readonly<
  Record<string, readonly QuoteComparisonItem[]>
> = {
  rfq_mock_1: [COMPARISON_MERIDIAN, COMPARISON_CERTUS_EXPIRED, COMPARISON_HANSA_NO_REVISION],
  rfq_mock_2: [],
  // THREE CURRENCIES against one RFQ. No total here is comparable to another and nothing may sum them —
  // this is the fixture that proves the currency grouping rather than describing it.
  rfq_mock_3: [COMPARISON_ACCEPTED, COMPARISON_HARBOUR_EUR, COMPARISON_LATERAL_GBP],
};

/**
 * Which RFQ a quote belongs to, so `/store/quotes/:id/compare` can resolve its comparison.
 *
 * MIRRORS `QuoteDetail.rfqId` exactly. Wired, this map disappears — the value comes off the quote read,
 * which is the second round trip that makes the RFQ-scoped route canonical.
 */
export const MOCK_RFQ_ID_BY_QUOTE_ID: Readonly<Record<string, string>> = {
  qte_mock_1: "rfq_mock_3",
  qte_mock_2: "rfq_mock_1",
  qte_mock_3: "rfq_mock_1",
  qte_mock_4: "rfq_mock_1",
  qte_mock_5: "rfq_mock_3",
  qte_mock_6: "rfq_mock_3",
};
