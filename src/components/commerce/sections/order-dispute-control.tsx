// TRANSPORT: client-query — writes POST /commerce/orders/:orderId/disputes.
"use client";

// OPENING A DISPUTE, which the platform could read and not write. `GET /commerce/disputes`, the
// detail read and the note write were all wired; the route that CREATES one had no caller, so every
// dispute a buyer could open was one somebody had seeded. A read-only grievance surface is worse
// than none: it tells a buyer the mechanism exists and gives them no door to it.
//
// FOUR RULES, AND THREE OF THEM ARE THE SERVICE'S, MIRRORED HERE AS UX RATHER THAN AS AUTHORIZATION:
//
//  1. THE BUYER OPENS IT, NOBODY ELSE. `evaluateDisputeOpeningRelationship` answers `forbidden` for
//     any actor that is not the order's buyer organization. A seller answering an accusation adds a
//     NOTE to the existing dispute — that is what the note write is for — and rendering this control
//     on their side would offer a door that only ever 403s.
//  2. ONLY FROM FOUR ORDER STATES. A `draft` or `cancelled` order has nothing to dispute and the
//     route answers `invalid_state`. The gate here is convenience; the server re-checks under a
//     row lock, which is why a refusal is rendered rather than swallowed.
//  3. AN ORDER HAS AT MOST ONE OPEN DISPUTE. Asking again while one is open answers the EXISTING
//     one rather than creating a second, so the success path links to whatever came back instead of
//     claiming something new was made.
//  4. IT ASKS FOR A REASON FROM A LIST, NOT A TEXTAREA. `reasonCode` is free text under a regex
//     rather than a pgEnum, so a text input would fragment one reason into six spellings nobody can
//     group. The summary is where the buyer says what actually happened.
//
// ⚠️ WHAT IT DOES: MOVES THE ORDER TO `disputed` and freezes the state it came from. This is not a
// message to the seller — it is a state change on a live order, and the copy says so before the
// button is pressed.
//
// ⚠️ WHAT IT DOES NOT DO: MOVE MONEY. Qatoto holds none — there is no escrow in this codebase — so
// opening a dispute refunds nothing, holds nothing and releases nothing. Copy that implied
// otherwise would be promising a rail that does not exist.

import { useState } from "react";

import Link from "next/link";

import { useOpenOrderDisputeMutation } from "@/hooks/store/disputes";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { type OrderState } from "@/lib/store/cart.schemas";
import {
  DISPUTABLE_ORDER_STATES,
  DISPUTE_REASON_CODE_LABELS,
  DISPUTE_REASON_CODES,
  type DisputeReasonCode,
} from "@/lib/store/disputes.schemas";
import type { OrderViewerRelation } from "@/lib/store/orders.schemas";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40";

/** Narrows a `<select>`'s value against the tuple it was rendered from. NOT an `as`. */
function narrowToReasonCode(value: string): DisputeReasonCode | undefined {
  return DISPUTE_REASON_CODES.find((reasonCode) => reasonCode === value);
}

function isOrderDisputable(orderState: OrderState): boolean {
  return DISPUTABLE_ORDER_STATES.some((disputable) => disputable === orderState);
}

export default function OrderDisputeControl({
  orderId,
  orderState,
  relation,
}: {
  orderId: string;
  orderState: OrderState;
  relation: OrderViewerRelation;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<DisputeReasonCode>("not_delivered");
  const [summary, setSummary] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const openDispute = useOpenOrderDisputeMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  // `both` counts: an organization that is somehow on both sides of an order is still its buyer.
  const isBuyerSide = relation === "buyer" || relation === "both";
  if (!isBuyerSide) return null;

  // SAYS WHY, using the lifecycle rather than a permission word. An order that has not been
  // confirmed yet is not disputable for anybody.
  if (!isOrderDisputable(orderState)) return null;

  const openedDispute = openDispute.data?.success === true ? openDispute.data.data : null;
  if (openedDispute !== null) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        This order has an open dispute.{" "}
        <Link href={`/disputes/${openedDispute.id}`} className="font-medium text-primary underline">
          Open it
        </Link>
      </p>
    );
  }

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className={QUIET_BUTTON_CLASS}>
        Open a dispute
      </button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-border px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (openDispute.isPending) return;
        const trimmedSummary = summary.trim();
        if (trimmedSummary.length === 0) {
          setLocalError("Say what went wrong. The seller reads this.");
          return;
        }
        setLocalError(null);
        openDispute.mutate(
          {
            orderId,
            input: { reasonCode, summary: trimmedSummary },
            idempotencyKey: getIdempotencyKey(),
          },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              setSummary("");
              setIsOpen(false);
            },
          },
        );
      }}
    >
      <p className="text-sm font-medium text-foreground">Open a dispute</p>
      <p className="text-[11px] leading-4 text-muted-foreground">
        This puts the order into a disputed state and starts a record both sides can add to. It does
        not move any money — Qatoto holds none.
      </p>

      <label className="block text-xs font-medium text-muted-foreground">
        What went wrong
        <select
          value={reasonCode}
          onChange={(event) =>
            setReasonCode(narrowToReasonCode(event.target.value) ?? "not_delivered")
          }
          className={FIELD_CLASS}
        >
          {DISPUTE_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {DISPUTE_REASON_CODE_LABELS[code]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-muted-foreground">
        In your own words
        <textarea
          value={summary}
          maxLength={4000}
          rows={4}
          onChange={(event) => setSummary(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={openDispute.isPending} className={PRIMARY_BUTTON_CLASS}>
          {openDispute.isPending ? "Opening…" : "Open the dispute"}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className={QUIET_BUTTON_CLASS}>
          Cancel
        </button>
      </div>

      {localError !== null && <p className="text-xs leading-4 text-destructive">{localError}</p>}
      {openDispute.data?.success === false && (
        <p className="text-xs leading-4 text-destructive">{openDispute.data.error.message}</p>
      )}
      {openDispute.isError && (
        <p className="text-xs leading-4 text-destructive">
          That dispute was not opened. Try again.
        </p>
      )}
    </form>
  );
}
