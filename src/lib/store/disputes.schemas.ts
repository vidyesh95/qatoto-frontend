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
