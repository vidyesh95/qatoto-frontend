// TRANSPORT: client-query — reads whichever order endpoint the surface belongs to.
"use client";

// The order queue, for the buyer at `/orders-and-returns` and the seller at `/studio/orders`.
//
// `which` PICKS THE ENDPOINT, NOT A FILTER. `GET /commerce/orders` returns orders where you are the
// buyer; `GET /commerce/provider/orders` returns orders where you are the counterparty. Two reads with
// two different authorizations — collapsing them into one call with a role flag would be the client
// asserting which side it is on, and the same organization can legitimately appear in both.
//
// The row's link target differs per surface for the same reason: a seller opening an order should land on
// the studio detail, where the counterparty controls live.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useOrderListQuery } from "@/hooks/store/orders";
import { ORDER_STATE_LABELS, SETTLEMENT_RAIL_LABELS } from "@/lib/store/cart.schemas";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";
import { ORDER_SOURCE_LABELS, type OrderSummary } from "@/lib/store/orders.schemas";

export default function OrderList({ which }: { which: "buyer" | "provider" }) {
  const orderListQuery = useOrderListQuery(which);

  if (orderListQuery.isPending) {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading orders…</p>;
  }

  const result = orderListQuery.data;
  if (result === undefined || orderListQuery.isError) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message="Couldn't load your orders."
          className="border border-border px-6 py-16"
        />
      </div>
    );
  }
  if (!result.success) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={result.error.message}
          className="border border-border px-6 py-16"
          action={
            // 401 only. A 404 must never become a sign-in prompt.
            result.error.code === "401" ? (
              <Link
                href="/sign-in"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Sign in
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (result.data.items.length === 0) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={
            which === "buyer"
              ? "You haven't placed any orders yet."
              : "Nobody has ordered from you yet."
          }
          className="border border-border px-6 py-16"
          action={
            which === "buyer" ? (
              <Link
                href="/store"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Browse the store
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3 px-4 lg:px-6">
      {result.data.items.map((order) => (
        <li key={order.id}>
          <OrderRow order={order} which={which} />
        </li>
      ))}
    </ul>
  );
}

function OrderRow({ order, which }: { order: OrderSummary; which: "buyer" | "provider" }) {
  // The counterparty from the READER's point of view: a buyer wants to see who they bought from, a
  // seller wants to see who bought. Both names are snapshotted on the order, so neither is a lookup.
  const otherPartyName =
    which === "buyer" ? order.counterpartyLegalNameSnapshot : order.buyerLegalNameSnapshot;

  return (
    <Link
      href={which === "buyer" ? `/orders-and-returns/${order.id}` : `/studio/orders/${order.id}`}
      className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm leading-5 font-medium text-foreground">{otherPartyName}</p>
        <p className="text-sm leading-5 font-medium text-foreground">
          {formatCentsLabel(order.totalInCents, order.currency)}
        </p>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-muted-foreground">
        <span>{ORDER_STATE_LABELS[order.state]}</span>
        <span>{ORDER_SOURCE_LABELS[order.source]}</span>
        <span>{formatIsoInstantLabel(order.createdAt)}</span>
      </div>

      {/* Escrow, or its absence, on every row. It is the difference between money someone is holding and
          money nobody is, and a queue that only mentioned it on the protected orders would leave the
          unprotected ones reading as protected by default. */}
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
        {order.hasEscrowProtection
          ? SETTLEMENT_RAIL_LABELS[order.settlementRail]
          : `${SETTLEMENT_RAIL_LABELS[order.settlementRail]} No escrow.`}
      </p>
    </Link>
  );
}
