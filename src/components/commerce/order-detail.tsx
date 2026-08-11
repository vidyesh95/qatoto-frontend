// TRANSPORT: client-query — reads the order, its fulfillment and the viewer's organizations.
"use client";

// ONE ORDER, SEEN FROM EITHER SIDE. Mounted by `/orders-and-returns/[orderId]` and by
// `/studio/orders/[orderId]`, both reading `GET /commerce/orders/:orderId`.
//
// THE ROUTE CHOOSES THE CHROME. THIS COMPONENT CHOOSES THE ACTIONS, and it derives them from the
// payload — never from which URL it was reached by. `getOrder` admits both the buyer and the
// counterparty and returns the SAME projection to each, so the relation comes from comparing
// `buyerOrganizationId` and `counterpartyOrganizationId` against the caller's own organizations, which
// the client asks the server for.
//
// Deriving it from the route instead would break two ways. A provider following a shared buyer link
// would be offered buyer controls that 403 — and worse, the frontend would be asserting an
// authorization fact, which §0 forbids outright. The server re-authorizes every action regardless;
// this only decides what to OFFER.
//
// `relation: "neither"` is rendered rather than assumed away. It should be a 404 from the server, so
// reaching it means the caller arrived through a stale cache — and saying so beats showing an order
// with no controls and no explanation.

import { useMemo } from "react";

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import OrderDeliveryAddressReveal from "@/components/commerce/sections/order-delivery-address-reveal";
import OrderArrivalWindowPanel from "@/components/commerce/sections/order-arrival-window-panel";
import OrderFulfillmentPanel from "@/components/commerce/sections/order-fulfillment-panel";
import StatusPanel from "@/components/home/shared/status-panel";
import OrderCancelControl from "@/components/commerce/sections/order-cancel-control";
import TabStrip from "@/components/home/shared/tab-strip";
import { useOrderQuery, useViewerOrganizationsQuery } from "@/hooks/store/orders";
import { ORDER_STATE_LABELS, SETTLEMENT_RAIL_LABELS } from "@/lib/store/cart.schemas";
import { formatCentsLabel, formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  deriveOrderViewerRelation,
  ORDER_SOURCE_LABELS,
  type OrderDetail as OrderDetailValue,
  type OrderProductLine,
  type OrderViewerRelation,
} from "@/lib/store/orders.schemas";

type OrderDetailViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; order: OrderDetailValue; relation: OrderViewerRelation };

export default function OrderDetail({ orderId }: { orderId: string }) {
  const orderQuery = useOrderQuery(orderId);
  const organizationsQuery = useViewerOrganizationsQuery();

  const viewState = useMemo<OrderDetailViewState>(() => {
    // BOTH must have answered. Rendering the order before knowing who is reading it would show the
    // wrong actions for a frame, and on this surface an action is a cancellation.
    if (orderQuery.isPending || organizationsQuery.isPending) return { status: "loading" };

    if (orderQuery.isError || organizationsQuery.isError) {
      return { status: "error", message: "Couldn't load this order." };
    }

    const orderResult = orderQuery.data;
    const organizationsResult = organizationsQuery.data;
    if (orderResult === undefined || organizationsResult === undefined) {
      return { status: "error", message: "Couldn't load this order." };
    }
    if (!orderResult.success) return { status: "error", message: orderResult.error.message };
    if (!organizationsResult.success) {
      return { status: "error", message: organizationsResult.error.message };
    }

    return {
      status: "ready",
      order: orderResult.data,
      relation: deriveOrderViewerRelation(orderResult.data, organizationsResult.data),
    };
  }, [orderQuery, organizationsQuery]);

  switch (viewState.status) {
    case "loading":
      return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading order…</p>;
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StatusPanel message={viewState.message} className="border border-border px-6 py-16" />
        </div>
      );
    case "ready":
      return <OrderBody order={viewState.order} relation={viewState.relation} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function OrderBody({
  order,
  relation,
}: {
  order: OrderDetailValue;
  relation: OrderViewerRelation;
}) {
  const isBuyerSide = relation === "buyer" || relation === "both";
  const isCounterpartySide = relation === "counterparty" || relation === "both";

  const commercialTerms: DefinitionListItem[] = [
    { term: "Order state", value: ORDER_STATE_LABELS[order.state] },
    { term: "Placed", value: formatIsoInstantLabel(order.createdAt) },
    { term: "Source", value: ORDER_SOURCE_LABELS[order.source] },
    { term: "Buyer", value: order.buyerLegalNameSnapshot },
    { term: "Seller", value: order.counterpartyLegalNameSnapshot },
    // Nullable on the wire, and `DefinitionList` prints "Not provided" for a null rather than dropping
    // the row — on an order, "the seller did not state an Incoterm" is itself the fact worth showing.
    { term: "Incoterm", value: order.incotermSnapshot },
    { term: "Payment terms", value: order.paymentTermsSnapshot },
    {
      term: "Settles",
      value: SETTLEMENT_RAIL_LABELS[order.settlementRail],
    },
    {
      term: "Escrow",
      // Absence made legible, which is why `hasEscrowProtection` is on the wire at all. Leaving it to
      // be inferred from the rail name is how an interface implies a protection nobody agreed to.
      value: order.hasEscrowProtection
        ? "A third party is holding the funds."
        : "Nobody is holding the funds. The buyer carries the counterparty risk.",
    },
  ];

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          {isCounterpartySide && !isBuyerSide ? "Order you received" : "Order you placed"}
        </p>
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          {formatCentsLabel(order.totalInCents, order.currency)}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isCounterpartySide && !isBuyerSide
            ? order.buyerLegalNameSnapshot
            : order.counterpartyLegalNameSnapshot}
        </p>

        {relation === "neither" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-900">
            You are not a member of either organization on this order, so no actions are available.
            If you expected to be, reload — this page may be showing a cached result from another
            session.
          </p>
        )}

        {relation === "both" && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
            Your organization is both the buyer and the seller on this order, so both sides&apos;
            controls are shown.
          </p>
        )}
      </header>

      <TabStrip
        ariaLabel="Order sections"
        initialTabId="terms"
        tabs={[
          {
            id: "terms",
            label: "Terms",
            panel: (
              <div className="space-y-4 px-4 pb-4 lg:px-6">
                <DefinitionList items={commercialTerms} />
                <OrderMoneyBreakdown order={order} />
                {/* Only a counterparty can reveal the address, and only past `confirmed`. The control
                    itself explains what pressing it does — see its own file. */}
                {isCounterpartySide && (
                  <OrderDeliveryAddressReveal orderId={order.id} orderState={order.state} />
                )}
                {/* BOTH SIDES, because the service accepts the buyer OR the counterparty. This used to be a
                    buyer-only line of copy pointing at a cancel control on the orders list that did not
                    exist — see `order-cancel-control.tsx`. */}
                <OrderCancelControl orderId={order.id} orderState={order.state} />
              </div>
            ),
          },
          {
            id: "lines",
            label: "Lines",
            badge: formatCountLabel(order.productLines.length + order.serviceLines.length),
            panel: <OrderLines order={order} isBuyerSide={isBuyerSide} />,
          },
          {
            id: "fulfillment",
            label: "Fulfilment",
            panel: (
              <div className="flex flex-col gap-4 px-4 pb-4 lg:px-6">
                {/*
                  ABOVE the fulfillment panel, and that order is deliberate. This answers "when will
                  it get here", which is what a buyer opens this tab for; the panel below answers
                  "what has happened so far", which matters once something is moving. Today, with no
                  rate cards loaded, the window is null on every order and its content is the NAMED
                  ABSENCE — which of manufacturing, freight and customs is unresolved, and who can
                  clear it. That is still the more useful of the two.
                */}
                <OrderArrivalWindowPanel orderId={order.id} />
                <OrderFulfillmentPanel orderId={order.id} relation={relation} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function OrderMoneyBreakdown({ order }: { order: OrderDetailValue }) {
  return (
    <dl className="space-y-1 rounded-xl border border-border px-4 py-3">
      <MoneyRow label="Subtotal" amountInCents={order.subtotalInCents} currency={order.currency} />
      <MoneyRow label="Tax" amountInCents={order.taxInCents} currency={order.currency} />
      <MoneyRow
        label="Service fee"
        amountInCents={order.serviceFeeInCents}
        currency={order.currency}
      />
      {/* `shippingInCents` is literal `0` on every order, and that is a DECISION rather than a gap:
          nothing is charged for freight, so nothing appears in a total. Rendering the zero as a
          currency amount would read as free shipping, so it reads as what it is. */}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-xs leading-4 text-muted-foreground">Freight</dt>
        <dd className="text-xs leading-4 text-muted-foreground">
          Not charged — arranged separately
        </dd>
      </div>
      <MoneyRow label="Discount" amountInCents={order.discountInCents} currency={order.currency} />
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-1">
        <dt className="text-sm leading-5 font-medium text-foreground">Total</dt>
        <dd className="text-sm leading-5 font-medium text-foreground">
          {formatCentsLabel(order.totalInCents, order.currency)}
        </dd>
      </div>
    </dl>
  );
}

function MoneyRow({
  label,
  amountInCents,
  currency,
}: {
  label: string;
  amountInCents: number;
  currency: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd className="text-xs leading-4 text-foreground">
        {formatCentsLabel(amountInCents, currency)}
      </dd>
    </div>
  );
}

function OrderLines({ order, isBuyerSide }: { order: OrderDetailValue; isBuyerSide: boolean }) {
  return (
    <div className="space-y-4 px-4 pb-4 lg:px-6">
      {order.productLines.length > 0 && (
        <section aria-label="Product lines">
          <ul className="space-y-3">
            {order.productLines.map((line) => (
              <li key={line.id}>
                <ProductLineRow line={line} currency={order.currency} isBuyerSide={isBuyerSide} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.serviceLines.length > 0 && (
        <section aria-label="Service lines">
          <h2 className="pb-2 text-sm font-medium text-foreground">Services on this order</h2>
          <ul className="space-y-2">
            {order.serviceLines.map((line) => (
              <li key={line.id} className="rounded-xl border border-border px-4 py-3">
                <ProviderKindBadge providerKind={line.providerKind} isCompact />
                <p className="mt-1 text-sm leading-5 font-medium text-foreground">
                  {line.titleSnapshot}
                </p>
                <p className="text-xs leading-4 text-muted-foreground">{line.scopeSnapshot}</p>
                <p className="mt-1 text-xs leading-4 text-foreground">
                  {formatCentsLabel(line.feeInCents, order.currency)}
                </p>
                {/* A service line points at a separately stateful engagement, and its progress lives
                    on the Fulfilment tab. Saying so here stops a reader assuming a priced line means
                    a delivered service. */}
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Progress for this service is tracked on the Fulfilment tab.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.productLines.length === 0 && order.serviceLines.length === 0 && (
        <p className="text-xs leading-4 text-muted-foreground">This order has no lines.</p>
      )}
    </div>
  );
}

function ProductLineRow({
  line,
  currency,
  isBuyerSide,
}: {
  line: OrderProductLine;
  currency: string;
  isBuyerSide: boolean;
}) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm leading-5 font-medium text-foreground">{line.titleSnapshot}</p>
      <p className="text-xs leading-4 text-muted-foreground">{line.specificationSnapshot}</p>

      {/* FIVE COUNTERS, EACH STATED, and none computed from the others. A line can be partly fulfilled,
          partly cancelled and partly refunded at once — arithmetic here would flatten that into a
          single wrong number. Only the non-zero ones render, so an ordinary line stays readable. */}
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <QuantityFact label="Ordered" quantity={line.quantityOrdered} isAlwaysShown />
        <QuantityFact label="Reserved" quantity={line.quantityReserved} />
        <QuantityFact label="Fulfilled" quantity={line.quantityFulfilled} />
        <QuantityFact label="Cancelled" quantity={line.quantityCancelled} />
        <QuantityFact label="Refunded" quantity={line.quantityRefunded} />
      </dl>

      <p className="mt-2 text-sm leading-5 font-medium text-foreground">
        {formatCentsLabel(line.lineTotalInCents, currency)}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          {formatCentsLabel(line.unitPriceInCents, currency)} each
        </span>
      </p>

      {/* THE REVIEW CONTROL EXISTS ONLY WHEN A COMPLETION DOES. `completionId` is what
          `POST /commerce/completions/:completionId/reviews` is keyed on, and it is null until the line
          completes — so offering "leave a review" before then would be a button with no id to send.
          Buyer-only: `evaluateReviewRelationship` refuses anyone else, completion id or not. */}
      {isBuyerSide && line.completionId !== null && (
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          This line is complete and can be reviewed.
        </p>
      )}
    </div>
  );
}

function QuantityFact({
  label,
  quantity,
  isAlwaysShown = false,
}: {
  label: string;
  quantity: number;
  isAlwaysShown?: boolean;
}) {
  if (quantity === 0 && !isAlwaysShown) return null;
  return (
    <div>
      <dt className="text-[11px] leading-4 text-muted-foreground">{label}</dt>
      <dd className="text-xs leading-4 text-foreground">{formatCountLabel(quantity)}</dd>
    </div>
  );
}
