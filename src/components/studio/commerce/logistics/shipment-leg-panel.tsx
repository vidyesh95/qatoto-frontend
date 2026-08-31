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
// ⚠️ THIS PARAGRAPH USED TO SAY THE OPPOSITE, and the correction is the point of the panel.
// It read: "A leg exists only if it was declared when the shipment was created, and
// `logisticsEngagementId` is settable only there. No route adds a leg to an existing shipment or
// re-points its engagement." Both routes exist now (A43), so the two dead-ends became controls:
// an ADD A LEG form, and ASSIGN / DETACH on each leg.
//
// ⚠️ **ASSIGNING HANDS OVER CONTROL, AND THE UI HAS TO SAY SO BEFORE IT ACTS.** The moment a leg
// carries an engagement, the five commands above are executable by the PROVIDER organization and
// not by the seller. Detach is how it comes back — and the backend refuses assignment entirely
// once the leg is past `booked`, because re-pointing a leg in transit strands whoever is carrying
// it.

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useOrderFulfillmentQuery } from "@/hooks/store/orders";
import {
  useAddShipmentLegsMutation,
  useAssignShipmentLegMutation,
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
import { FREIGHT_MODES } from "@/lib/store/freight.schemas";
import {
  SHIPMENT_LEG_COMMAND_LABELS,
  SHIPMENT_LEG_COMMANDS_BY_STATE,
  type ShipmentDetail,
  type ShipmentLegInput,
  type ShipmentLegCommand,
  type ShipmentLegCommandName,
} from "@/lib/store/shipments.schemas";

type ShipmentDetailViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; shipment: ShipmentDetail }
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
          ? { status: "empty", shipment: result.data }
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
        // NOT AN ERROR. A shipment with no legs is one whose route has not been planned yet, and
        // planning it is now something this panel can do.
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            No legs declared yet, so there is no route to track.
          </p>
          <AddLegForm
            shipmentId={viewState.shipment.id}
            orderId={viewState.shipment.orderId}
            takenSequences={[]}
          />
        </div>
      );
    case "ready":
      return (
        <div className="mt-3 space-y-2">
          {viewState.shipment.legs.map((leg) => (
            <LegRow
              key={leg.id}
              leg={leg}
              shipmentId={viewState.shipment.id}
              orderId={viewState.shipment.orderId}
            />
          ))}
          <AddLegForm
            shipmentId={viewState.shipment.id}
            orderId={viewState.shipment.orderId}
            takenSequences={viewState.shipment.legs.map((leg) => leg.sequence)}
          />
          <InsuranceSignpost />
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function LegRow({
  leg,
  shipmentId,
  orderId,
}: {
  readonly leg: ShipmentLeg;
  readonly shipmentId: string;
  readonly orderId: string;
}) {
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

      <LegAssignmentControl leg={leg} shipmentId={shipmentId} orderId={orderId} />

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
  const [isCancelConfirmed, setIsCancelConfirmed] = useState(false);

  const executeCommand = useExecuteShipmentLegCommandMutation();
  const result = executeCommand.data;

  const isProblemReport = commandName === "report_exception";
  // THE ONE COMMAND WITH NO INVERSE. `cancelled` is terminal in `LEG_TRANSITIONS` — nothing moves a
  // leg out of it — so this is the only button here that asks twice.
  const isCancel = commandName === "cancel";
  const isSubmitDisabled =
    executeCommand.isPending ||
    (isProblemReport && problemDescription.trim().length === 0) ||
    (isCancel && !isCancelConfirmed);

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

      {isCancel && (
        <label className="mt-2 flex items-start gap-2">
          <input
            type="checkbox"
            checked={isCancelConfirmed}
            onChange={(event) => setIsCancelConfirmed(event.target.checked)}
            className="mt-0.5"
          />
          <span className="text-[11px] leading-4 text-muted-foreground">
            Cancelling is permanent — a cancelled leg cannot be reopened, and the shipment&apos;s
            own state is recomputed from its legs.
          </span>
        </label>
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
    case "cancel":
      return { command: "cancel", expectedVersion };
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
 * Attach or detach the logistics engagement carrying this leg.
 *
 * ⚠️ **ONLY WHILE `planned` OR `booked`.** The backend refuses later, because re-pointing a leg
 * already in transit strands the provider holding the goods. Past that the control is replaced by
 * a sentence saying so, rather than a button that can only 409.
 *
 * ⚠️ **THE WARNING IS NOT DECORATION.** Attaching moves command authority to the provider
 * organization: the seller can no longer book, depart, arrive or complete this leg. Detach is the
 * only way back, and it stops being available at the same boundary.
 *
 * Candidates come from the ORDER's fulfilment read, filtered to the two provider kinds the backend
 * accepts. Offering any other kind would build a picker whose choices are refused with
 * `PROVIDER_KIND_MISMATCH`.
 */
function LegAssignmentControl({
  leg,
  shipmentId,
  orderId,
}: {
  readonly leg: ShipmentLeg;
  readonly shipmentId: string;
  readonly orderId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const fulfillmentQuery = useOrderFulfillmentQuery(orderId);
  const assignLeg = useAssignShipmentLegMutation();

  const isAssignable = leg.state === "planned" || leg.state === "booked";
  if (!isAssignable) {
    return leg.logisticsEngagementId === null ? null : (
      <p className="mt-1 text-[11px] text-muted-foreground">
        This leg is {SHIPMENT_LEG_STATE_LABELS[leg.state].toLowerCase()} — who carries it can no
        longer be changed.
      </p>
    );
  }

  const fulfillment = fulfillmentQuery.data;
  const carriers =
    fulfillment !== undefined && fulfillment.success
      ? fulfillment.data.engagements.filter(
          (engagement) =>
            engagement.providerKind === "freight_forwarder" ||
            engagement.providerKind === "logistics_operator",
        )
      : [];

  function submitAssignment(logisticsEngagementId: string | null) {
    assignLeg.mutate(
      {
        shipmentId,
        orderId,
        legId: leg.id,
        input: { expectedVersion: leg.version, logisticsEngagementId },
        idempotencyKey,
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          setIdempotencyKey(crypto.randomUUID());
          setIsOpen(false);
        },
      },
    );
  }

  const assignResult = assignLeg.data;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[11px] text-muted-foreground underline hover:no-underline"
      >
        {leg.logisticsEngagementId === null ? "Assign a forwarder" : "Change who carries this leg"}
      </button>

      {isOpen && (
        <div className="mt-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[11px] leading-4 text-muted-foreground">
            Assigning hands this leg to the provider: they book, depart, arrive and complete it, and
            you no longer can. Detaching returns it to you. Neither is possible once the leg leaves{" "}
            <span className="font-medium">booked</span>.
          </p>

          {fulfillmentQuery.isPending ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Loading engagements…</p>
          ) : carriers.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              This order has no freight or logistics engagement to assign. One is created when a
              provider&apos;s quote is accepted on the order.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {carriers.map((engagement) => (
                <li key={engagement.id}>
                  <button
                    type="button"
                    disabled={assignLeg.isPending || engagement.id === leg.logisticsEngagementId}
                    onClick={() => submitAssignment(engagement.id)}
                    className="w-full rounded-lg border border-border px-2 py-1 text-left text-[11px] text-foreground disabled:opacity-50"
                  >
                    {engagement.titleSnapshot}
                    {engagement.id === leg.logisticsEngagementId ? " · carrying it now" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {leg.logisticsEngagementId !== null && (
            <button
              type="button"
              disabled={assignLeg.isPending}
              onClick={() => submitAssignment(null)}
              className="mt-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-foreground disabled:opacity-50"
            >
              Detach — I will move this leg myself
            </button>
          )}

          {assignResult !== undefined && !assignResult.success && (
            <p className="mt-2 text-[11px] text-foreground">
              {assignResult.error.code}: {assignResult.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Declare another leg on this shipment.
 *
 * ⚠️ **SEQUENCE MUST NOT COLLIDE, AND THE BACKEND ENFORCES IT WITH A 409.** The default offered
 * here is the next free number so the ordinary case never collides; the field stays editable
 * because a seller inserting a leg mid-route needs a number of their choosing, and the server is
 * the authority either way.
 *
 * ⚠️ **BOTH COUNTRY CODES ARE REQUIRED**, per `ShipmentLegInputSchema`. A leg with no route is not
 * a leg, and the origin is not defaulted from the shipment — a shipment's own lane fields are
 * nullable and frequently null.
 */
function AddLegForm({
  shipmentId,
  orderId,
  takenSequences,
}: {
  readonly shipmentId: string;
  readonly orderId: string;
  readonly takenSequences: readonly number[];
}) {
  const nextFreeSequence = takenSequences.length === 0 ? 0 : Math.max(...takenSequences) + 1;

  const [isOpen, setIsOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [sequenceText, setSequenceText] = useState(String(nextFreeSequence));
  const [mode, setMode] = useState<ShipmentLegInput["mode"]>("sea");
  const [originCountryCode, setOriginCountryCode] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");

  const addLegs = useAddShipmentLegsMutation();
  const result = addLegs.data;

  const sequence = Number.parseInt(sequenceText, 10);
  const isSequenceValid = Number.isInteger(sequence) && sequence >= 0;
  const isSubmitDisabled =
    addLegs.isPending ||
    !isSequenceValid ||
    originCountryCode.trim().length !== 2 ||
    destinationCountryCode.trim().length !== 2;

  function handleSubmit() {
    addLegs.mutate(
      {
        shipmentId,
        orderId,
        input: {
          legs: [
            {
              sequence,
              mode,
              // UPPERCASED HERE because the backend regex is `^[A-Z]{2}$` and a lowercase code is a
              // 422 rather than a case-insensitive match.
              originCountryCode: originCountryCode.trim().toUpperCase(),
              destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
            },
          ],
        },
        idempotencyKey,
      },
      {
        onSuccess: (addResult) => {
          if (!addResult.success) return;
          setIdempotencyKey(crypto.randomUUID());
          setIsOpen(false);
          setOriginCountryCode("");
          setDestinationCountryCode("");
        },
      },
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
      >
        Add a leg
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium text-foreground">Add a leg</p>

      <div className="mt-2 space-y-2">
        <label className="block">
          <span className="block text-[11px] text-muted-foreground">Position in the route</span>
          <input
            type="number"
            min={0}
            value={sequenceText}
            onChange={(event) => setSequenceText(event.target.value)}
            className="mt-0.5 w-24 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </label>

        <label className="block">
          <span className="block text-[11px] text-muted-foreground">Transport mode</span>
          <select
            value={mode}
            onChange={(event) => {
              // NARROWED AGAINST THE TUPLE, NOT ASSERTED. `event.target.value` is a string as far
              // as the DOM is concerned, and `as` here would be this component promising something
              // the browser never guaranteed. The options are built from `FREIGHT_MODES`, so the
              // lookup always succeeds — which is exactly why the assertion was unnecessary.
              const picked = FREIGHT_MODES.find((candidate) => candidate === event.target.value);
              if (picked !== undefined) setMode(picked);
            }}
            className="mt-0.5 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {FREIGHT_MODES.map((freightMode) => (
              <option key={freightMode} value={freightMode}>
                {FREIGHT_TRANSPORT_MODE_LABELS[freightMode]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <LabelledInput
            label="From (country code)"
            value={originCountryCode}
            onChange={setOriginCountryCode}
            placeholder="CN"
          />
          <LabelledInput
            label="To (country code)"
            value={destinationCountryCode}
            onChange={setDestinationCountryCode}
            placeholder="IN"
          />
        </div>
      </div>

      {result !== undefined && !result.success && (
        <p className="mt-2 text-[11px] text-foreground">
          {/* A 409 here names the sequence that is already taken — the backend writes that
              sentence, and repeating it in our own words would let the two drift. */}
          {result.error.code}: {result.error.message}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {addLegs.isPending ? "Adding…" : "Add leg"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
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
