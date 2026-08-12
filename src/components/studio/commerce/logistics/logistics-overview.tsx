// TRANSPORT: client-query — reads GET /commerce/provider/shipments.
"use client";

// THIS PAGE USED TO APOLOGISE FOR A GAP THAT HAD ALREADY CLOSED.
//
// Its banner read "there is NO cross-order shipment list. GET /commerce/provider/shipments does not
// exist, so this page shows no shipments and does not pretend to", and it rendered an amber panel
// pointing the seller at two other pages instead. The route shipped with A29
// (`commerce-fulfillment.routes.ts:40`); nothing here was revisited.
//
// THE BANNER WAS RIGHT ABOUT THE WRONG ANSWER, and that reasoning survives: building this on the
// client by fanning out `GET /commerce/orders/:orderId/shipments` per order is N+1 requests from a
// browser and cannot sort or page across the result. This reads the server-side list instead.
//
// THREE THINGS THE QUEUE MUST NOT INVENT:
//
//  1. `estimatedArrivalAt` IS NULLABLE AND STAYS BLANK WHEN NULL. It is `max()` across the legs, and
//     a shipment whose legs carry no ETA has none. A substituted date here is one somebody schedules
//     a truck against.
//  2. THE LANE FIELDS ARE NULLABLE TOO. A shipment created before its origin was known has no
//     origin, and an em-dash is the honest render.
//  3. AN EMPTY QUEUE IS NOT AN ERROR. A seller with nothing in transit sees an empty state, which
//     is a different sentence from a failed read.

import { useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useShipmentQueueQuery } from "@/hooks/store/shipments";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  SHIPMENT_STATES,
  SHIPMENT_STATE_LABELS,
  type ShipmentQueueRow,
  type ShipmentState,
} from "@/lib/store/shipments.schemas";

export default function LogisticsOverview() {
  // Local rather than URL state: this is a studio queue behind a session, not a shareable view, and
  // the filter is applied SERVER-side either way — `?state=` is a real query key on this route.
  const [selectedState, setSelectedState] = useState<ShipmentState | undefined>(undefined);
  const shipmentsQuery = useShipmentQueueQuery(
    "provider",
    selectedState === undefined ? {} : { state: selectedState },
  );

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Logistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every shipment across the orders you are carrying.
        </p>
      </header>

      {/* BUTTONS, NOT LINKS, and the difference is deliberate. `FilterChipRow` builds hrefs because
          the public browse surfaces keep their filters in the URL — shareable, bookmarkable,
          restored on back-navigation. None of that applies to a queue behind a session that only
          its owner can open.

          The half of the rule that DOES apply is honoured: `state` is a real query key on this
          route and the server applies it. Nothing here filters a fetched page, which is the thing
          §0 actually forbids — it silently short-pages every result. */}
      <fieldset className="mt-3 flex flex-wrap gap-2 px-4 lg:px-6">
        <legend className="sr-only">Filter shipments by state</legend>
        <StateChip
          label="All shipments"
          isSelected={selectedState === undefined}
          onSelect={() => setSelectedState(undefined)}
        />
        {SHIPMENT_STATES.map((state) => (
          <StateChip
            key={state}
            label={SHIPMENT_STATE_LABELS[state]}
            isSelected={selectedState === state}
            onSelect={() => setSelectedState(state)}
          />
        ))}
      </fieldset>

      <div className="mt-3 px-4 lg:px-6">{renderQueue(shipmentsQuery, selectedState)}</div>
    </div>
  );
}

function StateChip({
  label,
  isSelected,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
        isSelected
          ? "border-transparent bg-[#00696E] text-white"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function renderQueue(
  shipmentsQuery: ReturnType<typeof useShipmentQueueQuery>,
  selectedState: ShipmentState | undefined,
) {
  if (shipmentsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading shipments…</p>;
  }

  const result = shipmentsQuery.data;
  if (shipmentsQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your shipments."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }

  if (result.data.items.length === 0) {
    // An empty FILTERED queue is a different sentence from an empty one.
    return (
      <StatusPanel
        message={
          selectedState === undefined
            ? "Nothing is in transit. Shipments appear here once an order is ready to ship."
            : `No ${SHIPMENT_STATE_LABELS[selectedState].toLowerCase()} shipments.`
        }
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.items.map((shipment) => (
        <ShipmentRow key={shipment.id} shipment={shipment} />
      ))}
    </ul>
  );
}

function ShipmentRow({ shipment }: { shipment: ShipmentQueueRow }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {SHIPMENT_STATE_LABELS[shipment.state]}
          {" · "}
          <Link href={`/studio/orders/${shipment.orderId}`} className="hover:underline">
            Order
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          {/* Blank when the legs carry no ETA. See rule 1 — never a stand-in date. */}
          {shipment.estimatedArrivalAt === null
            ? "No estimated arrival yet"
            : `Arrives around ${formatIsoInstantLabel(shipment.estimatedArrivalAt)}`}
        </p>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {formatLane(shipment)} · {shipment.packageCount}{" "}
        {shipment.packageCount === 1 ? "package" : "packages"}
        {shipment.totalWeightGrams === null
          ? ""
          : ` · ${(shipment.totalWeightGrams / 1000).toFixed(1)} kg`}
      </p>
    </li>
  );
}

/** Both ends are nullable — a shipment can exist before its lane is known. */
function formatLane(shipment: ShipmentQueueRow): string {
  const origin = shipment.originLocality ?? shipment.originCountryCode ?? "—";
  const destination = shipment.destinationLocality ?? shipment.destinationCountryCode ?? "—";
  return `${origin} → ${destination}`;
}
