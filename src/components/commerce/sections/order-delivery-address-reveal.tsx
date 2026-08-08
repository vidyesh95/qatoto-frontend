// TRANSPORT: client-query — a mutation, deliberately, for a GET.
"use client";

// THE ONE PLACE THIS PLATFORM HANDS ONE ORGANIZATION ANOTHER'S PII.
//
// `GET /commerce/orders/:orderId/delivery-address` returns the buyer's decrypted street lines, recipient
// name and phone to a seller with an active order. Everything about how it is fenced matters to how this
// component behaves:
//
//   IT IS GATED on order membership, a counterparty-operating role, and an order state at or past
//   `confirmed`. So the control is not offered before then — a button that 403s teaches nothing.
//   IT IS RATE-LIMITED, so a component that retried on its own would burn the buyer's allowance.
//   IT WRITES AN AUDIT ENTRY TO THE BUYER'S STREAM ON EVERY READ, and if that write fails the read
//   rolls back. `delivery_address_revealed` is the first READ event in an audit enum whose other fifty
//   values all record writes — which is the entire reason a decrypt path was chosen over a
//   seller-openable encrypted snapshot the seller could hold indefinitely with nobody knowing when they
//   opened it.
//
// Three consequences, all of them load-bearing:
//
//  1. IT IS A MUTATION, NOT A QUERY, even though the verb is GET. A `useQuery` refetches on window focus
//     and on remount, so a seller who left the tab open would generate PII-access records against a
//     buyer who then sees them in their audit trail.
//  2. IT IS BEHIND AN EXPLICIT PRESS, and the button says what pressing it does. Revealing on mount
//     would log an access nobody asked for on every page view.
//  3. THE RESULT IS NOT CACHED under any query key. Caching decrypted PII by order id is how it ends up
//     in a devtools panel and a persisted cache.

import { useRevealDeliveryAddress } from "@/hooks/store/orders";
import type { OrderState } from "@/lib/store/cart.schemas";

/** Past this point a seller has a legitimate need to ship, which is what the gate encodes. */
const REVEALABLE_ORDER_STATES: readonly OrderState[] = [
  "confirmed",
  "in_fulfillment",
  "partially_completed",
  "completed",
  "disputed",
];

export default function OrderDeliveryAddressReveal({
  orderId,
  orderState,
}: {
  orderId: string;
  orderState: OrderState;
}) {
  const revealAddress = useRevealDeliveryAddress();

  if (!REVEALABLE_ORDER_STATES.includes(orderState)) {
    return (
      <div className="rounded-xl border border-border px-4 py-3">
        <p className="text-sm leading-5 font-medium text-foreground">Delivery address</p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Available once this order is confirmed. Until then the order carries only a city and a
          postcode.
        </p>
      </div>
    );
  }

  const result = revealAddress.data;
  const address = result !== undefined && result.success ? result.data : null;

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm leading-5 font-medium text-foreground">Delivery address</p>

      {address === null ? (
        <>
          {/* The copy states the audit consequence BEFORE the press, not after. A seller is entitled to
              this address and also entitled to know the buyer will see that they looked. */}
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            The full address is encrypted. Revealing it is recorded in the buyer&apos;s audit trail
            with the time and your organization.
          </p>
          <button
            type="button"
            onClick={() => revealAddress.mutate({ orderId })}
            disabled={revealAddress.isPending}
            className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {revealAddress.isPending ? "Revealing…" : "Reveal delivery address"}
          </button>

          {result !== undefined && !result.success && (
            <p className="mt-2 text-xs leading-4 text-destructive">{result.error.message}</p>
          )}
          {revealAddress.isError && (
            <p className="mt-2 text-xs leading-4 text-destructive">
              Couldn&apos;t reveal the address. Nothing was recorded.
            </p>
          )}
        </>
      ) : (
        <>
          <address className="mt-1 text-sm leading-5 text-foreground not-italic">
            {address.recipientName}
            {address.streetLines.map((streetLine) => (
              <span key={streetLine} className="block">
                {streetLine}
              </span>
            ))}
            <span className="block">
              {[address.locality, address.region, address.postalCode]
                .filter((part) => part !== null && part !== "")
                .join(", ")}
            </span>
            <span className="block">{address.countryCode}</span>
            {address.phone !== null && <span className="block">{address.phone}</span>}
          </address>
          {/* Said AFTER the reveal too, because this is the moment the seller might copy it somewhere
              the platform cannot see. */}
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            This access has been recorded. Use it only to fulfil this order.
          </p>
        </>
      )}
    </div>
  );
}
