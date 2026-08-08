// TRANSPORT: mock — there is NO cross-order shipment list. `GET /commerce/provider/shipments` does not exist,
// so this page shows no shipments and does not pretend to.
"use client";

// THE ONE ROUTE ON THIS SURFACE WHOSE DATA IS ALMOST THERE, which makes it the easiest to fake by accident.
//
// WHAT THE BACKEND EXPOSES, verified in `commerce-fulfillment.routes.ts`:
//
//   `GET /commerce/orders/:orderId/shipments`   — every shipment on ONE order
//   `GET /commerce/shipments/:shipmentId`       — one shipment
//   `GET /commerce/shipments/:shipmentId/events` — its event history
//
// Every read is scoped to an order or a shipment the caller already has an id for. There is no
// "all shipments across my orders", which is the only thing a logistics queue is.
//
// THE TEMPTING WRONG ANSWER IS TO BUILD IT ON THE CLIENT: list the provider's orders, then fetch each one's
// shipments and merge. That is N+1 requests fanning out from a browser, it re-implements a server join in
// untrusted code, and it cannot sort or page — the client would hold page one of orders and call the merged
// result "your shipments", silently omitting every shipment on page two. CLAUDE.md's rule covers exactly this:
// heavy or data-shaped work belongs in the Express backend, and the client renders what it returns.
//
// So this page lists nothing and points at the place the data IS readable: each order's own fulfillment panel,
// which is wired and real.

import Link from "next/link";

export default function LogisticsOverview() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">Logistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          A single queue of every shipment you are carrying is not available yet.
        </p>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-900">Why there is no list here</p>
        <p className="mt-1 text-xs leading-4 text-amber-900">
          Shipments can only be read one order at a time. Qatoto could stitch a list together in
          your browser by fetching each order in turn, but it would be a request per order and it
          could only ever cover the orders currently loaded — so a shipment could be missing from a
          page that claims to show all of them. A queue needs to be built on the server to be
          trustworthy, and that is not built yet.
        </p>
      </div>

      <section
        aria-label="Where shipments are readable"
        className="rounded-xl border border-border px-4 py-3"
      >
        <p className="text-sm font-medium text-foreground">Where your shipments are, today</p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Open any order you are fulfilling. Its shipments, their legs, their tracking references
          and their full event history are all there and all real — the same data this page would
          show, one order at a time.
        </p>
        <Link
          href="/studio/orders"
          className="mt-2 inline-block cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Orders you are fulfilling
        </Link>
      </section>

      <section
        aria-label="Service engagements"
        className="rounded-xl border border-border px-4 py-3"
      >
        <p className="text-sm font-medium text-foreground">Freight you were engaged for</p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          A service engagement is the other half of this work, and those DO have their own list.
        </p>
        <Link
          href="/service-engagements"
          className="mt-2 inline-block cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
        >
          Your engagements
        </Link>
      </section>
    </div>
  );
}
