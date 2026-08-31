// TRANSPORT: client-query — reads GET /commerce/shipments/:shipmentId and
// GET /commerce/shipment-legs/:legId/events, writes POST /commerce/shipment-legs/:legId/commands.
"use client";

// THE LEGS, AND THE COMMANDS THAT MOVE THEM. Three backend routes shipped with the Phase 6
// fulfilment service and had NO frontend caller at all — `GET /commerce/shipments/:shipmentId`,
// `POST /commerce/shipment-legs/:legId/commands` and `GET /commerce/shipment-legs/:legId/events`.
// A leg could be created and then never booked, departed, arrived or completed by anybody.
//
// WHY THIS IS THE "WHICH TRANSPORT" SURFACE. `mode` and `logisticsEngagementId` live on the LEG,
// not the shipment, and the cross-order queue projects neither. A seller asking "how is this
// moving, and who is carrying it" has no other place to look.
//
// FOUR RULES, EACH ONE LOAD-BEARING:
//
//  1. `expectedVersion` IS ECHOED FROM THE LEG THAT WAS READ, NEVER INVENTED. Leg commands execute
//     through an outbox and a stale version is refused. A 409 means somebody else moved this leg —
//     that is a finding to show, not a number to bump and resend.
//  2. NOTHING IS OPTIMISTIC. Every arm is a claim about physical goods that the buyer reads on
//     their own order. The new state comes from the refetch, never from the button that was pressed.
//  3. THE IDEMPOTENCY KEY IS MINTED PER ATTEMPT, in component state, and rotated only on success.
//     A fresh key on a retry executes the command a second time.
//  4. `logisticsEngagementId === null` MEANS THE SELLER IS MOVING IT THEMSELVES — never
//     "unassigned". `ShipmentLegSchema` says so in as many words, and "unassigned" would read as a
//     gap somebody should fill.
//
// ⚠️ WHAT THIS PANEL CANNOT DO, AND SAYS SO RATHER THAN HIDING IT. A leg exists only if it was
// declared when the shipment was created, and `logisticsEngagementId` is settable only there. No
// route adds a leg to an existing shipment or re-points its engagement, so a seller who books a
// forwarder afterwards has nowhere to record it.

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  useExecuteShipmentLegCommandMutation,
  useShipmentDetailQuery,
  useShipmentLegEventsQuery,
} from "@/hooks/store/shipments";
import {
  SHIPMENT_LEG_EVENT_KIND_LABELS,
  SHIPMENT_LEG_STATE_LABELS,
  type ShipmentLeg,
} from "@/lib/store/fulfillment.schemas";
import { countryLabelFromCode, formatIsoInstantLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_ICONS, FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import {
  SHIPMENT_LEG_COMMAND_LABELS,
  SHIPMENT_LEG_COMMANDS_BY_STATE,
  type ShipmentDetail,
  type ShipmentLegCommand,
  type ShipmentLegCommandName,
} from "@/lib/store/shipments.schemas";

type ShipmentDetailViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; shipment: ShipmentDetail };

export default function ShipmentLegPanel({ shipmentId }: { readonly shipmentId: string }) {
  const shipmentDetailQuery = useShipmentDetailQuery(shipmentId);

  const result = shipmentDetailQuery.data;
  const viewState: ShipmentDetailViewState = shipmentDetailQuery.isPending
    ? { status: "loading" }
    : shipmentDetailQuery.isError || result === undefined
      ? { status: "error", message: "Couldn't load this shipment." }
      : !result.success
        ? { status: "error", message: result.error.message }
        : result.data.legs.length === 0
          ? { status: "empty" }
          : { status: "ready", shipment: result.data };

  switch (viewState.status) {
    case "loading":
      return <p className="mt-3 text-xs text-muted-foreground">Loading legs…</p>;
    case "error":
      return (
        <StatusPanel message={viewState.message} className="mt-3 border border-border px-4 py-6" />
      );
    case "empty":
      return (
        // NOT AN ERROR, AND NOT A GAP TO FILL FROM HERE. Legs are declared when the shipment is
        // created and nowhere else, so this shipment will never have any.
        <p className="mt-3 text-xs text-muted-foreground">
          No legs were declared for this shipment, so there is no route to track. Legs can only be
          added when a shipment is created.
        </p>
      );
    case "ready":
      return (
        <div className="mt-3 space-y-2">
          {viewState.shipment.legs.map((leg) => (
            <LegRow key={leg.id} leg={leg} shipmentId={viewState.shipment.id} />
          ))}
          <InsuranceSignpost />
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function LegRow({ leg, shipmentId }: { readonly leg: ShipmentLeg; readonly shipmentId: string }) {
  const [openCommand, setOpenCommand] = useState<ShipmentLegCommandName | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const availableCommands = SHIPMENT_LEG_COMMANDS_BY_STATE[leg.state];

  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Image
          src={`/icons/${FREIGHT_TRANSPORT_MODE_ICONS[leg.mode]}`}
          width={18}
          height={18}
          alt=""
        />
        <p className="text-sm font-medium text-foreground">
          Leg {leg.sequence + 1} · {FREIGHT_TRANSPORT_MODE_LABELS[leg.mode]}
        </p>
        <p className="text-xs text-muted-foreground">{SHIPMENT_LEG_STATE_LABELS[leg.state]}</p>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{formatLegRoute(leg)}</p>

      {/* WHO IS CARRYING IT. Null is a real answer with its own meaning, not a missing value. */}
      <p className="mt-1 text-xs text-muted-foreground">
        {leg.logisticsEngagementId === null ? (
          "You are moving this leg."
        ) : (
          <Link
            href={`/service-engagements/${leg.logisticsEngagementId}`}
            className="underline hover:no-underline"
          >
            Carried by a logistics engagement
          </Link>
        )}
        {leg.carrierReference === null ? "" : ` · Carrier ${leg.carrierReference}`}
        {leg.trackingReference === null ? "" : ` · Tracking ${leg.trackingReference}`}
      </p>

      {/* ESTIMATED AND ACTUAL ARE FOUR SEPARATE FIELDS AND NEITHER FALLS BACK TO THE OTHER. An
          estimate rendered where the actual is missing tells a buyer their goods moved when nobody
          has said so. */}
      <p className="mt-1 text-[11px] text-muted-foreground">{describeLegTiming(leg)}</p>

      {availableCommands.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          This leg is {SHIPMENT_LEG_STATE_LABELS[leg.state].toLowerCase()} — nothing further to do.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {availableCommands.map((commandName) => (
            <button
              key={commandName}
              type="button"
              onClick={() => setOpenCommand(openCommand === commandName ? null : commandName)}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              {SHIPMENT_LEG_COMMAND_LABELS[commandName]}
            </button>
          ))}
        </div>
      )}

      {openCommand !== null && (
        <LegCommandForm
          key={openCommand}
          leg={leg}
          shipmentId={shipmentId}
          commandName={openCommand}
          onDone={() => setOpenCommand(null)}
        />
      )}

      <button
        type="button"
        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        className="mt-2 text-[11px] text-muted-foreground underline hover:no-underline"
      >
        {isHistoryOpen ? "Hide history" : "History"}
      </button>
      {isHistoryOpen && <LegEventHistory legId={leg.id} />}
    </div>
  );
}

/**
 * One command, its inputs, and its refusal.
 *
 * REMOUNTED PER COMMAND via a `key` on the caller, which is what resets the idempotency key and the
 * fields when the seller switches from Book to Report a problem. Reusing one instance would send a
 * `depart` under the key a `book` already spent.
 */
function LegCommandForm({
  leg,
  shipmentId,
  commandName,
  onDone,
}: {
  readonly leg: ShipmentLeg;
  readonly shipmentId: string;
  readonly commandName: ShipmentLegCommandName;
  readonly onDone: () => void;
}) {
  // MINTED ONCE PER ATTEMPT, in state, so a re-render does not mint a second one. It rotates only
  // after a success — a retry of a failed command must reuse the key it already spent.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [carrierReference, setCarrierReference] = useState("");
  const [trackingReference, setTrackingReference] = useState("");
  const [problemDescription, setProblemDescription] = useState("");

  const executeCommand = useExecuteShipmentLegCommandMutation();
  const result = executeCommand.data;

  const isProblemReport = commandName === "report_exception";
  const isSubmitDisabled =
    executeCommand.isPending || (isProblemReport && problemDescription.trim().length === 0);

  function handleSubmit() {
    const command = buildLegCommand(commandName, leg.version, {
      carrierReference,
      trackingReference,
      problemDescription,
    });
    executeCommand.mutate(
      { shipmentId, legId: leg.id, command, idempotencyKey },
      {
        onSuccess: (mutationResult) => {
          if (!mutationResult.success) return;
          setIdempotencyKey(crypto.randomUUID());
          onDone();
        },
      },
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium text-foreground">
        {SHIPMENT_LEG_COMMAND_LABELS[commandName]}
      </p>

      {commandName === "book" && (
        <div className="mt-2 space-y-2">
          {/* FREE TEXT, AND THAT IS WHAT THE BACKEND STORES. No carrier is contracted — nothing on
              this platform calls a carrier API — so these are references a human read off a
              booking confirmation. */}
          <LabelledInput
            label="Carrier reference"
            value={carrierReference}
            onChange={setCarrierReference}
            placeholder="Optional"
          />
          <LabelledInput
            label="Tracking reference"
            value={trackingReference}
            onChange={setTrackingReference}
            placeholder="Optional"
          />
        </div>
      )}

      {isProblemReport && (
        <div className="mt-2">
          <LabelledInput
            label="What went wrong"
            value={problemDescription}
            onChange={setProblemDescription}
            placeholder="Required"
          />
        </div>
      )}

      {result !== undefined && !result.success && (
        <p className="mt-2 text-xs text-foreground">
          {/* THE BACKEND'S OWN CODE AND MESSAGE, VERBATIM. A 409 here means somebody else moved
              this leg while this form was open; the fresh version arrives with the refetch the
              mutation already triggered, so pressing the button again is correct — inventing a
              version was never going to be. */}
          {result.error.code === "409"
            ? `Someone else moved this leg (${result.error.code}). ${result.error.message} It has been re-read — check the state above before trying again.`
            : `${result.error.code}: ${result.error.message}`}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {executeCommand.isPending ? "Working…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Builds exactly the arm the backend named — no more.
 *
 * ⚠️ THE BACKEND ARMS ARE `.strict()`: an extra key is a 422 that kills the whole write rather than
 * a field the server ignores. Empty optional strings are OMITTED rather than sent as `""`, which
 * would fail the `.min(1)` on the other side.
 */
function buildLegCommand(
  commandName: ShipmentLegCommandName,
  expectedVersion: number,
  fields: {
    readonly carrierReference: string;
    readonly trackingReference: string;
    readonly problemDescription: string;
  },
): ShipmentLegCommand {
  switch (commandName) {
    case "book":
      return {
        command: "book",
        expectedVersion,
        ...(fields.carrierReference.trim() === ""
          ? {}
          : { carrierReference: fields.carrierReference.trim() }),
        ...(fields.trackingReference.trim() === ""
          ? {}
          : { trackingReference: fields.trackingReference.trim() }),
      };
    case "depart":
      // `departedAt` omitted means now, which is what a seller pressing this button means.
      return { command: "depart", expectedVersion };
    case "arrive":
      return { command: "arrive", expectedVersion };
    case "complete":
      return { command: "complete", expectedVersion };
    case "report_exception":
      return {
        command: "report_exception",
        expectedVersion,
        description: fields.problemDescription.trim(),
      };
    default: {
      const exhaustiveCheck: never = commandName;
      return exhaustiveCheck;
    }
  }
}

function LegEventHistory({ legId }: { readonly legId: string }) {
  const legEventsQuery = useShipmentLegEventsQuery(legId);

  if (legEventsQuery.isPending) {
    return <p className="mt-2 text-[11px] text-muted-foreground">Loading history…</p>;
  }
  const result = legEventsQuery.data;
  if (legEventsQuery.isError || result === undefined || !result.success) {
    const message =
      result !== undefined && !result.success ? result.error.message : "Couldn't load history.";
    return <p className="mt-2 text-[11px] text-muted-foreground">{message}</p>;
  }
  if (result.data.items.length === 0) {
    return <p className="mt-2 text-[11px] text-muted-foreground">Nothing recorded yet.</p>;
  }

  return (
    <ol className="mt-2 space-y-1">
      {result.data.items.map((event) => (
        <li key={event.id} className="text-[11px] text-muted-foreground">
          {SHIPMENT_LEG_EVENT_KIND_LABELS[event.eventKind]} ·{" "}
          {formatIsoInstantLabel(event.occurredAt)}
          {event.locationIdentifier === null ? "" : ` · ${event.locationIdentifier}`}
          {event.description === null ? "" : ` — ${event.description}`}
        </li>
      ))}
    </ol>
  );
}

/**
 * ⚠️ QATOTO INSURES NOTHING, AND THIS COPY MUST NOT DRIFT INTO SAYING OTHERWISE.
 * `insurance-provider.adapter.ts` in the backend: "A seam only. No insurer is contracted, nothing
 * calls it, and no client copy may claim a shipment is insured."
 *
 * So this is a SIGNPOST to the directory, not a control. Cover is arranged the same way freight is
 * — find a provider, send an RFQ, accept a quote — and the resulting engagement's deliverable is
 * what carries the policy reference. The directory link is already URL-driven, so this is a plain
 * `<Link>` rather than a feature.
 */
function InsuranceSignpost() {
  return (
    <p className="px-1 pt-1 text-[11px] text-muted-foreground">
      <Link href="/store/providers?providerKind=insurance_provider" className="underline">
        Find a cargo insurance provider
      </Link>{" "}
      if you want this shipment covered. Qatoto does not underwrite, quote or hold a premium — you
      contract with the insurer directly, and nothing here means a shipment is insured.
    </p>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
      />
    </label>
  );
}

/** Both ends are nullable on the way back — a leg can be declared before its locality is known. */
function formatLegRoute(leg: ShipmentLeg): string {
  const origin =
    leg.originLocality ??
    (leg.originCountryCode === null ? "—" : countryLabelFromCode(leg.originCountryCode));
  const destination =
    leg.destinationLocality ??
    (leg.destinationCountryCode === null ? "—" : countryLabelFromCode(leg.destinationCountryCode));
  return `${origin} → ${destination}`;
}

/** Actuals win where they exist; an estimate is never rendered in an actual's place. */
function describeLegTiming(leg: ShipmentLeg): string {
  if (leg.actualArrivalAt !== null) {
    return `Arrived ${formatIsoInstantLabel(leg.actualArrivalAt)}`;
  }
  if (leg.actualDepartureAt !== null) {
    return `Departed ${formatIsoInstantLabel(leg.actualDepartureAt)}`;
  }
  if (leg.estimatedArrivalAt !== null) {
    return `Estimated arrival ${formatIsoInstantLabel(leg.estimatedArrivalAt)}`;
  }
  if (leg.estimatedDepartureAt !== null) {
    return `Estimated departure ${formatIsoInstantLabel(leg.estimatedDepartureAt)}`;
  }
  return "No dates recorded";
}
