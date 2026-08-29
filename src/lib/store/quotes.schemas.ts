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

import { RFQ_STATES } from "@/lib/store/rfqs.schemas";
import {
  FREIGHT_TRANSPORT_MODES,
  IsoDateTimeSchema,
  PROVIDER_KINDS,
  type FreightTransportMode,
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
  /**
   * A30. Documents the provider attached to THIS revision.
   *
   * ⚠️ REVISION-SCOPED, so a superseded offer keeps the drawings it was judged on rather than
   * inheriting whatever the provider attached later. `fileName` is NULLABLE because names are
   * encrypted at rest and null means the stored name could not be decrypted — render a neutral
   * label, never the id.
   *
   * NO URL. Downloading goes through `GET /commerce/documents/:documentId`, which re-checks access
   * on every request; a link here would outlive the access it was issued under.
   */
  documents: z.array(
    z
      .object({
        documentId: z.string(),
        mediaType: z.string(),
        fileByteSize: z.number().int(),
        fileName: z.string().nullable(),
        attachedAt: z.string(),
      })
      .strip(),
  ),
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

/**
 * What `POST /commerce/quotes/:quoteId/revisions` answers with — the revision's MONEY, plus the id
 * of the quote it was appended to.
 *
 * `QuoteRevisionMoneyProjection & { quoteId }`, and the extra field is what makes the response
 * usable on its own: the composer may have just created the shell in the previous call, so echoing
 * the quote id means the submit step needs no bookkeeping to find its target.
 *
 * IT CARRIES NO LINES. The lines were just sent by the caller and the server stored them verbatim;
 * echoing them back would be a second copy of the request, and a screen that rendered the echo
 * rather than the request would look correct while proving nothing. `submittedAt` is null here —
 * appending a revision does not submit it.
 */
export const AppendedQuoteRevisionSchema = QuoteRevisionMoneySchema.extend({
  quoteId: z.string(),
}).strip();

export type AppendedQuoteRevision = z.infer<typeof AppendedQuoteRevisionSchema>;

/**
 * What `POST /commerce/quotes/:quoteId/revisions/:revision/submit` answers with — the quote shell
 * with the revision number that was frozen.
 *
 * THE REVISION IS IMMUTABLE FROM THIS MOMENT. `commerce_prevent_submitted_quote_revision_mutation`
 * is a database trigger, not a service check, so there is no correction path and no
 * administrative override: a typo in a submitted revision is fixed by appending another revision,
 * which is why the composer confirms before calling this.
 */
export const SubmittedQuoteRevisionSchema = QuoteShellSchema.extend({
  revisionNumber: z.number().int(),
}).strip();

export type SubmittedQuoteRevision = z.infer<typeof SubmittedQuoteRevisionSchema>;

// --- The provider's own queue -----------------------------------------------

/**
 * One row of `GET /commerce/provider/quotes` — every quote this provider has authored, across every
 * RFQ.
 *
 * WHY THIS READ MATTERS MORE THAN ITS SIZE SUGGESTS. `GET /commerce/rfqs/:rfqId/quotes` is
 * RFQ-scoped, so a provider could only reach a quote by already knowing its RFQ, and
 * `GET /commerce/provider/rfqs` lists the WORK rather than the BIDS — an RFQ leaves that queue when
 * it closes, taking any quote on it out of reach.
 *
 * **DRAFTS ARE INCLUDED, and this is the only list anywhere that yields a draft quote's id.** That
 * is what makes resuming an abandoned quote possible at all: if the shell POST succeeded and the
 * revision POST did not, the shell is reachable from here and nowhere else. A composer that could
 * not find it would create a second shell on the same RFQ every time the network dropped — and the
 * server refuses that, so the quote would be unreachable rather than duplicated.
 *
 * `latestSubmittedRevision` IS NULL FOR A DRAFT-ONLY QUOTE. That is not zero and must not render as
 * a price.
 */
export const ProviderQuoteQueueItemSchema = z
  .object({
    quoteId: z.string(),
    status: z.enum(QUOTE_STATUSES),
    rfq: z
      .object({
        id: z.string(),
        title: z.string(),
        state: z.enum(RFQ_STATES),
        buyerOrganizationId: z.string(),
      })
      .strip(),
    latestSubmittedRevision: QuoteRevisionMoneySchema.nullable(),
    latestRevisionNumber: z.number().int(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

export type ProviderQuoteQueueItem = z.infer<typeof ProviderQuoteQueueItemSchema>;

/** The keyset envelope: `{ items, page: { nextCursor, hasMore } }`. */
export const ProviderQuoteQueuePageSchema = z
  .object({
    items: z.array(ProviderQuoteQueueItemSchema),
    page: z
      .object({
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      })
      .strip(),
  })
  .strip();

export interface ListProviderQuotesFilter {
  readonly status?: QuoteStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Request body: the three provider writes --------------------------------
//
// TRANSCRIBED FROM `AppendQuoteRevisionSchema`, and the body is `.strict()` — an extra key is a 422,
// not an ignored field. So these are TS types rather than Zod schemas, for the reason
// `rfqs.schemas.ts:356-359` already states: the compiler is what stops a wrong field name, and a
// runtime re-parse of an object this file just built would only re-check itself.
//
// THE OPTIONALITY IS THE CONTRACT. Every `?` below is `.optional()` and NOT `.nullable()` on the
// backend, so an unanswered field must be OMITTED. Sending `null` is a 422.
//
// FOUR WAYS THIS DIVERGES FROM THE READ SHAPES ABOVE, each a 422 if assumed away:
//
//  1. `freight_forwarder` AND `logistics_operator` SHARE ONE ARM. The backend writes them as a
//     single member with `kind: z.enum([...])`; the read union above lists them as two literals.
//
//  2. THE RFQ'S REQUIREMENT UNION DISCRIMINATES ON `providerKind`; THIS ONE ON `kind`. Third
//     spelling of the same idea on this wire. `rfq-requirement-detail-fields.tsx` is the structural
//     model for the editor, NOT a file to copy — copying it sends `providerKind` and every service
//     line 422s.
//
//  3. NO `subtotalInCents` AND NO `totalInCents`. The server computes both from the lines and a
//     CHECK enforces the sum. They are absent from the body by design, which is why appending is the
//     first moment a provider sees a real total — one call before commitment. A client-side total
//     that disagreed with the constraint is a pricing dispute wearing a rounding bug's costume.
//
//  4. `productLines` AND `serviceLines` ARE REQUIRED KEYS THAT MAY HOLD `[]`. They are
//     `z.array(...).max(200)` with no `.optional()`, so OMITTING the key is a 422 while sending an
//     empty array is fine. The service then refuses a revision with no lines at all, separately.

/**
 * Incoterms 2020 — the eleven the ICC publishes.
 *
 * A40 widened this from `z.string().max(20)`, which accepted `BANANA` — and
 * `commerce_prevent_submitted_quote_revision_mutation` then froze the bad value on the revision
 * forever, so it could not even be corrected afterwards. Render a picker over these, never a text
 * field.
 *
 * UPPERCASE, unlike every other enum on this wire. `commerce_incoterm` is the one exception, and the
 * casing is not ours to normalise.
 */
export const QUOTE_INCOTERMS = [
  "EXW",
  "FCA",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
] as const;

export type QuoteIncoterm = (typeof QUOTE_INCOTERMS)[number];

/**
 * The human label for a term that arrives as a bare string.
 *
 * GUARDED, BECAUSE THE READ SIDE IS NOT NARROWED. `QuoteRevisionSchema.incoterm` and
 * `orders.schemas.ts`'s `incotermSnapshot` are both `z.string().nullable()` — the backend column is
 * the enum, so in practice the value is always one of eleven, but a defensive boundary does not
 * assume that. An unrecognised code renders AS ITSELF rather than crashing or blanking: "FOB" is
 * still more useful to a buyer than nothing.
 */
export function formatIncotermLabel(incoterm: string | null): string | null {
  if (incoterm === null) return null;
  return isQuoteIncoterm(incoterm) ? QUOTE_INCOTERM_LABELS[incoterm] : incoterm;
}

function isQuoteIncoterm(value: string): value is QuoteIncoterm {
  return (QUOTE_INCOTERMS as readonly string[]).includes(value);
}

export const QUOTE_INCOTERM_LABELS: Record<QuoteIncoterm, string> = {
  EXW: "EXW — Ex Works",
  FCA: "FCA — Free Carrier",
  CPT: "CPT — Carriage Paid To",
  CIP: "CIP — Carriage and Insurance Paid To",
  DAP: "DAP — Delivered At Place",
  DPU: "DPU — Delivered At Place Unloaded",
  DDP: "DDP — Delivered Duty Paid",
  FAS: "FAS — Free Alongside Ship",
  FOB: "FOB — Free On Board",
  CFR: "CFR — Cost and Freight",
  CIF: "CIF — Cost, Insurance and Freight",
};

/**
 * The eight typed service details a quote line can carry, discriminating on `kind`.
 *
 * `warehouse_provider.temperatureControlled` IS REQUIRED — the only required boolean in the eight,
 * and the inverse of the RFQ requirement's optional one. A requirement's absent boolean means "not
 * asked"; a quote's means nothing at all, so the provider must answer.
 *
 * TWO PAIRS ARE ALL-OR-NOTHING, enforced by a backend `superRefine` and again in the service:
 * insurance's `coverageLimitInCents` + `currency`, and FX's `notionalAmountInCents` +
 * `notionalCurrency`. Sending one without the other is a 422 naming the missing half.
 */
export type QuoteServiceDetailInput =
  | {
      readonly kind: "freight_forwarder" | "logistics_operator";
      readonly transportModes: readonly FreightTransportMode[];
      readonly originCountryCode?: string;
      readonly destinationCountryCode?: string;
      readonly estimatedTransitDays?: number;
    }
  | {
      readonly kind: "customs_broker";
      readonly jurisdictions: readonly string[];
      readonly filingSummary?: string;
    }
  | {
      readonly kind: "insurance_provider";
      readonly coverageClasses: readonly string[];
      readonly coverageLimitInCents?: number;
      readonly currency?: string;
    }
  | {
      // Free text, deliberately. The RFQ requirement and the offering both use four booleans here; a
      // quote says what the provider is INCLUDING, in their words. Not interchangeable.
      readonly kind: "inspection_agency";
      readonly includedStages: readonly string[];
    }
  | {
      readonly kind: "testing_certification_lab";
      readonly standards: readonly string[];
      readonly laboratoryLocation?: string;
    }
  | {
      readonly kind: "marketing_agency";
      readonly channels: readonly string[];
      readonly deliverablesSummary?: string;
    }
  | {
      readonly kind: "warehouse_provider";
      readonly storageTypes: readonly string[];
      readonly capacityUnits?: string;
      readonly temperatureControlled: boolean;
    }
  | {
      // ONE pair, not the RFQ requirement's array of pairs. And the rate is fixed-point: `1.0840` is
      // `{ rateFixedPoint: 10840, rateScale: 4 }`. Multiplying a float by `10 ** scale` yields
      // `10839.999999999998` and a `.int()` 422 — parse the typed string instead.
      readonly kind: "foreign_exchange_facilitator";
      readonly currencyPair: string;
      readonly rateFixedPoint: number;
      readonly rateScale: number;
      readonly settlementRail?: string;
      readonly notionalAmountInCents?: number;
      readonly notionalCurrency?: string;
    };

/**
 * One step of a service line's deliverable plan.
 *
 * `sequence` IS THE CALLER'S AND MUST BE UNIQUE WITHIN THE LINE. The backend refuses duplicates
 * rather than renumbering, because a plan whose steps were silently reordered is not the plan that
 * was quoted. Assign it from the array index and re-index on removal.
 */
export interface QuoteDeliverablePlanInput {
  readonly sequence: number;
  readonly title: string;
  readonly isRequired: boolean;
  readonly dueAt?: string;
}

/**
 * One priced product line, answering one RFQ product line.
 *
 * THE SNAPSHOTS ARE THE PROVIDER'S WORDS, NOT A COPY OF THE BUYER'S. Seeding them from the RFQ is a
 * composer convenience; what reaches the immutable order line is whatever the provider left in the
 * field. A supplier quoting a narrower specification than was asked is normal, and
 * `exclusionsSnapshot` is where that gets said.
 */
export interface QuoteProductLineInput {
  readonly rfqProductLineId: string;
  readonly quantity: number;
  readonly unitPriceInCents: number;
  readonly titleSnapshot: string;
  readonly specificationSnapshot: string;
  readonly leadTimeDays?: number;
  readonly exclusionsSnapshot?: string;
  readonly siblingOrder: number;
}

export interface QuoteServiceLineInput {
  readonly rfqServiceLineId: string;
  readonly feeInCents: number;
  readonly titleSnapshot: string;
  readonly scopeSnapshot: string;
  readonly leadTimeDays?: number;
  readonly exclusionsSnapshot?: string;
  readonly deliverableSnapshot?: string;
  readonly deliverables: readonly QuoteDeliverablePlanInput[];
  readonly siblingOrder: number;
  // EXACTLY ONE, and its `kind` must equal the RFQ service line's `providerKind`. The server checks
  // it, which is why the editor reads the kind off the RFQ rather than offering a picker.
  readonly serviceDetail: QuoteServiceDetailInput;
}

/**
 * `POST /commerce/quotes/:quoteId/revisions`.
 *
 * `validityDeadlineAt` MUST BE IN THE FUTURE — checked before anything else and answered as a
 * validation failure. **Mind the short deadline**: once a revision is appended and its deadline
 * passes, submit answers `QUOTE_EXPIRED` and appending another is refused while it stands, so the
 * revision has to be DISCARDED and priced again. Recoverable, but it costs the work — prefill
 * generously and warn on anything short.
 */
export interface AppendQuoteRevisionInput {
  readonly currency: string;
  readonly validityDeadlineAt: string;
  readonly taxInCents: number;
  readonly serviceFeeInCents: number;
  readonly shippingInCents: number;
  readonly discountInCents: number;
  readonly paymentTerms?: string;
  readonly incoterm?: QuoteIncoterm;
  readonly notes?: string;
  readonly productLines: readonly QuoteProductLineInput[];
  readonly serviceLines: readonly QuoteServiceLineInput[];
}

// --- `ApiError.details` payloads worth parsing ------------------------------
//
// The FIRST use of `ApiError.details` anywhere in the app, and exactly what that field's docstring
// asks for: it is `unknown` on purpose, and each caller parses it with Zod at its own boundary rather
// than promoting one route's payload into a contract every surface shares.

/** `409 REVISION_CHANGED` — the provider appended since this screen last read. */
export const RevisionChangedDetailSchema = z.object({ currentRevision: z.number().int() }).strip();

/** `409 QUOTE_EXPIRED` — the validity deadline passed before submit. */
export const QuoteExpiredDetailSchema = z.object({ expiredAt: IsoDateTimeSchema }).strip();
