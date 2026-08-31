// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `GET /commerce/disputes`, `GET /commerce/disputes/:disputeId` and
// `POST /commerce/disputes/:disputeId/notes` (A28, A40).
//
// Transcribed from `commerce-trust.service.ts` — `DisputeProjection` (:163) and
// `DisputeDetailProjection` (:179).
//
// A 404 IS THE NOT-A-PARTY ANSWER, and it must never be rendered as a permission hint. The backend
// answers 404 for "no such dispute" and "you are not a party to it" with one code, deliberately, so
// the route cannot be used to enumerate dispute ids. A page that said "you do not have access to
// this dispute" would undo that in one sentence.

import { z } from "zod";

import { ORDER_STATES } from "@/lib/store/cart.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

export const DISPUTE_STATES = ["open", "closed", "dismissed"] as const;

export type DisputeState = (typeof DISPUTE_STATES)[number];

/**
 * `commerce_dispute_event_kind`.
 *
 * `note_added` HAD NO WRITER UNTIL PHASE 23. The enum member and the timeline that renders it have
 * existed since `0052`; what was missing was any way to add one, so a buyer could open a dispute
 * over a six-figure order and then say nothing further, and the seller could read the accusation
 * and not answer it.
 */
export const DISPUTE_EVENT_KINDS = ["opened", "note_added", "closed", "dismissed"] as const;

export type DisputeEventKind = (typeof DISPUTE_EVENT_KINDS)[number];

/**
 * WHO MAY OPEN ONE, AND FROM WHAT.
 *
 * ⚠️ **THE BUYER ONLY** — `evaluateDisputeOpeningRelationship` returns `forbidden` when the actor
 * is not the order's buyer organization (`commerce-trust.service.ts:218`), so a seller reading an
 * accusation answers it with a note rather than opening one of their own.
 *
 * ⚠️ **AND ONLY FROM THESE FOUR ORDER STATES.** A `draft` or `cancelled` order has nothing to
 * dispute and the route answers `invalid_state`. Mirrored here so the control is absent rather than
 * offered-and-refused; the server decides regardless.
 */
export const DISPUTABLE_ORDER_STATES = [
  "confirmed",
  "in_fulfillment",
  "partially_completed",
  "completed",
] as const;

/**
 * The reason codes this client offers.
 *
 * ⚠️ **`reasonCode` IS FREE TEXT ON THE WIRE, NOT A pgEnum** — the column takes anything matching
 * `^[a-z][a-z0-9_]{0,79}$`, and this tuple is a CLIENT vocabulary over it. It exists because a text
 * input would fragment one reason into six spellings that no moderator could group or count, and
 * because a code is snake_case data rather than an identifier: it is sent verbatim and must not be
 * "corrected" to kebab-case.
 *
 * A code added here needs no backend change. That is the point of the column being open, and it is
 * also why nothing may ASSUME a stored code is one of these — a dispute opened by another client,
 * or by an older version of this one, can carry anything.
 */
export const DISPUTE_REASON_CODES = [
  "not_delivered",
  "damaged_on_arrival",
  "wrong_items",
  "quantity_short",
  "quality_below_spec",
  "other",
] as const;
export type DisputeReasonCode = (typeof DISPUTE_REASON_CODES)[number];

export const DISPUTE_REASON_CODE_LABELS: Record<DisputeReasonCode, string> = {
  not_delivered: "It never arrived",
  damaged_on_arrival: "It arrived damaged",
  wrong_items: "The wrong items arrived",
  quantity_short: "Some of it is missing",
  quality_below_spec: "It is not what was specified",
  other: "Something else",
};

/** `POST /commerce/orders/:orderId/disputes` — answers **201** with the dispute. */
export interface OpenDisputeInput {
  readonly reasonCode: string;
  readonly summary: string;
}

// --- Projections ------------------------------------------------------------

export const DisputeSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    state: z.enum(DISPUTE_STATES),
    /** A free-form code the opener chose, `^[a-z][a-z0-9_]{0,79}$`. Not a closed enum. */
    reasonCode: z.string(),
    summary: z.string(),
    /**
     * The order state the dispute FROZE, and what `decideDispute` restores it to.
     *
     * Opening a dispute moves the order to `disputed`; this is where it came from. Render it as
     * "this order was X when the dispute opened", never as the order's current state.
     */
    priorOrderState: z.enum(ORDER_STATES),
    buyerOrganizationId: z.string(),
    counterpartyOrganizationId: z.string(),
    /** Only a BUYER may open one, so today this always equals `buyerOrganizationId`. */
    openedByOrganizationId: z.string(),
    createdAt: IsoDateTimeSchema,
    decidedAt: IsoDateTimeSchema.nullable(),
  })
  .strip();

export const DisputeListPageSchema = cursorPageOf(DisputeSchema);

/**
 * One timeline entry.
 *
 * `sequence` IS GAPLESS AND ORDERS THE TIMELINE — `MAX(sequence) + 1` under the dispute's row lock,
 * not a count. Order by it rather than by `occurredAt`: two events can share a millisecond, and a
 * dispute timeline that reorders itself on a refresh is a record nobody can cite.
 *
 * `note` is null on `opened`, `closed` and `dismissed` when no reason was given. It is never null
 * on `note_added` — a note is the whole event.
 */
export const DisputeTimelineEntrySchema = z
  .object({
    sequence: z.number().int(),
    eventKind: z.enum(DISPUTE_EVENT_KINDS),
    note: z.string().nullable(),
    occurredAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * `GET /commerce/disputes/:disputeId` and the answer to `POST …/notes`.
 *
 * THE NOTE WRITE ANSWERS THE WHOLE TIMELINE, not the one note it added, so the page after a note
 * and the page after a refresh cannot disagree.
 */
export const DisputeDetailSchema = DisputeSchema.extend({
  decisionNote: z.string().nullable(),
  timeline: z.array(DisputeTimelineEntrySchema),
}).strip();

export type Dispute = z.infer<typeof DisputeSchema>;
export type DisputeDetail = z.infer<typeof DisputeDetailSchema>;
export type DisputeListPage = z.infer<typeof DisputeListPageSchema>;
export type DisputeTimelineEntry = z.infer<typeof DisputeTimelineEntrySchema>;

// --- Inputs -----------------------------------------------------------------

export interface ListDisputesFilter {
  readonly state?: DisputeState;
  readonly limit?: number;
  readonly cursor?: string;
}

/** `POST /commerce/disputes/:disputeId/notes`. 1..4000 characters, and the only field. */
export interface AddDisputeNoteInput {
  readonly note: string;
}

// --- Display ----------------------------------------------------------------

export const DISPUTE_STATE_LABELS: Readonly<Record<DisputeState, string>> = {
  open: "Open",
  closed: "Closed",
  dismissed: "Dismissed",
};

/**
 * WHAT EACH EVENT MEANS, and none of these words takes a side.
 *
 * A dispute timeline is read by both parties and, later, by whoever decides it. "Buyer complained"
 * would be an editorial in a record that is supposed to be one.
 */
export const DISPUTE_EVENT_LABELS: Readonly<Record<DisputeEventKind, string>> = {
  opened: "Dispute opened",
  note_added: "Note added",
  closed: "Closed by Qatoto",
  dismissed: "Dismissed by Qatoto",
};
