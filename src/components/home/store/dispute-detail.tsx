// TRANSPORT: client-query — reads GET /commerce/disputes/:disputeId and writes
// POST /commerce/disputes/:disputeId/notes.
"use client";

// THIS PAGE USED TO APOLOGISE FOR A GAP THAT HAD ALREADY CLOSED.
//
// Its banner read "there is NO participant-scoped read for a dispute — GET /commerce/disputes/:disputeId
// does not exist", and it rendered an amber panel telling the user Qatoto could not show them a
// dispute they had raised. The route shipped in Phase 15 (A28) and gained a note write in Phase 23
// (A40); nothing here was revisited. Three files in this repo carried a claim like that.
//
// FOUR RULES THE REBUILT PAGE HOLDS:
//
//  1. A 404 IS NOT A PERMISSION HINT. The backend answers 404 for "no such dispute" and "you are not
//     a party" with one code so the route cannot enumerate ids. This renders one sentence for both
//     and never says "you do not have access", which would undo that in the copy.
//  2. THE TIMELINE ORDERS BY `sequence`, NOT BY TIME. Sequence is gapless and taken under the
//     dispute's row lock; two events can share a millisecond, and a record that reorders itself on
//     refresh is one nobody can cite.
//  3. NOTES ARE FOR AN OPEN DISPUTE ONLY, and both parties may write them. Once decided the route
//     answers 409 — the order's prior state has been restored and the table is append-only, so a
//     late note could never be withdrawn. The composer disappears rather than 409ing.
//  4. NOTHING IS OPTIMISTIC. The write answers the whole updated timeline and the hook writes that
//     into the cache; a note rendered before the server has it is a statement somebody believes
//     they made in a record that never received it.
//
// AND IT IS STILL NOT WIRED TO `dispute.service.ts`. That file has a `DisputeView` with a tempting
// shape and belongs to the R&D proof-of-effort dispute domain — a different table about equity.

import { useMemo, useState } from "react";

import Link from "next/link";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import StatusPanel from "@/components/home/shared/status-panel";
import { useAddDisputeNote, useDisputeQuery } from "@/hooks/store/disputes";
import { newIdempotencyKey } from "@/lib/idempotency";
import { ORDER_STATE_LABELS } from "@/lib/store/cart.schemas";
import {
  DISPUTE_EVENT_LABELS,
  DISPUTE_STATE_LABELS,
  type DisputeDetail as DisputeDetailValue,
  type DisputeTimelineEntry,
} from "@/lib/store/disputes.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

type DisputeViewState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; dispute: DisputeDetailValue };

export default function DisputeDetail({ disputeId }: { disputeId: string }) {
  const disputeQuery = useDisputeQuery(disputeId);

  const viewState = useMemo<DisputeViewState>(() => {
    if (disputeQuery.isPending) return { status: "loading" };
    if (disputeQuery.isError) return { status: "error", message: "Couldn't load this dispute." };

    const result = disputeQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) {
      // ONE BRANCH FOR BOTH FACTS, deliberately — see rule 1.
      if (result.error.code === "404") return { status: "notFound" };
      return { status: "error", message: result.error.message };
    }
    return { status: "ready", dispute: result.data };
  }, [disputeQuery]);

  switch (viewState.status) {
    case "loading":
      return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading dispute…</p>;
    case "notFound":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StatusPanel
            message="We can't find that dispute."
            className="border border-border px-6 py-16"
            action={
              <Link
                href="/orders-and-returns"
                className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
              >
                Your orders
              </Link>
            }
          />
        </div>
      );
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StatusPanel message={viewState.message} className="border border-border px-6 py-16" />
        </div>
      );
    case "ready":
      return <DisputeBody dispute={viewState.dispute} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function DisputeBody({ dispute }: { dispute: DisputeDetailValue }) {
  const isOpen = dispute.state === "open";

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Dispute · {DISPUTE_STATE_LABELS[dispute.state]}
        </p>
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          {dispute.reasonCode.replaceAll("_", " ")}
        </h1>
        <p className="mt-1 text-sm leading-5 text-foreground">{dispute.summary}</p>
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          Opened {formatIsoInstantLabel(dispute.createdAt)} ·{" "}
          <Link href={`/orders-and-returns/${dispute.orderId}`} className="hover:underline">
            View the order
          </Link>
        </p>

        {/* The order state the dispute FROZE. Not the order's current state, which is `disputed`
            until somebody decides this — saying otherwise would misreport where fulfilment stands. */}
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
          The order was {ORDER_STATE_LABELS[dispute.priorOrderState].toLowerCase()} when this
          opened, and returns to that state once the dispute is decided.
        </p>

        {dispute.decisionNote !== null && (
          <p className="mt-2 rounded-lg border border-border px-3 py-2 text-sm leading-5 text-foreground">
            {dispute.decisionNote}
          </p>
        )}
      </header>

      <section aria-label="Dispute timeline" className="mt-4 px-4 lg:px-6">
        <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Timeline
        </h2>
        <ol className="mt-2 space-y-3">
          {/* ORDERED BY `sequence`. See rule 2 — `toSorted` rather than trusting arrival order,
              because the client must not depend on the server's array order for a legal record. */}
          {dispute.timeline
            .toSorted((left, right) => left.sequence - right.sequence)
            .map((entry) => (
              <TimelineRow key={entry.sequence} entry={entry} />
            ))}
        </ol>
      </section>

      {isOpen ? (
        <DisputeNoteComposer disputeId={dispute.id} />
      ) : (
        <p className="mt-4 px-4 text-xs leading-4 text-muted-foreground lg:px-6">
          This dispute has been decided, so nothing further can be added to it. The record above is
          final.
        </p>
      )}
    </div>
  );
}

function TimelineRow({ entry }: { entry: DisputeTimelineEntry }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs leading-4 text-muted-foreground">
        {DISPUTE_EVENT_LABELS[entry.eventKind]} · {formatIsoInstantLabel(entry.occurredAt)}
      </p>
      {/* `note` is null on an `opened` or a decision that carried no reason. Nothing stands in for
          it — a placeholder would put words on a record neither party wrote. */}
      {entry.note !== null && (
        <p className="mt-1 text-sm leading-5 whitespace-pre-line text-foreground">{entry.note}</p>
      )}
    </li>
  );
}

/**
 * Either party's reply, while the dispute is open.
 *
 * THE KEY ROTATES ONLY AFTER A CONFIRMED SUCCESS. A retry of a timed-out note must carry the same
 * one — the timeline is append-only and nobody can delete a duplicate — and a genuinely second note
 * is a different act that must not dedupe against the first.
 */
function DisputeNoteComposer({ disputeId }: { disputeId: string }) {
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const addNote = useAddDisputeNote();

  const trimmedNote = note.trim();
  const isSubmittable = trimmedNote.length > 0 && !addNote.isPending;

  return (
    <section aria-label="Add a note" className="mt-4 px-4 lg:px-6">
      <label className="block text-xs leading-4 text-muted-foreground" htmlFor="dispute-note">
        Add to this dispute — the other party reads it, and so does whoever decides it
      </label>
      <textarea
        id="dispute-note"
        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        rows={4}
        maxLength={4000}
        value={note}
        onChange={(changeEvent) => setNote(changeEvent.target.value)}
      />
      <button
        type="button"
        disabled={!isSubmittable}
        onClick={() =>
          addNote.mutate(
            { disputeId, note: trimmedNote, idempotencyKey },
            {
              onSuccess: (result) => {
                if (!result.success) return;
                setNote("");
                setIdempotencyKey(newIdempotencyKey());
              },
            },
          )
        }
        className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {addNote.isPending ? "Adding…" : "Add note"}
      </button>
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        Notes cannot be edited or removed once added.
      </p>

      <MutationNotice
        result={addNote.data}
        hasThrown={addNote.isError}
        fallbackMessage="Couldn't reach the server. Nothing was added."
      />
    </section>
  );
}
