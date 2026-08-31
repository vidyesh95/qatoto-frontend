// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for requests for quotation: `GET /commerce/rfqs/mine`,
// `GET /commerce/provider/rfqs`, `GET /commerce/rfqs/:rfqId`, and the draft/open/close writes.
//
// Transcribed from `commerce-rfqs.service.ts` — `RfqSummaryProjection`, `RfqDetailProjection`,
// `ServiceLineWithRequirementProjection`, `RfqDocumentProjection`, `RfqInvitationProjection` and the
// eight-member `RfqRequirementDetailInput` union.
//
// THREE THINGS THAT DIFFER FROM EVERY OTHER STORE CONTRACT, AND ALL THREE MATTER:
//
//  1. `callerRelation` IS ON THE WIRE HERE. Unlike `OrderDetailProjection`, which gives both
//     organization ids and leaves the reader to work it out, the RFQ read states outright whether the
//     caller is the `buyer`, an `invited_provider` or a `matched_provider`. So `rfq-detail.tsx` needs
//     no organization lookup — it reads the field. That is strictly better, and it is the shape the
//     order read should eventually take.
//
//  2. THE REQUIREMENT UNION DISCRIMINATES ON `providerKind`, NOT `kind`. The service-offering union in
//     `providers.schemas.ts` discriminates on `detail.kind`. Same nine provider kinds, same idea, two
//     different field names — because they are two different tables written in two different phases.
//     Do NOT "harmonise" them: each name is what its own endpoint sends, and renaming one on the
//     client would make a `.strict()` write body a 422.
//
//  3. OPTIONAL **AND** NULLABLE. Several requirement fields are typed `?: string | null` — absent OR
//     present-and-null, which are different states the wire genuinely produces. `.optional().nullable()`
//     is therefore correct here, where the offering detail's plain `.optional()` was correct there.
//     Getting this wrong rejects a payload the server considers valid.

import { z } from "zod";

import {
  cursorPageOf,
  FREIGHT_TRANSPORT_MODES,
  IsoDateTimeSchema,
  PROVIDER_KINDS,
  type FreightTransportMode,
  type ProviderKind,
} from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

export const RFQ_STATES = ["draft", "open", "closed", "awarded", "cancelled", "expired"] as const;

export type RfqState = (typeof RFQ_STATES)[number];

/**
 * Who can see and answer an RFQ.
 *
 * `invited_only` means the buyer named the providers. `matched_providers` opens it to any eligible
 * provider of the right kind — which is a materially different disclosure, because the buyer's
 * requirement becomes visible to competitors of the people they invited.
 */
export const RFQ_VISIBILITIES = ["invited_only", "matched_providers"] as const;

export type RfqVisibility = (typeof RFQ_VISIBILITIES)[number];

export const RFQ_INVITATION_STATES = [
  "pending",
  "sent",
  "read",
  "responded",
  "withdrawn",
  "expired",
] as const;

export type RfqInvitationState = (typeof RFQ_INVITATION_STATES)[number];

/** What the caller is to this RFQ, stated by the server rather than inferred. */
export const RFQ_CALLER_RELATIONS = ["buyer", "invited_provider", "matched_provider"] as const;

export type RfqCallerRelation = (typeof RFQ_CALLER_RELATIONS)[number];

// --- Summary and list -------------------------------------------------------

export const RfqSummarySchema = z
  .object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    title: z.string(),
    state: z.enum(RFQ_STATES),
    visibility: z.enum(RFQ_VISIBILITIES),
    // Null on a draft: a deadline is set when the RFQ opens, and a draft with no deadline is normal.
    responseDeadlineAt: IsoDateTimeSchema.nullable(),
    settlementCurrency: z.string(),
    openedAt: IsoDateTimeSchema.nullable(),
    closedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

export const RfqListPageSchema = cursorPageOf(RfqSummarySchema);

// --- Lines, documents, invitations ------------------------------------------

/**
 * A requested product line.
 *
 * THIS IS A RAW DRIZZLE ROW ON THE WIRE. `RfqDetailProjection.productLines` is typed
 * `readonly ProductLineRow[]` — the table row, not a projection — so the payload carries whatever
 * columns `commerce_rfq_product_line` happens to have. `.strip()` and declaring only the fields this
 * client renders is the defence: when the backend eventually adds a real projection, this schema is a
 * no-op rather than a rewrite, and a column rename breaks one line here instead of a page.
 *
 * `productId` is nullable because the whole point of an RFQ is sourcing something that may not be
 * listed. `categoryId` likewise — a buyer can describe a requirement without classifying it.
 */
export const RfqProductLineSchema = z
  .object({
    id: z.string(),
    rfqId: z.string(),
    productId: z.string().nullable(),
    categoryId: z.string().nullable(),
    requestedTitle: z.string(),
    requestedSpecificationSnapshot: z.string(),
    quantity: z.number().int(),
    // Free text — "tons", "sets", "pallets". The buyer's unit, not a platform enum.
    unitLabel: z.string(),
    siblingOrder: z.number().int(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * An attached document, by reference only.
 *
 * `encryptedDocumentId` is a POINTER to a private encrypted object, not a URL. There is no public
 * link to render — attachments are served through short-lived authorized URLs, and this read does not
 * mint one. So a client shows that a document exists and cannot show the document.
 */
export const RfqDocumentSchema = z
  .object({
    id: z.string(),
    encryptedDocumentId: z.string(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * One invited provider.
 *
 * ~~Only `providerOrganizationId` — NO display name.~~ **THE BACKEND ASK LANDED.** This used to
 * carry only the id, so the buyer's list rendered a column of raw uuids; the invitation row's
 * `providerOrganizationId` was already an FK to `commerce_organization`, so it cost one join.
 *
 * ⚠️ **`state` IS EFFECTIVELY ALWAYS `sent`.** The only INSERT writes `state: "sent"` with `sentAt`
 * set, so `pending` — the column's own default — is unreachable, and `read`, `withdrawn` and
 * `expired` are written by nothing at all. `responded` is set provider-side when a quote shell is
 * created. Do not build a "send" control for `pending`: it is a state that cannot occur.
 */
export const RfqInvitationSchema = z
  .object({
    id: z.string(),
    providerOrganizationId: z.string(),
    providerDisplayName: z.string(),
    providerSlug: z.string(),
    state: z.enum(RFQ_INVITATION_STATES),
    sentAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

// --- The eight-arm requirement union ----------------------------------------
//
// Eight members for nine provider kinds, because freight forwarding and logistics operation share one
// body — the same collapse the offering detail makes. Written out as two literals so
// `z.discriminatedUnion` has one per option, and the exhaustive switch still has nine cases.

const FreightRequirementShape = {
  transportModes: z.array(z.enum(FREIGHT_TRANSPORT_MODES)),
  // `?: string | null` on the wire — absent OR null. Both, deliberately: see the header.
  originCountryCode: z.string().nullable().optional(),
  destinationCountryCode: z.string().nullable().optional(),
  requiresConsolidation: z.boolean().optional(),
  requiresHazardousGoodsSupport: z.boolean().optional(),
  cargoDescription: z.string().nullable().optional(),
};

export const RfqRequirementDetailSchema = z.discriminatedUnion("providerKind", [
  z.object({ providerKind: z.literal("freight_forwarder"), ...FreightRequirementShape }).strip(),
  z.object({ providerKind: z.literal("logistics_operator"), ...FreightRequirementShape }).strip(),
  z
    .object({
      providerKind: z.literal("customs_broker"),
      jurisdictions: z.array(z.string()),
      importRequired: z.boolean().optional(),
      exportRequired: z.boolean().optional(),
      commoditySummary: z.string().nullable().optional(),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("insurance_provider"),
      cargoCoverageClasses: z.array(z.string()),
      coverageLimitInCents: z.number().int().nullable().optional(),
      currency: z.string().optional(),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("inspection_agency"),
      // ALL FOUR OPTIONAL, unlike the offering detail where they are required booleans. An RFQ says
      // what the buyer NEEDS; an absent stage is "not asked for", which is not the same as "no".
      preProduction: z.boolean().optional(),
      duringProduction: z.boolean().optional(),
      preShipment: z.boolean().optional(),
      loadingSupervision: z.boolean().optional(),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("testing_certification_lab"),
      standards: z.array(z.string()),
      laboratoryLocationPreference: z.string().nullable().optional(),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("marketing_agency"),
      channels: z.array(z.string()),
      targetRegions: z.array(z.string()),
      languageCapabilities: z.array(z.string()),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("warehouse_provider"),
      storageTypes: z.array(z.string()),
      temperatureControlled: z.boolean().optional(),
      bondedStatusRequired: z.boolean().optional(),
      capacityUnits: z.string().nullable().optional(),
    })
    .strip(),
  z
    .object({
      providerKind: z.literal("foreign_exchange_facilitator"),
      currencyPairs: z.array(z.string()),
      settlementRails: z.array(z.string()),
      notionalAmountInCents: z.number().int().nullable().optional(),
      notionalCurrency: z.string().optional(),
    })
    .strip(),
]);

/**
 * A requested service line, with its typed requirement.
 *
 * `requirementDetail` is NULLABLE: a service line can name a provider kind and a prose summary without
 * a typed requirement behind it. So the panel that renders it has to handle the absence, and a null
 * here means "the buyer described it in words only" — not "no requirement".
 *
 * `linkedProductLineId` connects a service to a product line WITHOUT making it that line's child: a
 * shipment of the chairs is about the chairs, but cancelling the chairs does not cancel the freight.
 */
export const RfqServiceLineSchema = z
  .object({
    id: z.string(),
    rfqId: z.string(),
    providerKind: z.enum(PROVIDER_KINDS),
    // Present when the buyer is asking a SPECIFIC offering rather than the market.
    serviceOfferingId: z.string().nullable(),
    linkedProductLineId: z.string().nullable(),
    requirementSummary: z.string(),
    siblingOrder: z.number().int(),
    createdAt: IsoDateTimeSchema,
    requirementDetail: RfqRequirementDetailSchema.nullable(),
  })
  .strip();

// --- Detail -----------------------------------------------------------------

export const RfqDetailSchema = z
  .object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    createdByMemberId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    state: z.enum(RFQ_STATES),
    visibility: z.enum(RFQ_VISIBILITIES),
    responseDeadlineAt: IsoDateTimeSchema.nullable(),
    desiredDeliveryStartsAt: IsoDateTimeSchema.nullable(),
    desiredDeliveryEndsAt: IsoDateTimeSchema.nullable(),
    // The address ID, plus the two plaintext fields safe to show. The street lines are encrypted and
    // do not appear here at all — a provider quoting a lane needs a country and a city, not a door.
    destinationAddressId: z.string().nullable(),
    destinationCountryCode: z.string().nullable(),
    destinationLocality: z.string().nullable(),
    settlementCurrency: z.string(),
    openedAt: IsoDateTimeSchema.nullable(),
    closedAt: IsoDateTimeSchema.nullable(),
    awardedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    productLines: z.array(RfqProductLineSchema),
    serviceLines: z.array(RfqServiceLineSchema),
    documents: z.array(RfqDocumentSchema),
    invitations: z.array(RfqInvitationSchema),
    // STATED BY THE SERVER. No organization lookup, no route-derived guess.
    callerRelation: z.enum(RFQ_CALLER_RELATIONS),
  })
  .strip();

// --- Filter inputs ----------------------------------------------------------

export interface ListRfqsFilter {
  readonly state?: RfqState;
  readonly limit?: number;
  readonly cursor?: string;
}

export type RfqSummary = z.infer<typeof RfqSummarySchema>;
export type RfqListPage = z.infer<typeof RfqListPageSchema>;
export type RfqProductLine = z.infer<typeof RfqProductLineSchema>;
export type RfqServiceLine = z.infer<typeof RfqServiceLineSchema>;
export type RfqRequirementDetail = z.infer<typeof RfqRequirementDetailSchema>;
export type RfqDocument = z.infer<typeof RfqDocumentSchema>;
export type RfqInvitation = z.infer<typeof RfqInvitationSchema>;
export type RfqDetail = z.infer<typeof RfqDetailSchema>;

// --- Display maps -----------------------------------------------------------

export const RFQ_STATE_LABELS: Record<RfqState, string> = {
  draft: "Draft",
  open: "Open for quotes",
  closed: "Closed to new quotes",
  awarded: "Awarded",
  cancelled: "Cancelled",
  expired: "Expired",
};

/**
 * Visibility, described by WHO CAN SEE IT rather than by the enum's name.
 *
 * `matched_providers` is the one that needs saying plainly: it exposes the buyer's requirement to every
 * eligible provider of that kind, which is a disclosure decision and not just a reach setting.
 */
export const RFQ_VISIBILITY_LABELS: Record<RfqVisibility, string> = {
  invited_only: "Only the providers you invite can see this",
  matched_providers: "Any eligible provider of the right kind can see and answer this",
};

export const RFQ_INVITATION_STATE_LABELS: Record<RfqInvitationState, string> = {
  pending: "Not sent yet",
  sent: "Sent",
  read: "Read",
  responded: "Quoted",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

/** Only a draft may be edited, and only a draft may be opened. Both checked server-side. */
export function isRfqEditable(state: RfqState): boolean {
  return state === "draft";
}

/** Only an open RFQ may be closed. */
export function isRfqCloseable(state: RfqState): boolean {
  return state === "open";
}

// --- Request body: POST /commerce/rfqs -------------------------------------
//
// TRANSCRIBED FROM `CreateDraftRfqSchema`, and the body is `.strict()` — an extra key is a 422, not an
// ignored field. So these are TS types rather than Zod schemas: the compiler is what stops a wrong field
// name, and a runtime re-parse of an object this file just built would only re-check itself.
//
// THE OPTIONALITY IS THE CONTRACT, not a convenience. Every `?` below is a field the backend declared
// `.optional()` and NOT `.nullable()`, which means an unanswered question must be OMITTED from the request.
// Sending `null` is a 422; sending `false` for an unanswered boolean is worse than a 422 — it is a claim
// the buyer never made.

/**
 * The nine-arm requirement union, discriminating on `providerKind`.
 *
 * NOT THE SAME SHAPE AS `ServiceOfferingDetailInput`, and the differences are deliberate on the backend's
 * part. A REQUIREMENT says what a buyer needs, so its booleans are OPTIONAL — absent means "not asked",
 * which is different from "not needed". An OFFERING says what a provider can do, so the same booleans are
 * REQUIRED there and `false` is a real answer. Field names differ too (`importRequired` here,
 * `importSupported` there; `commoditySummary` here, `commodityCoverageSummary` there). Do not harmonise
 * them — each name must byte-match its own `.strict()` schema.
 */
export type RfqRequirementDetailInput =
  | {
      readonly providerKind: "freight_forwarder" | "logistics_operator";
      readonly transportModes: readonly FreightTransportMode[];
      readonly originCountryCode?: string;
      readonly destinationCountryCode?: string;
      readonly requiresConsolidation?: boolean;
      readonly requiresHazardousGoodsSupport?: boolean;
      readonly cargoDescription?: string;
    }
  | {
      readonly providerKind: "customs_broker";
      readonly jurisdictions: readonly string[];
      readonly importRequired?: boolean;
      readonly exportRequired?: boolean;
      readonly commoditySummary?: string;
    }
  | {
      readonly providerKind: "insurance_provider";
      readonly cargoCoverageClasses: readonly string[];
      readonly coverageLimitInCents?: number;
      readonly currency?: string;
    }
  | {
      readonly providerKind: "inspection_agency";
      readonly preProduction?: boolean;
      readonly duringProduction?: boolean;
      readonly preShipment?: boolean;
      readonly loadingSupervision?: boolean;
    }
  | {
      readonly providerKind: "testing_certification_lab";
      readonly standards: readonly string[];
      readonly laboratoryLocationPreference?: string;
    }
  | {
      readonly providerKind: "marketing_agency";
      readonly channels: readonly string[];
      readonly targetRegions: readonly string[];
      readonly languageCapabilities: readonly string[];
    }
  | {
      readonly providerKind: "warehouse_provider";
      readonly storageTypes: readonly string[];
      readonly temperatureControlled?: boolean;
      readonly bondedStatusRequired?: boolean;
      readonly capacityUnits?: string;
    }
  | {
      readonly providerKind: "foreign_exchange_facilitator";
      readonly currencyPairs: readonly string[];
      readonly settlementRails: readonly string[];
      readonly notionalAmountInCents?: number;
      readonly notionalCurrency?: string;
    };

export interface RfqProductLineInput {
  readonly productId?: string;
  readonly categoryId?: string;
  readonly requestedTitle: string;
  readonly requestedSpecificationSnapshot: string;
  readonly quantity: number;
  readonly unitLabel: string;
  readonly siblingOrder: number;
}

/**
 * One service line.
 *
 * `providerKind` APPEARS TWICE — here and inside `requirementDetail` — and the backend `.refine()`s that
 * they match. The composer sets both from one control, which is the only way to keep them equal.
 *
 * `linkedProductLineSiblingOrder` links to a goods line BY ITS ORDER IN THIS REQUEST, not by an id: the
 * product lines do not exist yet when the body is built, so there is no id to point at.
 */
export interface RfqServiceLineInput {
  readonly providerKind: ProviderKind;
  readonly serviceOfferingId?: string;
  readonly linkedProductLineSiblingOrder?: number;
  readonly requirementSummary: string;
  readonly siblingOrder: number;
  readonly requirementDetail: RfqRequirementDetailInput;
}

/**
 * `POST /commerce/rfqs` — creates a DRAFT. It does not open it, and nobody is notified.
 *
 * `desiredDeliveryStartsAt` AND `desiredDeliveryEndsAt` MUST BE SET TOGETHER or both omitted — the backend
 * `.refine()`s exactly that, so a half-filled window is a 422 rather than an open-ended one.
 *
 * `documentIds` IS HERE NOW. It always existed on the backend contract and this type used to omit it,
 * on the correct reasoning at the time: every id must name a `commerce_encrypted_document` the buyer's
 * organization owns, and there was no route by which a buyer created one. `POST /commerce/documents`
 * closed that, so the field is fillable and the composer has an attachment step.
 *
 * ⚠️ EVERY ID MUST NAME AN `available` DOCUMENT. A freshly uploaded one is `pending_scan` and is
 * refused with `DOCUMENT_NOT_OWNED` — which is why the upload answers 202 and why the picker offers
 * only what `GET /commerce/documents` returns.
 *
 * Requires an `Idempotency-Key`.
 */
/**
 * `POST /commerce/rfqs/:rfqId/invitations` — **201**, answering only the rows just created.
 *
 * ⚠️ **THE WHOLE BATCH IS ONE TRANSACTION AND THE REFUSAL NAMES NO ID.** One ineligible or
 * already-invited provider rolls every id in the call back, and
 * `409 One or more providers are not eligible for invitation.` does not say which. So the picker
 * pre-filters to providers the gate will accept rather than discovering this by failing.
 *
 * ⚠️ **AN INVITATION CANNOT BE UNDONE.** There is no withdraw, cancel or DELETE route anywhere in
 * the module — `withdrawn` exists in the enum and nothing reaches it.
 */
/** `POST …/invitations` answers `{ invitations }` — only the rows it just created. */
export const InvitedProvidersSchema = z
  .object({ invitations: z.array(RfqInvitationSchema) })
  .strip();

export interface InviteProvidersInput {
  readonly providerOrganizationIds: readonly string[];
}

export interface CreateDraftRfqInput {
  readonly title: string;
  readonly description?: string;
  readonly visibility: RfqVisibility;
  readonly responseDeadlineAt: string;
  readonly desiredDeliveryStartsAt?: string;
  readonly desiredDeliveryEndsAt?: string;
  readonly destinationAddressId?: string;
  /** Ids of the buyer's own scanned trade attachments. At most 50. */
  readonly documentIds?: readonly string[];
  readonly destinationCountryCode?: string;
  readonly destinationLocality?: string;
  readonly settlementCurrency: string;
  readonly productLines: readonly RfqProductLineInput[];
  readonly serviceLines: readonly RfqServiceLineInput[];
  readonly sourceInquiryId?: string;
}
