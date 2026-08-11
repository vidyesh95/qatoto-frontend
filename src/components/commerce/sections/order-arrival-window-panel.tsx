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
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import {
  ARRIVAL_WINDOW_COMPONENT_LABELS,
  CUSTOMS_DWELL_SCOPE_LABELS,
  FREIGHT_UNKNOWN_REASON_LABELS,
  type ArrivalWindowProjection,
  type CustomsComponent,
  type FreightComponent,
  type ManufacturingComponent,
} from "@/lib/store/arrival-window.schemas";
import { CHARGEABLE_WEIGHT_BASIS_LABELS, type FreightMode } from "@/lib/store/freight.schemas";
import { formatCentsLabel } from "@/lib/store/format";

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

function ComponentRow({
  name,
  children,
}: {
  readonly name: keyof typeof ARRIVAL_WINDOW_COMPONENT_LABELS;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <dt className="text-xs font-medium text-muted-foreground">
        {ARRIVAL_WINDOW_COMPONENT_LABELS[name]}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function ManufacturingLine({ component }: { readonly component: ManufacturingComponent }) {
  switch (component.status) {
    case "known":
      return (
        <>
          {/* `daysMin` is nullable INSIDE `known`: a seller may declare only a maximum, and `basis`
              says which happened so this never guesses that a missing floor means "immediate". */}
          {component.basis === "declared_range" && component.daysMin !== null
            ? `${component.daysMin}–${component.daysMax} days`
            : `up to ${component.daysMax} days`}
          <span className="block text-xs text-muted-foreground">
            Ready by {formatIsoDayLabel(component.endsAt)}
          </span>
        </>
      );
    case "not_applicable":
      return <span className="text-muted-foreground">No physical goods on this order.</span>;
    case "unknown":
      return (
        <span className="text-muted-foreground">
          This seller hasn&apos;t declared a lead time for these goods.
        </span>
      );
    default: {
      const exhaustiveCheck: never = component;
      return exhaustiveCheck;
    }
  }
}

/**
 * Freight, and the mode picker that clears its most common `unknown`.
 *
 * `mode_not_selected` IS OFFERED AS A CHOICE, NOT REPORTED AS A FAULT. It arrives with
 * `availableModes` precisely so the client can render the buttons, and it is the one entry here the
 * buyer can clear themselves in one click.
 */
function FreightLine({
  component,
  selectedMode,
  onSelectMode,
}: {
  readonly component: FreightComponent;
  readonly selectedMode: FreightMode | null;
  readonly onSelectMode: (mode: FreightMode) => void;
}) {
  switch (component.status) {
    case "known":
      return (
        <>
          {component.daysMin}–{component.daysMax} days by{" "}
          {FREIGHT_TRANSPORT_MODE_LABELS[component.mode]}
          <span className="block text-xs text-muted-foreground">
            {/* The price is the forwarder's. Every leg names its own chargeable-weight basis,
                because two forwarders' divisors legitimately disagree on one journey. */}
            {formatCentsLabel(component.priceInCents, component.currency)}
            {component.validUntil !== null &&
              ` · rate valid until ${formatIsoDayLabel(component.validUntil)}`}
          </span>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {component.legSelections.map((legSelection) => (
              <li key={legSelection.legSequence} className="text-xs text-muted-foreground">
                Leg {legSelection.legSequence}: {legSelection.sourceForwarderName} ·{" "}
                {CHARGEABLE_WEIGHT_BASIS_LABELS[legSelection.chargeableWeightBasis]}
              </li>
            ))}
          </ul>
        </>
      );
    case "not_applicable":
      return <span className="text-muted-foreground">No physical goods on this order.</span>;
    case "unknown":
      return (
        <>
          <span className="text-muted-foreground">
            {FREIGHT_UNKNOWN_REASON_LABELS[component.reason]}
          </span>
          {component.availableModes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {component.availableModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectMode(mode)}
                  aria-pressed={mode === selectedMode}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                    mode === selectedMode
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {FREIGHT_TRANSPORT_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </>
      );
    default: {
      const exhaustiveCheck: never = component;
      return exhaustiveCheck;
    }
  }
}

/**
 * Customs dwell, as its own component.
 *
 * THE TWO `not_applicable` REASONS SAY DIFFERENT THINGS AND BOTH ARE SHOWN AS THEMSELVES.
 * `domestic_lane` means there is no customs step and the window closes over it; the `unknown` arm
 * beneath means nobody has bought dwell data for this lane, which is why it cannot.
 */
function CustomsLine({ component }: { readonly component: CustomsComponent }) {
  switch (component.status) {
    case "known":
      return (
        <>
          {component.clearanceDaysMin}–{component.clearanceDaysMax} days to clear
          <span className="block text-xs text-muted-foreground">
            {/* A weaker scope is a weaker claim, and says so rather than reading as precise. */}
            {component.source} · {CUSTOMS_DWELL_SCOPE_LABELS[component.scope]}
            {component.validUntil !== null &&
              ` · valid until ${formatIsoDayLabel(component.validUntil)}`}
          </span>
        </>
      );
    case "not_applicable":
      return (
        <span className="text-muted-foreground">
          {component.reason === "domestic_lane"
            ? "Domestic route — no customs step."
            : "No physical goods on this order."}
        </span>
      );
    case "unknown":
      return (
        <span className="text-muted-foreground">
          No clearance estimate has been published for this lane, so the arrival window can&apos;t
          be closed.
        </span>
      );
    default: {
      const exhaustiveCheck: never = component;
      return exhaustiveCheck;
    }
  }
}

function formatIsoDayLabel(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  if (Number.isNaN(parsed.getTime())) return isoInstant;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
