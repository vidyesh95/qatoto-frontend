// TRANSPORT: props-only — renders an arrival-window projection it was handed. No network.
//
// THE COMPONENT LINES, SHARED BY BOTH SURFACES THAT RENDER THEM.
//
// An arrival window is projected identically for a confirmed ORDER and for a checkout PREPARE —
// same three components, same nullable arms, same reason vocabularies. What differs is only the
// frame around them: an order has a clock and a mode picker, a prepare has neither, because there
// is no order yet to count from or to re-price.
//
// So the lines live here and the frames stay in their own files. Two copies of this would be two
// copies of the tricky part — `daysMin` nullable INSIDE `known`, three `not_applicable` reasons
// that say different things, an exhaustive `never` on each — and they would drift on the first
// backend arm that gets added.
//
// THE MODE PICKER IS OPTIONAL, AND ITS ABSENCE IS NOT A DEGRADED STATE. Re-pricing freight needs
// an order to re-price; at prepare time `mode_not_selected` is reported as the reason it is and
// nothing is offered, because there is nothing yet to apply the choice to.

import {
  ARRIVAL_WINDOW_COMPONENT_LABELS,
  CUSTOMS_DWELL_SCOPE_LABELS,
  FREIGHT_UNKNOWN_REASON_LABELS,
  type CustomsComponent,
  type FreightComponent,
  type ManufacturingComponent,
} from "@/lib/store/arrival-window.schemas";
import { CHARGEABLE_WEIGHT_BASIS_LABELS, type FreightMode } from "@/lib/store/freight.schemas";
import { formatCentsLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

export function ComponentRow({
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

export function ManufacturingLine({ component }: { readonly component: ManufacturingComponent }) {
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
export function FreightLine({
  component,
  selectedMode,
  onSelectMode,
}: {
  readonly component: FreightComponent;
  /** Both absent at checkout: there is no order yet to re-price, so nothing is offered. */
  readonly selectedMode?: FreightMode | null;
  readonly onSelectMode?: ((mode: FreightMode) => void) | undefined;
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
          {onSelectMode !== undefined && component.availableModes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {component.availableModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onSelectMode(mode);
                  }}
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
export function CustomsLine({ component }: { readonly component: CustomsComponent }) {
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

export function formatIsoDayLabel(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  if (Number.isNaN(parsed.getTime())) return isoInstant;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
