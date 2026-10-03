// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for third-party declarations on an order:
// `GET|POST /commerce/orders/:orderId/declarations` and `POST …/:declarationId/withdraw`.
// Transcribed from `commerce-order-declaration.service.ts` (`OrderDeclarationProjection`).
//
// A DECLARATION IS A PARTY'S OWN RECORD, NOT A FACT QATOTO VOUCHES FOR. It says "the seller says
// they insured this with Acme Marine under policy 123", and nothing more: Qatoto sees no policy, no
// storage contract and no test, and checks none of what is typed here. So:
//
//   - there is NO verdict field. A test report names the standard and carries no pass/fail, because
//     a stored "passed" on a self-arranged report would read as one this platform endorsed;
//   - every row renders WHO recorded it, and the disclaimer text is the SERVER's, read off the list
//     response rather than kept here, so what is shown is what the author acknowledged.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Enums ------------------------------------------------------------------

/** `commerce_third_party_declaration_kind`, verbatim. */
export const DECLARATION_KINDS = ["transit_cover", "storage_cover", "test_report"] as const;

export type DeclarationKind = (typeof DECLARATION_KINDS)[number];

export const DECLARATION_KIND_LABELS: Readonly<Record<DeclarationKind, string>> = {
  transit_cover: "Cargo cover in transit",
  storage_cover: "Cover for goods in storage",
  test_report: "Laboratory test report",
};

/** `commerce_order_party_side`, verbatim. */
export const ORDER_PARTY_SIDES = ["buyer", "counterparty"] as const;

export type OrderPartySide = (typeof ORDER_PARTY_SIDES)[number];

export const ORDER_PARTY_SIDE_LABELS: Readonly<Record<OrderPartySide, string>> = {
  buyer: "buyer",
  counterparty: "seller",
};

// --- Read -------------------------------------------------------------------

/** `YYYY-MM-DD`. Validity and issue dates are days, not instants. */
const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const OrderDeclarationSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  kind: z.enum(DECLARATION_KINDS),
  declaredBySide: z.enum(ORDER_PARTY_SIDES),
  declaredByLegalNameSnapshot: z.string(),
  isOwnDeclaration: z.boolean(),
  issuer: z.string(),
  reference: z.string(),
  coverageClass: z.string().nullable(),
  standard: z.string().nullable(),
  /** ONE nullable object, never two nullable fields — half an amount is unanswerable. */
  coverage: z.object({ amountInCents: z.number().int(), currency: z.string() }).nullable(),
  validFrom: CalendarDateSchema.nullable(),
  validUntil: CalendarDateSchema.nullable(),
  issuedOn: CalendarDateSchema.nullable(),
  shipmentLegId: z.string().nullable(),
  evidenceDocumentId: z.string().nullable(),
  note: z.string().nullable(),
  disclaimerVersion: z.string(),
  withdrawnAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const OrderDeclarationListSchema = z.object({
  orderId: z.string(),
  /** False on a cancelled order — the form is hidden rather than offered and refused. */
  isDeclarable: z.boolean(),
  disclaimer: z.object({
    version: z.string(),
    coverText: z.string(),
    testReportText: z.string(),
  }),
  items: z.array(OrderDeclarationSchema),
});

export type OrderDeclaration = z.infer<typeof OrderDeclarationSchema>;
export type OrderDeclarationList = z.infer<typeof OrderDeclarationListSchema>;

// --- Write ------------------------------------------------------------------

interface DeclarationCommonInput {
  readonly issuer: string;
  readonly reference: string;
  readonly validFrom?: string;
  readonly validUntil?: string;
  readonly evidenceDocumentId?: string;
  readonly note?: string;
  /** Echoes the version the reader was SHOWN. A stale one is a 409, never silently upgraded. */
  readonly acknowledgedDisclaimerVersion: string;
}

interface CoverageInput {
  readonly amountInCents: number;
  readonly currency: string;
}

/**
 * The POST body. One arm per kind, matching the backend's `.strict()` discriminated union — a
 * field from another arm is a 422, so each arm carries only its own.
 *
 * NO SIDE, ORGANIZATION OR MEMBER. Derived server-side; sending one would be a client stating a
 * value the server owns.
 */
export type RecordDeclarationInput =
  | (DeclarationCommonInput & {
      readonly kind: "transit_cover";
      readonly coverageClass?: string;
      readonly coverage?: CoverageInput;
      readonly shipmentLegId?: string;
    })
  | (DeclarationCommonInput & {
      readonly kind: "storage_cover";
      readonly coverageClass?: string;
      readonly coverage?: CoverageInput;
    })
  | (DeclarationCommonInput & {
      readonly kind: "test_report";
      readonly standard: string;
      readonly issuedOn?: string;
    });
