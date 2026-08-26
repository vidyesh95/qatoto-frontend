// TRANSPORT: client-query — reads the order's arrival window and its three components.
"use client";

// WHEN THIS ORDER SHOULD ARRIVE, OR WHICH COMPONENT STOPS ANYONE KNOWING.
//
// The order page showed no delivery estimate at all. This is the one surface in the product where a
// DATE is defensible: an order has a confirmed clock start, a seller-declared manufacturing deadline,
// a rated freight leg and a customs dwell estimate behind it. Everywhere else carries days.
//
// THE COMPONENTS RENDER BESIDE THE WINDOW, NEVER COLLAPSED INTO IT. `arrivalWindow: null` is the
// ordinary case today — the rate tables ship empty — and a panel that showed only the window would be
// blank on every real order. What is useful is WHICH of manufacturing, freight and customs is
// unresolved, because each has a different person who can clear it.
//
// THREE DISTINCTIONS THIS PANEL EXISTS TO KEEP VISIBLE:
//
//  1. `not_applicable` IS AN ANSWER, NOT A GAP. A domestic lane genuinely has no customs leg, and the
//     window still closes over it. Only `unknown` reaches `missingComponents`.
//  2. customs `domestic_lane` AND customs `no_dwell_estimate_for_lane` READ DIFFERENTLY, deliberately.
//     The first is "there is no customs step"; the second is "nobody has bought dwell data for this
//     lane", and it is precisely why the window cannot close. Rendering both as "Customs: —" hides
//     the only difference that matters.
//  3. `clockStartAt` AND `orderPlacedAt` ARE DIFFERENT INSTANTS. The clock starts when the order is
//     CONFIRMED, not when it was placed, so an order that sat unpaid has a legible gap between them.
//     That gap is the answer to "why is my window later than I expected", and it is shown.
//
// NO MODE IS AUTO-SELECTED. With no `?mode=` the server answers `freight: unknown / mode_not_selected`
// and lists the modes it covers — that is a choice to offer, not a default to guess. Picking the
// cheapest here would silently commit a buyer to five weeks at sea.

import { useState } from "react";

import { useOrderArrivalWindowQuery } from "@/hooks/store/orders";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  ARRIVAL_WINDOW_COMPONENT_LABELS,
  type ArrivalWindowProjection,
} from "@/lib/store/arrival-window.schemas";
import { type FreightMode } from "@/lib/store/freight.schemas";
import {
  ComponentRow,
  CustomsLine,
  FreightLine,
  ManufacturingLine,
  formatIsoDayLabel,
} from "@/components/commerce/sections/arrival-window-component-lines";

type ArrivalWindowViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; projection: ArrivalWindowProjection };

export default function OrderArrivalWindowPanel({ orderId }: { readonly orderId: string }) {
  // `null` until the buyer picks — see the file header. This is state, not a default.
  const [selectedMode, setSelectedMode] = useState<FreightMode | null>(null);
  const arrivalWindowQuery = useOrderArrivalWindowQuery(orderId, selectedMode);

  const result = arrivalWindowQuery.data;
  const viewState: ArrivalWindowViewState = arrivalWindowQuery.isPending
    ? { status: "loading" }
    : result === undefined
      ? { status: "loading" }
      : !result.success
        ? { status: "error", message: result.error.message }
        : { status: "ready", projection: result.data };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <h3 className="text-sm font-medium text-foreground">Arrival</h3>
      {renderArrivalWindow(viewState, selectedMode, setSelectedMode)}
    </section>
  );
}

function renderArrivalWindow(
  viewState: ArrivalWindowViewState,
  selectedMode: FreightMode | null,
  onSelectMode: (mode: FreightMode) => void,
) {
  switch (viewState.status) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Working out the arrival window…</p>;
    case "error":
      // A 403 here is an answer: the route needs an active commerce organization, unlike the order
      // read beside it. The backend's own sentence says which.
      return <p className="text-sm text-destructive">{viewState.message}</p>;
    case "ready": {
      const { projection } = viewState;
      return (
        <>
          <WindowHeadline projection={projection} />
          <ClockNote projection={projection} />
          <dl className="flex flex-col gap-2">
            <ComponentRow name="manufacturing">
              <ManufacturingLine component={projection.components.manufacturing} />
            </ComponentRow>
            <ComponentRow name="freight">
              <FreightLine
                component={projection.components.freight}
                selectedMode={selectedMode}
                onSelectMode={onSelectMode}
              />
            </ComponentRow>
            <ComponentRow name="customs">
              <CustomsLine component={projection.components.customs} />
            </ComponentRow>
          </dl>
        </>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

/**
 * The date pair, or the named reason there is none.
 *
 * NEVER AN APPROXIMATION IN THE NULL CASE. `missingComponents` is the whole answer, and it is
 * rendered as the list it is — a "roughly six weeks" derived from the components that DID resolve
 * would be a date the platform cannot keep, assembled from a calculation nobody performed.
 */
function WindowHeadline({ projection }: { readonly projection: ArrivalWindowProjection }) {
  if (projection.arrivalWindow !== null) {
    return (
      <p className="text-sm text-foreground">
        <span className="font-medium">
          {formatIsoDayLabel(projection.arrivalWindow.fromDate)} –{" "}
          {formatIsoDayLabel(projection.arrivalWindow.toDate)}
        </span>
        <span className="block text-xs text-muted-foreground">
          Anchored to the manufacturing deadline, then freight and customs on top.
        </span>
      </p>
    );
  }

  if (projection.missingComponents.length === 0) {
    // Every component resolved and the window is still null — the clock has not started. Say that
    // rather than implying something is missing.
    return (
      <p className="text-sm text-muted-foreground">
        No arrival window yet — the clock starts when this order is confirmed.
      </p>
    );
  }

  const missingLabels = projection.missingComponents.map(
    (componentName) => ARRIVAL_WINDOW_COMPONENT_LABELS[componentName],
  );

  return (
    <p className="text-sm text-muted-foreground">
      No arrival window yet.{" "}
      {missingLabels.length === 1
        ? `${missingLabels[0]} is still unknown.`
        : `${missingLabels.slice(0, -1).join(", ")} and ${missingLabels[missingLabels.length - 1]} are still unknown.`}
    </p>
  );
}

/**
 * When the clock started, and when the order was placed.
 *
 * TWO INSTANTS, SHOWN AS TWO. `clockStartAt` is `confirmedAt`; `orderPlacedAt` is `createdAt`. The
 * gap between them is time the buyer spent before payment cleared, and it is the reason a window can
 * look later than the order date suggests.
 */
function ClockNote({ projection }: { readonly projection: ArrivalWindowProjection }) {
  if (projection.clockStartAt === null) {
    return (
      <p className="text-xs text-muted-foreground">
        Placed {formatIsoInstantLabel(projection.orderPlacedAt)}. Not confirmed yet, so nothing is
        counting down.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Placed {formatIsoInstantLabel(projection.orderPlacedAt)} · clock started{" "}
      {formatIsoInstantLabel(projection.clockStartAt)} when the order was confirmed.
    </p>
  );
}
