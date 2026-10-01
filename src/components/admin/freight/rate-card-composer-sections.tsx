// TRANSPORT: props-only — presentational subcomponents for the freight rate card composer.

import { formatIsoInstantLabel } from "@/lib/store/format";
import type { AdminFreightRateCard } from "@/lib/store/admin-freight.schemas";
import { FREIGHT_MODES, type FreightMode } from "@/lib/store/freight.schemas";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

function toFreightMode(value: string): FreightMode | null {
  return FREIGHT_MODES.find((freightMode) => freightMode === value) ?? null;
}

export function RateCardOutcomeCard({
  rateCard,
  supersededRateCardId,
  onClose,
}: {
  readonly rateCard: AdminFreightRateCard;
  readonly supersededRateCardId: string | null;
  readonly onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 rounded-xl border border-primary-imprint/30 bg-primary-imprint/5 p-3 text-sm">
        <p className="font-medium text-primary-imprint">Card created.</p>
        <p className="text-xs text-muted-foreground">
          {rateCard.originCountryCode} → {rateCard.destinationCountryCode} ·{" "}
          {FREIGHT_TRANSPORT_MODE_LABELS[rateCard.mode]} · {rateCard.currency} · starts{" "}
          {formatIsoInstantLabel(rateCard.validFrom)}
        </p>
        <p className="text-xs">
          {rateCard.bandsEditable
            ? "Bands are still editable — this card is staged. That stops the moment it comes into force."
            : "Bands are already frozen on this card. It came into force on creation, and there is no way to reopen it — withdraw it and author another if the ladder is wrong."}
        </p>
      </div>

      {supersededRateCardId !== null && (
        <p className="rounded-xl bg-warning-container p-3 text-xs text-warning-container-foreground">
          This create closed the previous card on the lane, id <code>{supersededRateCardId}</code>.
          That is the only time you will be told.
        </p>
      )}

      <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
        Back to the lanes
      </button>
    </div>
  );
}

export function RateCardLaneFields({
  providerOrganizationId,
  setProviderOrganizationId,
  sourceForwarderName,
  setSourceForwarderName,
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
  readonly providerOrganizationId: string;
  readonly setProviderOrganizationId: (value: string) => void;
  readonly sourceForwarderName: string;
  readonly setSourceForwarderName: (value: string) => void;
  readonly originCountryCode: string;
  readonly setOriginCountryCode: (value: string) => void;
  readonly destinationCountryCode: string;
  readonly setDestinationCountryCode: (value: string) => void;
  readonly mode: FreightMode;
  readonly setMode: (mode: FreightMode) => void;
  readonly currency: string;
  readonly setCurrency: (value: string) => void;
  readonly volumetricDivisorCm3PerKg: string;
  readonly setVolumetricDivisorCm3PerKg: (value: string) => void;
  readonly validUntilLocal: string;
  readonly setValidUntilLocal: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Provider organization id</span>
        <input
          value={providerOrganizationId}
          onChange={(event) => setProviderOrganizationId(event.target.value)}
          className={FIELD_CLASS}
          placeholder="commerce organization id"
        />
        <span className="text-xs text-muted-foreground">
          Checked by the server; a wrong id comes back as an error on this field.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Source forwarder name</span>
        <input
          value={sourceForwarderName}
          onChange={(event) => setSourceForwarderName(event.target.value)}
          className={FIELD_CLASS}
          placeholder="Who quoted this lane"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Origin country (2 letters)</span>
        <input
          value={originCountryCode}
          maxLength={2}
          onChange={(event) => setOriginCountryCode(event.target.value.toUpperCase())}
          className={FIELD_CLASS}
          placeholder="CN"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Destination country (2 letters)</span>
        <input
          value={destinationCountryCode}
          maxLength={2}
          onChange={(event) => setDestinationCountryCode(event.target.value.toUpperCase())}
          className={FIELD_CLASS}
          placeholder="KE"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Mode</span>
        <select
          value={mode}
          onChange={(event) => {
            const nextMode = toFreightMode(event.target.value);
            if (nextMode !== null) setMode(nextMode);
          }}
          className={FIELD_CLASS}
        >
          {FREIGHT_MODES.map((freightMode) => (
            <option key={freightMode} value={freightMode}>
              {FREIGHT_TRANSPORT_MODE_LABELS[freightMode]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Currency (3 letters)</span>
        <input
          value={currency}
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          className={FIELD_CLASS}
        />
        <span className="text-xs text-muted-foreground">
          Part of the lane identity — a USD and a EUR card coexist and do not replace each other.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          Volumetric divisor (cm³ per kg, 100–20000)
        </span>
        <input
          inputMode="numeric"
          value={volumetricDivisorCm3PerKg}
          onChange={(event) => setVolumetricDivisorCm3PerKg(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          Valid until (optional, leave blank for open-ended)
        </span>
        <input
          type="datetime-local"
          value={validUntilLocal}
          onChange={(event) => setValidUntilLocal(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>
    </div>
  );
}

export function RateCardSupersedeAlert({
  incumbentCard,
  hasAcknowledgedSupersede,
  onToggleAcknowledge,
}: {
  readonly incumbentCard: AdminFreightRateCard;
  readonly hasAcknowledgedSupersede: boolean;
  readonly onToggleAcknowledge: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-warning/40 bg-warning-container p-3">
      <p className="text-sm font-medium text-warning-container-foreground">
        This lane already has an active card. Creating this one will close it.
      </p>
      <p className="text-xs text-warning-container-foreground">
        {incumbentCard.sourceForwarderName} · in force from{" "}
        {formatIsoInstantLabel(incumbentCard.validFrom)} · id {incumbentCard.id}
      </p>
      <p className="text-xs text-warning-container-foreground">
        Nothing asks for confirmation on the server and there is no way to opt out — the incumbent
        is superseded in the same transaction, even though this card is future-dated. Its{" "}
        <code>validUntil</code> becomes this card&apos;s start.
      </p>
      <label className="flex items-start gap-2 text-xs text-warning-container-foreground">
        <input
          type="checkbox"
          checked={hasAcknowledgedSupersede}
          onChange={(event) => onToggleAcknowledge(event.target.checked)}
          className="mt-0.5"
        />
        <span>I understand this replaces the card above.</span>
      </label>
    </div>
  );
}

export function RateCardStartsField({
  validFromLocal,
  setValidFromLocal,
  isValidFromInFuture,
}: {
  readonly validFromLocal: string;
  readonly setValidFromLocal: (value: string) => void;
  readonly isValidFromInFuture: boolean;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-primary-imprint/30 bg-primary-imprint/5 p-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Starts (must be in the future)</span>
        <input
          type="datetime-local"
          value={validFromLocal}
          onChange={(event) => setValidFromLocal(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Bands can only be edited while a card is <strong>staged</strong> — active and not yet in
        force. A card that starts now is frozen the moment it exists, and there is no way to move
        the start date afterwards: the only remedy is to withdraw it and author another.
      </p>
      {!isValidFromInFuture && validFromLocal.length > 0 && (
        <p className="text-xs font-medium text-destructive">
          That start time is not in the future. This card&apos;s bands would be frozen immediately.
        </p>
      )}
    </div>
  );
}
