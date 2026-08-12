// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for quotes: `GET /commerce/rfqs/:rfqId/quotes`, `GET /commerce/quotes/:quoteId`,
// `POST /commerce/quotes/:quoteId/accept`, `/decline` and `/withdraw`.
//
// Transcribed from `commerce-quotes.service.ts` — `QuoteDetailProjection`, `QuoteComparisonItem`,
// `QuoteRevisionMoneyProjection` and the eight-member `QuoteServiceDetailProjection` union.
//
// FOUR THINGS THIS SURFACE GETS RIGHT OR GETS WRONG, AND NOTHING IN BETWEEN:
//
//  1. AN ACCEPTED QUOTE IS IMMUTABLE, AND ACCEPTANCE IS THE MOMENT AN ORDER BECOMES ONE. Negotiation
//     appends revisions; it never edits one. So `acceptQuote` takes an `expectedRevision` and the server
//     refuses with `REVISION_CHANGED` if the provider appended since the buyer looked. That 409 is a
//     FINDING, not a retry — the buyer must see the new terms before accepting them.
//
//  2. THERE IS NO `callerRelation` HERE, unlike the RFQ read. `QuoteDetailProjection` carries
//     `providerOrganizationId` and `rfqId` — and nothing saying which side the caller is. The provider
//     side is derivable by comparing ids; the BUYER side is not, because the buyer organization is on the
//     RFQ, not the quote. So the quote page reads the RFQ too and uses ITS `callerRelation`, which is
//     server-stated. One extra read, and the page wants the RFQ's title and deadline anyway.
//
//  3. THE FX RATE IS FIXED-POINT WITH AN EXPLICIT SCALE. `rateFixedPoint` and `rateScale` are two
//     integers because floating point is forbidden for money and exchange rates. `1.0842` arrives as
//     `{rateFixedPoint: 10842, rateScale: 4}`, and rendering it without dividing by `10^rateScale` shows
//     a rate off by four orders of magnitude.
//
//  4. A THIRD NINE-ARM UNION, DISCRIMINATING ON `kind`. The offering detail uses `kind`; the RFQ
//     requirement uses `providerKind`; this one uses `kind` again. Three tables, three phases, two
//     spellings — each is what its own endpoint sends.

import { z } from "zod";

import {
  FREIGHT_TRANSPORT_MODES,
  IsoDateTimeSchema,
  PROVIDER_KINDS,
} from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

/**
 * A quote's status.
 *
 * `superseded` is what happens to a submitted revision when the provider appends another — the quote is
 * not withdrawn and not declined, it has simply been replaced. `expired` is the validity deadline
 * passing, which is a clock event rather than anybody's decision.
 */
export const QUOTE_STATUSES = [
  "draft",
  "submitted",
  "superseded",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// --- Money on a revision ----------------------------------------------------

/**
 * The seven money fields of one revision, plus its validity.
 *
 * `total = subtotal + tax + serviceFee + shipping - discount`, enforced by a CHECK. The client displays
 * these and never recomputes the total — a client-side sum that disagrees with the constraint is a bug
 * that presents as a pricing dispute.
 *
 * `shippingInCents` CAN be non-zero here, unlike on a checkout total. A provider typing a freight figure
 * onto a quote is the only way a non-zero shipping amount enters this system.
 */
export const QuoteRevisionMoneySchema = z
  .object({
    revisionNumber: z.number().int(),
    currency: z.string(),
    validityDeadlineAt: IsoDateTimeSchema,
    subtotalInCents: z.number().int(),
    taxInCents: z.number().int(),
    serviceFeeInCents: z.number().int(),
    shippingInCents: z.number().int(),
    discountInCents: z.number().int(),
    totalInCents: z.number().int(),
    // Null on a draft revision. A revision is immutable only once submitted.
    submittedAt: IsoDateTimeSchema.nullable(),
  })
  .strip();

// --- The quoted service detail ----------------------------------------------

const QuoteFreightDetailShape = {
  transportModes: z.array(z.enum(FREIGHT_TRANSPORT_MODES)),
  // Plain `.optional()` here — the wire types these `?: string` with no null, unlike the RFQ
  // requirement's `?: string | null`. Three sibling unions, three optionality conventions.
  originCountryCode: z.string().optional(),
  destinationCountryCode: z.string().optional(),
  estimatedTransitDays: z.number().int().optional(),
};

export const QuoteServiceDetailSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("freight_forwarder"), ...QuoteFreightDetailShape }).strip(),
  z.object({ kind: z.literal("logistics_operator"), ...QuoteFreightDetailShape }).strip(),
  z
    .object({
      kind: z.literal("customs_broker"),
      jurisdictions: z.array(z.string()),
      filingSummary: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("insurance_provider"),
      coverageClasses: z.array(z.string()),
      coverageLimitInCents: z.number().int().optional(),
      currency: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("inspection_agency"),
      // Free-text stages, not the four booleans the RFQ requirement and the offering both use. A quote
      // says what the provider is including, in their words.
      includedStages: z.array(z.string()),
    })
    .strip(),
  z
    .object({
      kind: z.literal("testing_certification_lab"),
      standards: z.array(z.string()),
      laboratoryLocation: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("marketing_agency"),
      channels: z.array(z.string()),
      deliverablesSummary: z.string().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("warehouse_provider"),
      storageTypes: z.array(z.string()),
      capacityUnits: z.string().optional(),
      // REQUIRED here, optional on the RFQ requirement. A quote must state it; a buyer need not ask.
      temperatureControlled: z.boolean(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("foreign_exchange_facilitator"),
      currencyPair: z.string(),
      /**
       * A FIXED-POINT RATE AND ITS SCALE. Two integers, because JavaScript and Postgres floating point
       * are both forbidden for exchange rates: `1.0842` is `{rateFixedPoint: 10842, rateScale: 4}`.
       * Divide by `10 ** rateScale` to display, and never store or arithmetic the divided value.
       */
      rateFixedPoint: z.number().int(),
      rateScale: z.number().int(),
      settlementRail: z.string().optional(),
      notionalAmountInCents: z.number().int().optional(),
      notionalCurrency: z.string().optional(),
    })
    .strip(),
]);

// --- Revision lines ---------------------------------------------------------

export const QuoteProductLineSchema = z
  .object({
    id: z.string(),
    // Which RFQ line this answers. The link is what makes a comparison possible at all.
    rfqProductLineId: z.string(),
    quantity: z.number().int(),
    unitPriceInCents: z.number().int(),
    lineTotalInCents: z.number().int(),
    titleSnapshot: z.string(),
    specificationSnapshot: z.string(),
    leadTimeDays: z.number().int().nullable(),
    /**
     * WHAT THE PROVIDER IS NOT DOING. Null means they stated no exclusions — which is NOT the same as
     * "nothing is excluded", and a comparison that treated the two alike would flatter the provider who
     * simply left the field blank.
     */
    exclusionsSnapshot: z.string().nullable(),
    siblingOrder: z.number().int(),
  })
  .strip();

export const QuoteServiceLineSchema = z
  .object({
    id: z.string(),
    rfqServiceLineId: z.string(),
    providerKind: z.enum(PROVIDER_KINDS),
    feeInCents: z.number().int(),
    titleSnapshot: z.string(),
    scopeSnapshot: z.string(),
    leadTimeDays: z.number().int().nullable(),
    exclusionsSnapshot: z.string().nullable(),
    deliverableSnapshot: z.string().nullable(),
    serviceDetail: QuoteServiceDetailSchema.nullable(),
    deliverables: z.array(
      z
        .object({
          id: z.string(),
          sequence: z.number().int(),
          title: z.string(),
          isRequired: z.boolean(),
          dueAt: IsoDateTimeSchema.nullable(),
        })
        .strip(),
    ),
    siblingOrder: z.number().int(),
  })
  .strip();

// --- Detail -----------------------------------------------------------------

export const QuoteRevisionSchema = QuoteRevisionMoneySchema.extend({
  paymentTerms: z.string().nullable(),
  incoterm: z.string().nullable(),
  notes: z.string().nullable(),
  productLines: z.array(QuoteProductLineSchema),
  serviceLines: z.array(QuoteServiceLineSchema),
}).strip();

export const QuoteDetailSchema = z
  .object({
    id: z.string(),
    rfqId: z.string(),
    providerOrganizationId: z.string(),
    status: z.enum(QUOTE_STATUSES),
    latestRevisionNumber: z.number().int(),
    // Which revision was accepted, if any. NOT necessarily the latest — a buyer accepts a specific
    // snapshot, and the provider may have appended after.
    acceptedRevisionNumber: z.number().int().nullable(),
    submittedAt: IsoDateTimeSchema.nullable(),
    acceptedAt: IsoDateTimeSchema.nullable(),
    declinedAt: IsoDateTimeSchema.nullable(),
    withdrawnAt: IsoDateTimeSchema.nullable(),
    expiredAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    // Null when the quote shell exists with no revision yet — a provider who started and stopped.
    latestRevision: QuoteRevisionSchema.nullable(),
  })
  .strip();

// --- Comparison -------------------------------------------------------------

/**
 * One quote as it appears in a comparison.
 *
 * `latestSubmittedRevision` is NULL for a quote whose only revision is a draft — so a comparison row can
 * legitimately have no money on it, and a table that assumed otherwise would show `$0` for a provider who
 * has not quoted yet.
 *
 * Unlike the detail read, this carries the provider's DISPLAY NAME. Comparing organization ids would be
 * useless, so the backend resolves them here and only here.
 */
export const QuoteComparisonItemSchema = z
  .object({
    quoteId: z.string(),
    status: z.enum(QUOTE_STATUSES),
    provider: z
      .object({
        organizationId: z.string(),
        displayName: z.string(),
        slug: z.string(),
      })
      .strip(),
    latestSubmittedRevision: QuoteRevisionMoneySchema.nullable(),
    productLineSummaries: z.array(
      z
        .object({
          titleSnapshot: z.string(),
          quantity: z.number().int(),
          unitPriceInCents: z.number().int(),
          lineTotalInCents: z.number().int(),
        })
        .strip(),
    ),
    serviceLineSummaries: z.array(
      z
        .object({
          titleSnapshot: z.string(),
          providerKind: z.enum(PROVIDER_KINDS),
          feeInCents: z.number().int(),
        })
        .strip(),
    ),
  })
  .strip();

/** A bare array — `listQuotesForRfq` is unpaginated, because an RFQ's quote set is bounded. */
/**
 * `GET /commerce/rfqs/:rfqId/quotes` — an `{ items }` OBJECT, not a bare array.
 *
 * Unpaginated: an RFQ's quote set is bounded by its invitation list, so there is no cursor. But the
 * envelope's `data` is still `{ items: [...] }`, so a schema of `z.array(...)` fails to parse every real
 * response.
 *
 * THE ROWS ARE FILTERED BY CALLER, SERVER-SIDE, and the frontend must not undo that. A buyer gets every
 * non-draft quote on the RFQ. A provider gets ONLY its own — including its own drafts — and a provider
 * with no quote and no visibility gets a 404 rather than an empty list, so the endpoint cannot be used to
 * probe whether an RFQ exists. Which means the same component renders a genuine comparison for a buyer
 * and a one-row summary for a provider, and it must not call the second one a comparison.
 */
export const QuoteComparisonListSchema = z
  .object({ items: z.array(QuoteComparisonItemSchema) })
  .strip();

// --- Request bodies ---------------------------------------------------------

/**
 * `POST /commerce/quotes/:quoteId/accept`.
 *
 * `expectedRevision` IS MANDATORY AND IS THE WHOLE POINT. It is the revision the buyer was looking at
 * when they decided. If the provider appended since, the server answers `REVISION_CHANGED` with the
 * current number and accepts nothing — because accepting terms the buyer never read is exactly what an
 * immutable commercial record must not be built from.
 *
 * `settlementAgreementId` omitted is the DEFAULT: the order settles `direct_offline`, Qatoto holds
 * nothing, and the buyer carries the counterparty risk. Naming one does not establish it — the server
 * revalidates under a row lock and refuses outright with `SETTLEMENT_UNAVAILABLE` if it has lapsed,
 * rather than quietly completing on a weaker rail.
 */
export interface AcceptQuoteInput {
  readonly expectedRevision: number;
  readonly settlementAgreementId?: string | null;
}

export type QuoteRevisionMoney = z.infer<typeof QuoteRevisionMoneySchema>;
export type QuoteServiceDetail = z.infer<typeof QuoteServiceDetailSchema>;
export type QuoteProductLine = z.infer<typeof QuoteProductLineSchema>;
export type QuoteServiceLine = z.infer<typeof QuoteServiceLineSchema>;
export type QuoteRevision = z.infer<typeof QuoteRevisionSchema>;
export type QuoteDetail = z.infer<typeof QuoteDetailSchema>;
export type QuoteComparisonItem = z.infer<typeof QuoteComparisonItemSchema>;

// --- Display maps -----------------------------------------------------------

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  // Not a rejection. The provider replaced it with a newer revision.
  superseded: "Replaced by a newer revision",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn by the provider",
  expired: "Expired",
};

/** Only a submitted quote can be accepted or declined. */
export function isQuoteActionable(status: QuoteStatus): boolean {
  return status === "submitted";
}

/** A provider may withdraw only before the buyer has acted. */
export function isQuoteWithdrawable(status: QuoteStatus): boolean {
  return status === "draft" || status === "submitted";
}

/**
 * A fixed-point rate as a decimal string.
 *
 * `rateFixedPoint / 10 ** rateScale`, formatted to `rateScale` places so a trailing zero survives —
 * `1.0840` is a different quoted rate from `1.084`, and dropping the digit changes what was agreed.
 *
 * The division happens HERE and the result is never arithmetic'd: it is display output, exactly like
 * `formatCentsLabel`.
 */
export function formatFixedPointRateLabel(rateFixedPoint: number, rateScale: number): string {
  return (rateFixedPoint / 10 ** rateScale).toFixed(rateScale);
}

/**
 * What `decline` and `withdraw` answer with — the quote SHELL, not the detail.
 *
 * `QuoteShellProjection` is six fields: the identity, the new `status`, and the revision number. It
 * carries no `latestRevision`, no `acceptedRevisionNumber` and none of the five lifecycle
 * timestamps, so parsing these two responses as a `QuoteDetail` failed on seven required fields at
 * once.
 *
 * It is the right shape for the answer. Declining a quote changes exactly one thing, and returning
 * the whole priced detail would invite a screen to re-render terms nobody is offering any more.
 * Callers that need the detail back re-read it.
 */
export const QuoteShellSchema = z
  .object({
    id: z.string(),
    rfqId: z.string(),
    providerOrganizationId: z.string(),
    status: z.enum(QUOTE_STATUSES),
    latestRevisionNumber: z.number().int(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export type QuoteShell = z.infer<typeof QuoteShellSchema>;
