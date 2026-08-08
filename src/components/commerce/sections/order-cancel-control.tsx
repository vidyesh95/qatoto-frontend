// TRANSPORT: client-query — writes POST /commerce/orders/:orderId/cancel.
"use client";

// THE CANCEL CONTROL, and it exists because a line of copy used to stand in for it: the order page said "this
// order can still be cancelled from the orders list" and no such control was anywhere. A promise the product
// cannot keep is worse than a missing button.
//
// EITHER PARTY MAY CANCEL, so this is not buyer-only. `cancelOrder` in the service accepts the buyer
// organization OR the counterparty and answers 404 to anyone else. A provider who cannot fulfil needs the same
// door as a buyer who changed their mind — and rendering it for one side only would have made the other side's
// legitimate action look unavailable.
//
// NO REASON FIELD. The endpoint parses `z.union([z.undefined(), EmptyObjectSchema])` — there is no field for a
// reason, the service takes none and no column stores one. A textarea here would collect an explanation that
// goes nowhere, which is worse than not asking.
//
// TWO CONFIRMATION-SHAPED THINGS THAT ARE NOT DECORATION:
//
//  1. IT ASKS TWICE, in-page. Cancellation releases reserved stock and cancels every cancellable engagement on
//     the order in one transaction. There is no undo, and a single mis-click should not reach it.
//  2. THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT and reused across retries. `idempotency({ required: true })`
//     sits in front of the route, so a call without the header is refused before the service runs.
//
// THE STATE GATE IS UX, NOT AUTHORIZATION. `isOrderCancellable` mirrors `CANCELLABLE_ORDER_STATES`, and the
// server re-checks it under a row lock — so a button enabled from stale state produces a 409, which is why the
// refusal is rendered rather than swallowed.

import { useState } from "react";

import { useCancelOrder } from "@/hooks/store/orders";
import { newIdempotencyKey } from "@/lib/idempotency";
// `ORDER_STATES` and their labels live in `cart.schemas.ts` — the checkout declared them first and the order
// domain imports rather than re-declaring, so there is one spelling of the Postgres enum.
import { ORDER_STATE_LABELS, type OrderState } from "@/lib/store/cart.schemas";
import { isOrderCancellable } from "@/lib/store/orders.schemas";

export default function OrderCancelControl({
  orderId,
  orderState,
}: {
  orderId: string;
  orderState: OrderState;
}) {
  const cancelOrder = useCancelOrder();
  const [isConfirming, setIsConfirming] = useState(false);
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  if (!isOrderCancellable(orderState)) {
    // SAYS WHY, using the state's own label. "Cannot be cancelled" with no reason reads as a permission
    // problem when it is a lifecycle one — a shipped order is not cancellable for anybody.
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        This order is {ORDER_STATE_LABELS[orderState].toLowerCase()}, so it can no longer be
        cancelled.
      </p>
    );
  }

  const cancelResult = cancelOrder.data;

  return (
    <section aria-label="Cancel this order" className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm font-medium text-foreground">Cancel this order</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        Reserved stock is released and every service still cancellable on this order is cancelled
        with it. It cannot be undone, and a new order would be needed to start again.
      </p>

      {isConfirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={cancelOrder.isPending}
            onClick={() => cancelOrder.mutate({ orderId, idempotencyKey })}
            className="cursor-pointer rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {cancelOrder.isPending ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button
            type="button"
            disabled={cancelOrder.isPending}
            onClick={() => setIsConfirming(false)}
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40"
          >
            Keep the order
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="mt-2 cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-destructive outline -outline-offset-1 outline-border"
        >
          Cancel order
        </button>
      )}

      {/* The server's own refusal. A 409 here means the state moved while the page was open — most often the
          order was paid or shipped — and the message names it. */}
      {cancelResult !== undefined && !cancelResult.success && (
        <p className="mt-2 text-xs leading-4 text-destructive">{cancelResult.error.message}</p>
      )}
      {cancelOrder.isError && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. The cancellation may already have been recorded — pressing
          again is safe and cannot cancel anything twice.
        </p>
      )}
      {cancelResult !== undefined &&
        cancelResult.success && (
          // READS THE SERVER'S STATE BACK rather than announcing success. The mock returns the order unchanged,
          // so this deliberately reports what the order now says instead of claiming it is cancelled.
          <p className="mt-2 text-xs leading-4 text-muted-foreground">
            The server accepted the request. This order now reads{" "}
            {ORDER_STATE_LABELS[cancelResult.data.state].toLowerCase()}.
          </p>
        )}
    </section>
  );
}
