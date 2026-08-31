// TRANSPORT: client-query — reads GET /commerce/provider/orders and GET /commerce/provider/shipments.
"use client";

// THE SELLER'S SALES DESK: what you have been paid, orders received, and what still needs
// dispatching.
//
// WHAT CHANGED IN PHASE 25, because this file used to argue the opposite. It shipped with a panel
// reading "Revenue and profit are not shown here yet — nothing on this platform reports a seller's
// takings", and that was true of the ROUTES and false of the DATA. The double-entry journal, the
// payment intents and the refund rows had all existed since Phase 14; there was simply no endpoint
// that summed them, and `deriveCommerceJournalBalances` had no caller anywhere in the backend.
// `GET /commerce/provider/earnings` is that endpoint, and `SellerEarningsPanel` renders it.
//
// THE OLD PANEL'S ARGUMENT WAS STILL RIGHT, AND THE NEW ONE HONOURS IT. Summing `totalInCents`
// over the orders below would count unpaid orders, ignore refunds, ignore fees, and cover one page.
// The earnings read does none of those: it counts settled payment intents, reports refunds beside
// them rather than netting them away, and aggregates over every order rather than a page.
//
// STILL NOT SHOWN, AND STILL NOT FAKED: profit. Nothing here records what a seller PAID for their
// goods, so margin has no input. The panel says so rather than relabelling revenue.
//
// DISPATCH IS A SERVER-SIDE QUERY NOW, NOT A CLIENT FILTER. `GET /commerce/provider/orders` was
// `.strict()` over `{ limit, cursor }`, so this page used to filter the fetched page and said so in
// a comment — defensible only because no server filter existed. Phase 25 added `?state=`, so the
// dispatch queue is its own read and a seller with sixty orders sees all the dispatchable ones
// rather than those that happened to land on page one.

import Link from "next/link";

import OrderList from "@/components/commerce/order-list";
import SellerEarningsPanel from "@/components/commerce/sections/seller-earnings-panel";
import StatusPanel from "@/components/home/shared/status-panel";
import { useOrderListQuery } from "@/hooks/store/orders";
import { useShipmentQueueQuery } from "@/hooks/store/shipments";
import { ORDER_STATE_LABELS } from "@/lib/store/cart.schemas";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";
import type { OrderSummary } from "@/lib/store/orders.schemas";
import { SHIPMENT_STATE_LABELS } from "@/lib/store/shipments.schemas";

export default function SalesPage() {
  /**
   * ITS OWN READ, not a view of the list below.
   *
   * `confirmed` means paid and not yet shipped, which is the dispatch queue. `pending_payment` and
   * `payment_processing` are not dispatchable — shipping against an unsettled payment is the seller
   * carrying the risk the rail exists to remove — and `in_fulfillment` means a shipment exists.
   */
  const dispatchQueueQuery = useOrderListQuery("provider", { state: "confirmed" });
  const shipmentsQuery = useShipmentQueueQuery("provider");

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Sales</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Orders you have received, and what still needs to go out.
        </p>
      </header>

      <section aria-label="What you have been paid" className="mt-4 px-4 lg:px-6">
        <SellerEarningsPanel />
      </section>

      <section aria-label="Ready to dispatch" className="mt-6 px-4 lg:px-6">
        <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Ready to dispatch
        </h2>
        <div className="mt-2">{renderDispatchQueue(dispatchQueueQuery)}</div>
      </section>

      <section aria-label="All orders received" className="mt-6">
        <h2 className="px-4 text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase lg:px-6">
          All orders received
        </h2>
        {/* `OrderList` RATHER THAN A LOCAL LIST. This was the entire body of `/studio/orders` until
            that page folded into this one, and keeping it is what stops the provider half of
            `OrderList` becoming unreachable code. Its rows are a superset of `OrderRow` below —
            they also carry the order source and the settlement rail. It supplies its own
            horizontal padding, which is why the section is bare and the heading pads itself. */}
        <OrderList which="provider" />
      </section>

      <section aria-label="Shipments" className="mt-6 px-4 lg:px-6">
        <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Shipments
        </h2>
        <div className="mt-2">{renderShipments(shipmentsQuery)}</div>
      </section>
    </div>
  );
}

/**
 * A REAL QUERY NOW, and the copy changed with it.
 *
 * This used to filter the fetched page and say "Nothing ON THIS PAGE is waiting to be dispatched",
 * because that was the only honest thing a client-side filter could claim. `?state=confirmed` is
 * applied in SQL, so the sentence no longer has to hedge.
 */
function renderDispatchQueue(dispatchQueueQuery: ReturnType<typeof useOrderListQuery>) {
  const orders = readOrders(dispatchQueueQuery);
  if (orders === null) return <OrdersFallback ordersQuery={dispatchQueueQuery} />;

  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing is waiting to be dispatched.</p>;
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

/** `null` when the read has not answered or refused — the fallback renders the reason. */
function readOrders(
  ordersQuery: ReturnType<typeof useOrderListQuery>,
): readonly OrderSummary[] | null {
  const result = ordersQuery.data;
  if (ordersQuery.isPending || ordersQuery.isError || result === undefined) return null;
  if (!result.success) return null;
  return result.data.items;
}

function OrdersFallback({ ordersQuery }: { ordersQuery: ReturnType<typeof useOrderListQuery> }) {
  if (ordersQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }
  const result = ordersQuery.data;
  const message =
    result !== undefined && !result.success ? result.error.message : "Couldn't load your orders.";
  return <StatusPanel message={message} className="border border-border px-6 py-16" />;
}

function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <Link href={`/studio/orders/${order.id}`} className="block hover:underline">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{order.buyerLegalNameSnapshot}</p>
          <p className="text-sm font-medium text-foreground">
            {formatCentsLabel(order.totalInCents, order.currency)}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ORDER_STATE_LABELS[order.state]} · {formatIsoInstantLabel(order.createdAt)}
          {/* Absence made legible — the same reason `hasEscrowProtection` is on the wire. */}
          {order.hasEscrowProtection ? " · escrowed" : ""}
        </p>
      </Link>
    </li>
  );
}

function renderShipments(shipmentsQuery: ReturnType<typeof useShipmentQueueQuery>) {
  if (shipmentsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading shipments…</p>;
  }

  const result = shipmentsQuery.data;
  if (shipmentsQuery.isError || result === undefined || !result.success) {
    const message =
      result !== undefined && !result.success ? result.error.message : "Couldn't load shipments.";
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  if (result.data.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing in transit.{" "}
        <Link href="/studio/logistics" className="underline">
          Logistics
        </Link>{" "}
        has the full queue.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.items.map((shipment) => (
        <li key={shipment.id} className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm text-foreground">
            {SHIPMENT_STATE_LABELS[shipment.state]} · {shipment.packageCount}{" "}
            {shipment.packageCount === 1 ? "package" : "packages"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {/* Never a stand-in date — the ETA lives on the legs and may not exist. */}
            {shipment.estimatedArrivalAt === null
              ? "No estimated arrival yet"
              : `Arrives around ${formatIsoInstantLabel(shipment.estimatedArrivalAt)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
