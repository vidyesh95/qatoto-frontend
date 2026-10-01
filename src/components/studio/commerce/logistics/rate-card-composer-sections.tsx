"use client";

import { FREIGHT_MODES, type FreightMode } from "@/lib/store/freight.schemas";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import { formatIsoInstantLabel } from "@/lib/store/format";
import { FREIGHT_BAND_PASTE_COLUMNS } from "@/lib/store/freight-band-paste";
import type { AdminFreightRateCard } from "@/lib/store/admin-freight.schemas";

export const CARD_CLASS = "rounded-2xl border border-border p-4";
export const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
export const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-50";

function toFreightMode(value: string): FreightMode | null {
  return FREIGHT_MODES.find((freightMode) => freightMode === value) ?? null;
}

export function ProviderLanePublishedNotice({
  card,
  supersededRateCardId,
  onClose,
}: {
  readonly card: AdminFreightRateCard;
  readonly supersededRateCardId: string | null;
  readonly onClose: () => void;
}) {
  return (
    <section className={CARD_CLASS}>
      <h3 className="text-sm font-semibold text-foreground">Lane published</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {card.originCountryCode} → {card.destinationCountryCode} ·{" "}
        {FREIGHT_TRANSPORT_MODE_LABELS[card.mode]} · {card.currency} · starts{" "}
        {formatIsoInstantLabel(card.validFrom)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Published as <span className="font-medium">{card.sourceForwarderName}</span>, taken from
        your organization.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {card.bandsEditable
          ? "Staged — its bands can still be corrected until it starts applying."
          : "Already in force. Its bands are frozen; publish a new card for this lane to change them."}
      </p>
      {supersededRateCardId !== null && (
        <p className="mt-3 rounded-lg bg-warning-container px-3 py-2 text-xs text-warning-container-foreground">
          This replaced your previous card on the lane ({supersededRateCardId}). It has been closed
          and stops pricing when this one starts.
        </p>
      )}
      <button type="button" onClick={onClose} className={`${QUIET_BUTTON_CLASS} mt-4`}>
        Back to your lanes
      </button>
    </section>
  );
}

export function LaneIdentityFormFields({
  originCountryCode,
  setOriginCountryCode,
  destinationCountryCode,
  setDestinationCountryCode,
  mode,
  setMode,
  currency,
  setCurrency,
  volumetricDivisorCm3PerKg,
  setVolumetricDivisorCm3PerKg,
  validUntilLocal,
  setValidUntilLocal,
}: {
  readonly originCountryCode: string;
  readonly setOriginCountryCode: (value: string) => void;
  readonly destinationCountryCode: string;
  readonly setDestinationCountryCode: (value: string) => void;
  readonly mode: FreightMode;
  readonly setMode: (value: FreightMode) => void;
  readonly currency: string;
  readonly setCurrency: (value: string) => void;
  readonly volumetricDivisorCm3PerKg: string;
  readonly setVolumetricDivisorCm3PerKg: (value: string) => void;
  readonly validUntilLocal: string;
  readonly setValidUntilLocal: (value: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-xs">
        <span className="text-muted-foreground">Origin country (2 letters)</span>
        <input
          value={originCountryCode}
          onChange={(event) => setOriginCountryCode(event.target.value.toUpperCase())}
          maxLength={2}
          placeholder="IN"
          className={`${FIELD_CLASS} mt-1`}
        />
      </label>

      <label className="block text-xs">
        <span className="text-muted-foreground">Destination country (2 letters)</span>
        <input
          value={destinationCountryCode}
          onChange={(event) => setDestinationCountryCode(event.target.value.toUpperCase())}
          maxLength={2}
          placeholder="DE"
          className={`${FIELD_CLASS} mt-1`}
        />
      </label>

      <label className="block text-xs">
        <span className="text-muted-foreground">Mode</span>
        <select
          value={mode}
          onChange={(event) => {
            const nextMode = toFreightMode(event.target.value);
            if (nextMode) setMode(nextMode);
          }}
          className={`${FIELD_CLASS} mt-1`}
        >
          {FREIGHT_MODES.map((freightMode) => (
            <option key={freightMode} value={freightMode}>
              {FREIGHT_TRANSPORT_MODE_LABELS[freightMode]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs">
        <span className="text-muted-foreground">Currency (3 letters)</span>
        <input
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          maxLength={3}
          placeholder="USD"
          className={`${FIELD_CLASS} mt-1`}
        />
        <span className="mt-1 block text-muted-foreground">
          Part of the lane&apos;s identity — a USD card and a EUR card can both be live.
        </span>
      </label>

      <label className="block text-xs">
        <span className="text-muted-foreground">Volumetric divisor (cm³ per kg)</span>
        <input
          value={volumetricDivisorCm3PerKg}
          onChange={(event) => setVolumetricDivisorCm3PerKg(event.target.value)}
          inputMode="numeric"
          placeholder="1000"
          className={`${FIELD_CLASS} mt-1`}
        />
        <span className="mt-1 block text-muted-foreground">
          Your own convention: ocean LCL 1000, road around 3000, air 5000 or 6000.
        </span>
      </label>

      <label className="block text-xs">
        <span className="text-muted-foreground">Stops applying (optional)</span>
        <input
          type="datetime-local"
          value={validUntilLocal}
          onChange={(event) => setValidUntilLocal(event.target.value)}
          className={`${FIELD_CLASS} mt-1`}
        />
        <span className="mt-1 block text-muted-foreground">
          Leave blank for a tariff with no announced end.
        </span>
      </label>
    </div>
  );
}

export function RateSheetPasteArea({
  pastedGrid,
  setPastedGrid,
  onApplyPaste,
  pasteProblems,
}: {
  readonly pastedGrid: string;
  readonly setPastedGrid: (value: string) => void;
  readonly onApplyPaste: () => void;
  readonly pasteProblems: readonly string[];
}) {
  return (
    <div className="mt-4">
      <h4 className="text-xs font-medium text-foreground">Paste your rate sheet</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Copy the band rows out of your spreadsheet and paste them here. Six columns, in this order:{" "}
        {FREIGHT_BAND_PASTE_COLUMNS.join(" · ")}.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        The price is <span className="font-medium">per kilogram of chargeable weight</span>, not per
        consignment. A flat lane price goes in the minimum charge column.
      </p>
      <textarea
        value={pastedGrid}
        onChange={(event) => setPastedGrid(event.target.value)}
        rows={4}
        placeholder={"0\t0\t4.50\t150.00\t24\t34"}
        aria-label="Paste rate sheet rows"
        className={`${FIELD_CLASS} mt-2 font-mono`}
      />
      <button
        type="button"
        onClick={onApplyPaste}
        disabled={pastedGrid.trim().length === 0}
        className={`${QUIET_BUTTON_CLASS} mt-2`}
      >
        Replace the ladder with this
      </button>
      {pasteProblems.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {pasteProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IncumbentCardNotice({
  incumbentCard,
  hasAcknowledgedSupersede,
  onAcknowledgeChange,
}: {
  readonly incumbentCard: {
    readonly sourceForwarderName: string;
    readonly validFrom: string;
    readonly breaks: readonly unknown[];
  };
  readonly hasAcknowledgedSupersede: boolean;
  readonly onAcknowledgeChange: (acknowledged: boolean) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-warning/40 bg-warning-container p-3 text-xs text-warning-container-foreground">
      <p className="font-medium">You already price this lane.</p>
      <p className="mt-1">
        {incumbentCard.sourceForwarderName} · starts{" "}
        {formatIsoInstantLabel(incumbentCard.validFrom)} · {incumbentCard.breaks.length} band(s)
      </p>
      <p className="mt-1">
        Publishing closes that card when this one starts. It is reported once, in the reply.
      </p>
      <label className="mt-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={hasAcknowledgedSupersede}
          onChange={(event) => onAcknowledgeChange(event.target.checked)}
        />
        <span>I understand this replaces the card above.</span>
      </label>
    </div>
  );
}
