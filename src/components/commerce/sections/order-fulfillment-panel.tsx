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

import { useState } from "react";

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
import {
  useAppendShipmentEventMutation,
  useCreateOrderShipmentMutation,
} from "@/hooks/store/shipments";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  APPENDABLE_SHIPMENT_EVENT_KIND_LABELS,
  APPENDABLE_SHIPMENT_EVENT_KINDS,
  type AppendableShipmentEventKind,
} from "@/lib/store/shipments.schemas";
import type { OrderProductLine, OrderViewerRelation } from "@/lib/store/orders.schemas";

export default function OrderFulfillmentPanel({
  orderId,
  relation,
  productLines,
}: {
  orderId: string;
  relation: OrderViewerRelation;
  /**
   * The order's own lines, passed down because the fulfillment read does not carry them and a
   * shipment is built FROM them. Only the counterparty side uses this.
   */
  productLines: readonly OrderProductLine[];
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
  /**
   * WHO SHIPS. The service scopes both writes to the order's counterparty, so a buyer pressing
   * these would collect a refusal. Offering them anyway would not grant anything — the server
   * re-authorizes — it would just be the studio telling a buyer they are the one with the boxes.
   */
  const isCounterpartySide = relation === "counterparty" || relation === "both";

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
                {isCounterpartySide && (
                  <ShipmentEventControl orderId={orderId} shipmentId={shipment.id} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isCounterpartySide && <CreateShipmentForm orderId={orderId} productLines={productLines} />}

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

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40";

/** Narrows a `<select>`'s value against the tuple it was rendered from. NOT an `as`. */
function narrowToEventKind(value: string): AppendableShipmentEventKind | undefined {
  return APPENDABLE_SHIPMENT_EVENT_KINDS.find((eventKind) => eventKind === value);
}

/**
 * Records what happened to one shipment.
 *
 * ⚠️ **`delivered` IS A CLAIM THE BUYER READS ON THEIR OWN ORDER**, so nothing here is optimistic:
 * the shipment's new state arrives with the response and the panel refetches. A **409** is the
 * state machine refusing the transition — advancing something already cancelled — and is shown
 * verbatim rather than retried.
 */
function ShipmentEventControl({ orderId, shipmentId }: { orderId: string; shipmentId: string }) {
  const [eventKind, setEventKind] = useState<AppendableShipmentEventKind>("in_transit");
  const [description, setDescription] = useState("");
  const appendEvent = useAppendShipmentEventMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (appendEvent.isPending) return;
        const trimmedDescription = description.trim();
        appendEvent.mutate(
          {
            orderId,
            shipmentId,
            input: {
              eventKind,
              // `occurredAt` is omitted, which the backend reads as now. A date picker here would
              // let somebody record a delivery for a time that has not happened.
              ...(trimmedDescription.length === 0 ? {} : { description: trimmedDescription }),
            },
            idempotencyKey: getIdempotencyKey(),
          },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              setDescription("");
            },
          },
        );
      }}
    >
      <label className="text-xs font-medium text-muted-foreground">
        Record
        <select
          value={eventKind}
          onChange={(changeEvent) =>
            setEventKind(narrowToEventKind(changeEvent.target.value) ?? "in_transit")
          }
          className={FIELD_CLASS}
        >
          {APPENDABLE_SHIPMENT_EVENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {APPENDABLE_SHIPMENT_EVENT_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[12rem] flex-1 text-xs font-medium text-muted-foreground">
        What happened (optional)
        <input
          type="text"
          value={description}
          maxLength={2000}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <button type="submit" disabled={appendEvent.isPending} className={QUIET_BUTTON_CLASS}>
        {appendEvent.isPending ? "Recording…" : "Record it"}
      </button>
      {appendEvent.data?.success === false && (
        <p className="w-full text-xs leading-4 text-destructive">
          {appendEvent.data.error.message}
        </p>
      )}
      {appendEvent.isError && (
        <p className="w-full text-xs leading-4 text-destructive">
          That event was not recorded. Try again.
        </p>
      )}
    </form>
  );
}

/**
 * Creates a shipment from the order's own lines.
 *
 * ⚠️ **A LINE CAN SHIP IN PARTS, so the quantities are per line and default to nothing.** The cap
 * rendered here is the ordered quantity, which is a CONVENIENCE: the server checks against what
 * remains unshipped, which is the smaller number once a first box has gone.
 *
 * ⚠️ **NO LEGS.** The route accepts them and this form sends none — a leg is its own state machine
 * with `expectedVersion` commands, and creating one with no way to advance it would leave a booking
 * nobody can move.
 */
function CreateShipmentForm({
  orderId,
  productLines,
}: {
  orderId: string;
  productLines: readonly OrderProductLine[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantityByLineId, setQuantityByLineId] = useState<Record<string, string>>({});
  const [packageCount, setPackageCount] = useState("1");
  const [originLocality, setOriginLocality] = useState("");
  const [destinationLocality, setDestinationLocality] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const createShipment = useCreateOrderShipmentMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className={PRIMARY_BUTTON_CLASS}>
        Create a shipment
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (createShipment.isPending) return;

        const lines = productLines.flatMap((productLine) => {
          const quantity = Number.parseInt(quantityByLineId[productLine.id] ?? "", 10);
          return Number.isNaN(quantity) || quantity <= 0
            ? []
            : [{ orderProductLineId: productLine.id, quantity }];
        });
        if (lines.length === 0) {
          setLocalError("Say how many of at least one line are in this shipment.");
          return;
        }
        const packages = Number.parseInt(packageCount, 10);
        if (Number.isNaN(packages) || packages <= 0) {
          setLocalError("A shipment has at least one package.");
          return;
        }
        setLocalError(null);

        const trimmedOrigin = originLocality.trim();
        const trimmedDestination = destinationLocality.trim();
        createShipment.mutate(
          {
            orderId,
            input: {
              lines,
              packageCount: packages,
              // A lane nobody has stated is OMITTED rather than blanked — an invented origin is one
              // somebody schedules a truck against.
              ...(trimmedOrigin.length === 0 ? {} : { originLocality: trimmedOrigin }),
              ...(trimmedDestination.length === 0
                ? {}
                : { destinationLocality: trimmedDestination }),
            },
            idempotencyKey: getIdempotencyKey(),
          },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              setQuantityByLineId({});
              setPackageCount("1");
              setOriginLocality("");
              setDestinationLocality("");
              setIsOpen(false);
            },
          },
        );
      }}
    >
      <p className="text-sm font-medium text-foreground">What is in this shipment</p>
      <ul className="space-y-2">
        {productLines.map((productLine) => (
          <li key={productLine.id} className="flex flex-wrap items-end gap-2">
            <span className="min-w-0 flex-1 text-xs leading-4 text-foreground">
              {productLine.titleSnapshot}
              <span className="text-muted-foreground">
                {" "}
                · {formatCountLabel(productLine.quantityOrdered)} ordered
              </span>
            </span>
            <label className="text-xs font-medium text-muted-foreground">
              Shipping now
              <input
                type="number"
                min={0}
                max={productLine.quantityOrdered}
                value={quantityByLineId[productLine.id] ?? ""}
                onChange={(event) =>
                  setQuantityByLineId((quantities) => ({
                    ...quantities,
                    [productLine.id]: event.target.value,
                  }))
                }
                className={`${FIELD_CLASS} w-24`}
              />
            </label>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted-foreground">
          Packages
          <input
            type="number"
            min={1}
            value={packageCount}
            onChange={(event) => setPackageCount(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Leaving from (optional)
          <input
            type="text"
            value={originLocality}
            maxLength={150}
            onChange={(event) => setOriginLocality(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Going to (optional)
          <input
            type="text"
            value={destinationLocality}
            maxLength={150}
            onChange={(event) => setDestinationLocality(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">
        Leave a line at zero to ship it later — an order can go out in several shipments.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={createShipment.isPending} className={PRIMARY_BUTTON_CLASS}>
          {createShipment.isPending ? "Creating…" : "Create the shipment"}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className={QUIET_BUTTON_CLASS}>
          Cancel
        </button>
      </div>

      {localError !== null && <p className="text-xs leading-4 text-destructive">{localError}</p>}
      {createShipment.data?.success === false && (
        <p className="text-xs leading-4 text-destructive">{createShipment.data.error.message}</p>
      )}
      {createShipment.isError && (
        <p className="text-xs leading-4 text-destructive">
          That shipment was not created. Try again.
        </p>
      )}
    </form>
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
