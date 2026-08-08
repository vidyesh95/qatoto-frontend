// TRANSPORT: client-query — reads the derived fulfillment progress.
"use client";

// Shipments, legs, engagements, and what needs a human.
//
// THE RULE THIS PANEL EXISTS TO NOT BREAK: COMPLETION OF ONE THING NEVER MARKS ANOTHER COMPLETE. Customs,
// insurance, inspection, lab, warehouse, marketing and FX each run their own state machine, and the
// coordinator derives an overview for display. So `overallState` is rendered as the server's summary and
// nothing here infers one connector's progress from another's — a panel that showed "3 of 4 done" over
// unrelated state machines would be inventing a sequence they do not have.
//
// `attentionItems` IS RENDERED FIRST AND ALWAYS. It is the list of things that need a human, and an
// attention item nobody surfaced is the failure the backend built it to prevent. `legacy_missing_snapshot`
// in particular is not an error — it means the engagement predates typed deliverables, so its results
// cannot be read back — and dropping it would leave a buyer wondering where the report went.

import Link from "next/link";

import RecordTimeline, {
  type RecordTimelineEntry,
} from "@/components/commerce/shared/record-timeline";
import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import { useOrderFulfillmentQuery } from "@/hooks/store/orders";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import {
  attentionItemLabel,
  formatBasisPointsLabel,
  FULFILLMENT_OVERALL_STATE_LABELS,
  SERVICE_ENGAGEMENT_STATE_LABELS,
  SHIPMENT_STATE_LABELS,
  type FulfillmentEngagement,
  type FulfillmentShipment,
} from "@/lib/store/fulfillment.schemas";
import type { OrderViewerRelation } from "@/lib/store/orders.schemas";

export default function OrderFulfillmentPanel({
  orderId,
  relation,
}: {
  orderId: string;
  relation: OrderViewerRelation;
}) {
  const fulfillmentQuery = useOrderFulfillmentQuery(orderId);

  if (fulfillmentQuery.isPending) {
    return <p className="text-xs leading-4 text-muted-foreground">Loading fulfilment…</p>;
  }

  const result = fulfillmentQuery.data;

  // A 404 here means no fulfillment record, which is normal for an order nothing has shipped on yet —
  // NOT an error, and not "we lost it".
  if (result === undefined || (!result.success && result.error.code === "404")) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        Nothing has shipped or been scheduled on this order yet.
      </p>
    );
  }
  if (!result.success) {
    return <p className="text-xs leading-4 text-destructive">{result.error.message}</p>;
  }

  const fulfillment = result.data;
  const isBuyerSide = relation === "buyer" || relation === "both";

  return (
    <div className="space-y-4">
      <section aria-label="Overall progress" className="rounded-xl border border-border px-4 py-3">
        <p className="text-sm leading-5 font-medium text-foreground">
          {FULFILLMENT_OVERALL_STATE_LABELS[fulfillment.overallState]}
        </p>
        {/* `basisPoints` is out of 10,000, so the formatter divides by 100. Rendering it raw would say
            9,917% complete. */}
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
          {formatCountLabel(fulfillment.progress.completedUnits)} of{" "}
          {formatCountLabel(fulfillment.progress.totalUnits)} units ·{" "}
          {formatBasisPointsLabel(fulfillment.progress.basisPoints)}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          A summary across separate services. Each one below finishes on its own schedule.
        </p>
      </section>

      {fulfillment.attentionItems.length > 0 && (
        <section aria-label="Needs attention" className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm leading-5 font-medium text-amber-900">Needs attention</p>
          <ul className="mt-1 space-y-1">
            {fulfillment.attentionItems.map((item) => (
              <li
                key={`${item.kind}-${item.engagementId}`}
                className="text-xs leading-4 text-amber-900"
              >
                {attentionItemLabel(item.kind)}{" "}
                <Link
                  href={
                    isBuyerSide
                      ? `/service-engagements/${item.engagementId}`
                      : `/studio/service-engagements/${item.engagementId}`
                  }
                  className="underline"
                >
                  Open it
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fulfillment.shipments.length > 0 && (
        <section aria-label="Shipments">
          <h3 className="pb-2 text-sm font-medium text-foreground">Shipments</h3>
          <ul className="space-y-3">
            {fulfillment.shipments.map((shipment) => (
              <li key={shipment.id}>
                <ShipmentBlock shipment={shipment} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {fulfillment.engagements.length > 0 && (
        <section aria-label="Services">
          <h3 className="pb-2 text-sm font-medium text-foreground">Services on this order</h3>
          <ul className="space-y-2">
            {fulfillment.engagements.map((engagement) => (
              <li key={engagement.id}>
                <EngagementRow engagement={engagement} isBuyerSide={isBuyerSide} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ShipmentBlock({ shipment }: { shipment: FulfillmentShipment }) {
  // Legs become timeline entries from what ACTUALLY happened. An estimated arrival is a plan and never
  // fills the actual's place — a leg with no `actualArrivalAt` has not arrived, and the timeline says so
  // by having no arrival rung rather than by showing the estimate.
  const entries: RecordTimelineEntry[] = shipment.legs.flatMap((leg) => {
    const legLabel = `${FREIGHT_TRANSPORT_MODE_LABELS[leg.mode]}: ${
      leg.originLocality ?? leg.originCountryCode ?? "origin"
    } → ${leg.destinationLocality ?? leg.destinationCountryCode ?? "destination"}`;

    const legEntries: RecordTimelineEntry[] = [];
    if (leg.actualDepartureAt !== null) {
      legEntries.push({
        id: `${leg.id}-departed`,
        occurredAtIso: leg.actualDepartureAt,
        title: `Departed — ${legLabel}`,
        detail: leg.trackingReference === null ? null : `Tracking ${leg.trackingReference}`,
        isTerminal: false,
      });
    }
    if (leg.actualArrivalAt !== null) {
      legEntries.push({
        id: `${leg.id}-arrived`,
        occurredAtIso: leg.actualArrivalAt,
        title: `Arrived — ${legLabel}`,
        detail: null,
        isTerminal: true,
      });
    }
    return legEntries;
  });

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm leading-5 font-medium text-foreground">
          {SHIPMENT_STATE_LABELS[shipment.state]}
        </p>
        <span className="text-[11px] leading-4 text-muted-foreground">
          {formatCountLabel(shipment.legs.length)} {shipment.legs.length === 1 ? "leg" : "legs"}
        </span>
      </div>

      {/* Planned legs listed separately from the timeline. A plan is not an event, and putting one on a
          timeline is how a shipment appears to have moved. */}
      <ul className="mt-2 space-y-1">
        {shipment.legs.map((leg) => (
          <li key={leg.id} className="text-xs leading-4 text-muted-foreground">
            {FREIGHT_TRANSPORT_MODE_LABELS[leg.mode]} ·{" "}
            {leg.originLocality ?? leg.originCountryCode ?? "—"} →{" "}
            {leg.destinationLocality ?? leg.destinationCountryCode ?? "—"}
            {leg.estimatedArrivalAt !== null && leg.actualArrivalAt === null && (
              <span> · due {formatIsoInstantLabel(leg.estimatedArrivalAt)}, not yet arrived</span>
            )}
            {leg.logisticsEngagementId === null && <span> · moved by the seller</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <RecordTimeline
          entries={entries}
          emptyMessage="This shipment is planned but nothing has moved yet."
        />
      </div>
    </div>
  );
}

function EngagementRow({
  engagement,
  isBuyerSide,
}: {
  engagement: FulfillmentEngagement;
  isBuyerSide: boolean;
}) {
  return (
    <Link
      href={
        isBuyerSide
          ? `/service-engagements/${engagement.id}`
          : `/studio/service-engagements/${engagement.id}`
      }
      className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary"
    >
      <ProviderKindBadge providerKind={engagement.providerKind} isCompact />
      <p className="mt-1 text-sm leading-5 font-medium text-foreground">
        {engagement.titleSnapshot}
      </p>
      <p className="text-xs leading-4 text-muted-foreground">
        {SERVICE_ENGAGEMENT_STATE_LABELS[engagement.state]}
      </p>
      {engagement.executionContractState === "legacy_missing_snapshot" && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Predates typed deliverables — its results cannot be shown here.
        </p>
      )}
    </Link>
  );
}
