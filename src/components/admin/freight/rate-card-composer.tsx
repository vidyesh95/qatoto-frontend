// TRANSPORT: client-query — "use client" island. Runs the supersede pre-flight against
// GET /commerce/admin/freight-rate-cards and writes POST /commerce/admin/freight-rate-cards.
"use client";

import { useState } from "react";

import WeightBandEditor, {
  collectBands,
  newZeroFloorBandDraft,
  type WeightBandDraft,
} from "@/components/admin/freight/weight-band-editor";
import {
  useCreateFreightRateCardMutation,
  useSupersedeCandidateQuery,
} from "@/hooks/store/admin-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { FREIGHT_MODES, type FreightMode } from "@/lib/store/freight.schemas";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import { formatIsoInstantLabel } from "@/lib/store/format";
import type { AdminFreightRateCard } from "@/lib/store/admin-freight.schemas";

/**
 * Author a lane rate card.
 *
 * **TWO IRREVERSIBLE MISTAKES ARE POSSIBLE HERE AND THE FORM EXISTS TO PREVENT BOTH.**
 *
 * 1. `validFrom` IS OPTIONAL ON THE WIRE AND DEFAULTS TO NOW. A card that is already in force can
 *    never have its bands edited — the 409 is permanent, and `validFrom` is in no PATCH schema, so
 *    the only remedy is withdrawing the card and authoring another. So the field is REQUIRED here
 *    and must be in the future; submitting is refused otherwise, with the reason on screen. The
 *    server still decides, as always. This is a form that will not let someone lose an afternoon
 *    to a blank optional field.
 *
 * 2. CREATING SUPERSEDES SILENTLY. An active card on the same
 *    `(provider, origin, destination, mode, currency)` is closed by this create, in the same
 *    transaction, even when the new card is future-dated. Nothing asks first and nothing can opt
 *    out — there is no `supersedesRateCardId` in the product. So the composer looks the incumbent
 *    up BEFORE submitting and makes the operator acknowledge it by name.
 *
 * The mode picker reads `FREIGHT_MODES` — four members. The five-member `FREIGHT_TRANSPORT_MODES`
 * includes `multimodal`, which describes a journey and which no single card can carry.
 */

const CARD_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-50";

/**
 * A default `validFrom` that is unambiguously in the future.
 *
 * Tomorrow rather than "in an hour": a staged card wants a window an operator can still edit
 * bands in after a coffee, and an hour is close enough to now that a slow afternoon freezes it.
 */
function padTwoDigits(part: number): string {
  return String(part).padStart(2, "0");
}

function defaultValidFromLocalValue(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // `datetime-local` wants `YYYY-MM-DDTHH:mm` in LOCAL time, which is what `toISOString` is not.
  return `${tomorrow.getFullYear()}-${padTwoDigits(tomorrow.getMonth() + 1)}-${padTwoDigits(tomorrow.getDate())}T${padTwoDigits(tomorrow.getHours())}:${padTwoDigits(tomorrow.getMinutes())}`;
}

/**
 * Narrow a `<select>` value to a mode by MEMBERSHIP, not by assertion.
 *
 * The options are rendered from `FREIGHT_MODES` so the value is always one of them in practice —
 * but an assertion here would also silently accept `multimodal` the day someone points this picker
 * at the five-member tuple, and that lands as a 422 from a `.strict()` body with no clue why.
 */
function toFreightMode(value: string): FreightMode | null {
  return FREIGHT_MODES.find((freightMode) => freightMode === value) ?? null;
}

export default function RateCardComposer({ onClose }: { onClose: () => void }) {
  const [providerOrganizationId, setProviderOrganizationId] = useState("");
  const [originCountryCode, setOriginCountryCode] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [mode, setMode] = useState<FreightMode>("sea");
  const [currency, setCurrency] = useState("USD");
  const [sourceForwarderName, setSourceForwarderName] = useState("");
  const [volumetricDivisorCm3PerKg, setVolumetricDivisorCm3PerKg] = useState("6000");
  const [validFromLocal, setValidFromLocal] = useState(defaultValidFromLocalValue);
  const [validUntilLocal, setValidUntilLocal] = useState("");
  const [bandDrafts, setBandDrafts] = useState<WeightBandDraft[]>([newZeroFloorBandDraft()]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAcknowledgedSupersede, setHasAcknowledgedSupersede] = useState(false);
  const [mountedAtMs] = useState(() => Date.now());

  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const createMutation = useCreateFreightRateCardMutation();

  const isLaneComplete =
    providerOrganizationId.trim().length > 0 &&
    originCountryCode.trim().length === 2 &&
    destinationCountryCode.trim().length === 2 &&
    currency.trim().length === 3;

  const supersedeQuery = useSupersedeCandidateQuery(
    {
      providerOrganizationId: providerOrganizationId.trim(),
      originCountryCode: originCountryCode.trim().toUpperCase(),
      destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
      mode,
      currency: currency.trim().toUpperCase(),
    },
    isLaneComplete,
  );
  const incumbentCard = supersedeQuery.data ?? null;

  const validFromInstant = validFromLocal.length > 0 ? new Date(validFromLocal) : null;
  const isValidFromInFuture =
    validFromInstant !== null &&
    !Number.isNaN(validFromInstant.getTime()) &&
    validFromInstant.getTime() > mountedAtMs;

  const createResult = createMutation.data;
  const isSubmitBlocked =
    !isValidFromInFuture || (incumbentCard !== null && !hasAcknowledgedSupersede);

  function handleSubmit() {
    setLocalError(null);

    const isValidFromStillInFuture =
      validFromInstant !== null &&
      !Number.isNaN(validFromInstant.getTime()) &&
      validFromInstant.getTime() > Date.now();
    if (!isValidFromStillInFuture) {
      setLocalError(
        "Start the card in the future. A card that is already in force can never have its bands edited, and that cannot be undone.",
      );
      return;
    }

    const collected = collectBands(bandDrafts);
    if (!collected.ok) {
      setLocalError(collected.error);
      return;
    }

    const divisor = Number(volumetricDivisorCm3PerKg.trim());
    if (!Number.isSafeInteger(divisor) || divisor < 100 || divisor > 20000) {
      setLocalError("The volumetric divisor must be a whole number between 100 and 20000.");
      return;
    }

    createMutation.mutate(
      {
        input: {
          providerOrganizationId: providerOrganizationId.trim(),
          originCountryCode: originCountryCode.trim().toUpperCase(),
          destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
          mode,
          currency: currency.trim().toUpperCase(),
          validFrom: new Date(validFromLocal).toISOString(),
          ...(validUntilLocal.length > 0
            ? { validUntil: new Date(validUntilLocal).toISOString() }
            : {}),
          sourceForwarderName: sourceForwarderName.trim(),
          volumetricDivisorCm3PerKg: divisor,
          breaks: collected.bands,
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          // ROTATED ONLY ON A CONFIRMED SUCCESS. A retry after a network failure must carry the key
          // of the attempt it is retrying, or one operator click authors two rate cards — and the
          // second one supersedes the first.
          if (!result.success) return;
          resetIdempotencyKey();
        },
      },
    );
  }

  return (
    <section className={`${CARD_CLASS} space-y-4`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">New lane rate card</h3>
        <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
          Close
        </button>
      </div>

      {createResult !== undefined && createResult.success ? (
        renderCreateOutcome(createResult.data.rateCard, createResult.data.supersededRateCardId)
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Provider organization id</span>
              <input
                value={providerOrganizationId}
                onChange={(event) => setProviderOrganizationId(event.target.value)}
                className={FIELD_CLASS}
                placeholder="commerce organization id"
              />
              {/*
                A TEXT FIELD RATHER THAN A PICKER, on purpose. The only provider list this frontend
                can read is the PUBLIC directory, which is eligibility-filtered — a forwarder that
                may legitimately own a rate card can be absent from it, so a dropdown built on it
                would silently make valid ids unselectable. The backend validates this id and
                answers a 422 naming this exact field.
              */}
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
                Part of the lane identity — a USD and a EUR card coexist and do not replace each
                other.
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

          {/* THE FIELD THIS WHOLE FORM IS SHAPED AROUND. Given its own block, above the bands it
              controls the editability of. */}
          <div className="space-y-1 rounded-xl border border-[#00696E]/30 bg-[#00696E]/5 p-3">
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
              Bands can only be edited while a card is <strong>staged</strong> — active and not yet
              in force. A card that starts now is frozen the moment it exists, and there is no way
              to move the start date afterwards: the only remedy is to withdraw it and author
              another.
            </p>
            {!isValidFromInFuture && validFromLocal.length > 0 && (
              <p className="text-xs font-medium text-red-700">
                That start time is not in the future. This card&apos;s bands would be frozen
                immediately.
              </p>
            )}
          </div>

          <WeightBandEditor
            bandDrafts={bandDrafts}
            onChange={setBandDrafts}
            currency={currency.trim().toUpperCase() || "USD"}
          />

          {/* The pre-flight. Runs as soon as the lane five-tuple is complete, so the warning is on
              screen before the operator reaches the submit button rather than after. */}
          {incumbentCard !== null && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                This lane already has an active card. Creating this one will close it.
              </p>
              <p className="text-xs text-amber-900">
                {incumbentCard.sourceForwarderName} · in force from{" "}
                {formatIsoInstantLabel(incumbentCard.validFrom)} · id {incumbentCard.id}
              </p>
              <p className="text-xs text-amber-900">
                Nothing asks for confirmation on the server and there is no way to opt out — the
                incumbent is superseded in the same transaction, even though this card is
                future-dated. Its <code>validUntil</code> becomes this card&apos;s start.
              </p>
              <label className="flex items-start gap-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedSupersede}
                  onChange={(event) => setHasAcknowledgedSupersede(event.target.checked)}
                  className="mt-0.5"
                />
                <span>I understand this replaces the card above.</span>
              </label>
            </div>
          )}

          {localError !== null && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{localError}</p>
          )}

          {createResult !== undefined && !createResult.success && (
            <div className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">{createResult.error.message}</p>
              {renderFieldErrors(createResult.error.fieldErrors)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending || isSubmitBlocked}
              className={PRIMARY_BUTTON_CLASS}
            >
              {createMutation.isPending ? "Creating…" : "Create the card"}
            </button>
            <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );

  function renderCreateOutcome(card: AdminFreightRateCard, supersededRateCardId: string | null) {
    return (
      <div className="space-y-3">
        <div className="space-y-1 rounded-xl border border-[#00696E]/30 bg-[#00696E]/5 p-3 text-sm">
          <p className="font-medium text-[#00696E]">Card created.</p>
          <p className="text-xs text-muted-foreground">
            {card.originCountryCode} → {card.destinationCountryCode} ·{" "}
            {FREIGHT_TRANSPORT_MODE_LABELS[card.mode]} · {card.currency} · starts{" "}
            {formatIsoInstantLabel(card.validFrom)}
          </p>
          <p className="text-xs">
            {card.bandsEditable
              ? "Bands are still editable — this card is staged. That stops the moment it comes into force."
              : "Bands are already frozen on this card. It came into force on creation, and there is no way to reopen it — withdraw it and author another if the ladder is wrong."}
          </p>
        </div>

        {/* Reported EXACTLY ONCE, here. No later read announces it, so it is surfaced plainly
            rather than folded into a toast that scrolls away. */}
        {supersededRateCardId !== null && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            This create closed the previous card on the lane, id <code>{supersededRateCardId}</code>
            . That is the only time you will be told.
          </p>
        )}

        <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
          Back to the lanes
        </button>
      </div>
    );
  }
}

/**
 * Field errors, including the reserved `form` key.
 *
 * A `.strict()` rejection — an unknown or misspelled key — lands under `errors.form` rather than
 * under any field name, so a renderer that only walks named fields would show an operator a bare
 * "422" with the actual reason invisible.
 */
export function renderFieldErrors(fieldErrors: Record<string, string[]> | undefined) {
  if (fieldErrors === undefined) return null;
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return null;

  return (
    <ul className="space-y-0.5 text-xs">
      {entries.map(([fieldName, messages]) => (
        <li key={fieldName}>
          <span className="font-medium">{fieldName === "form" ? "Request" : fieldName}:</span>{" "}
          {messages.join(" ")}
        </li>
      ))}
    </ul>
  );
}
