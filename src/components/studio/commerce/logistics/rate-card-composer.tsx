// TRANSPORT: client-query — "use client" island. Runs the supersede pre-flight against
// GET /commerce/provider/freight-rate-cards and writes POST /commerce/provider/freight-rate-cards.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/commerce/freight/field-errors";
import WeightBandEditor, {
  newZeroFloorBandDraft,
  type WeightBandDraft,
} from "@/components/commerce/freight/weight-band-editor";
import {
  buildCreateRateCardInput,
  hasZeroWeightFloorDraft,
  type RateCardComposerDraft,
} from "@/components/studio/commerce/logistics/rate-card-draft";
import {
  useCreateProviderFreightRateCardMutation,
  useProviderSupersedeCandidateQuery,
} from "@/hooks/store/provider-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { formatIsoInstantLabel } from "@/lib/store/format";
import { FREIGHT_MODES, type FreightMode } from "@/lib/store/freight.schemas";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import { parseFreightBandGrid, FREIGHT_BAND_PASTE_COLUMNS } from "@/lib/store/freight-band-paste";

/**
 * THE FORWARDER'S OWN RATE CARD COMPOSER (§19.12).
 *
 * The staff twin at `/admin/freight` authors a lane on behalf of ANY provider. This one authors
 * only the caller's own, and the difference is not cosmetic:
 *
 * ⚠️ THERE IS NO PROVIDER FIELD AND NO FORWARDER-NAME FIELD, AND THERE MUST NOT BE. The server
 * derives `providerOrganizationId` and `sourceForwarderName` from the session, and its schema is
 * `.strict()` — a body carrying either is a 422 on the WHOLE submission. A "forwarder name" input
 * would also be the provenance §19.6 puts on the wire beside the price, which would let somebody
 * publish a rate under a carrier's or a rival's name.
 *
 * ⚠️ `validFrom` IS REQUIRED AND MUST BE FUTURE, and this is the trap §19.11 spends a page on: a
 * card in force the instant it exists can never have its bands edited, `validFrom` is in no PATCH
 * schema, and so there is no correcting it — only withdraw and re-author.
 *
 * THE PASTE BOX IS THE REASON THIS SURFACE EXISTS AT ALL. Nobody types twenty weight bands by hand,
 * and a forwarder's tariff is a spreadsheet; an Excel copy is already TSV on the clipboard. It
 * parses in the browser into the SAME draft ladder the manual editor holds, so every server-side
 * refusal applies to a pasted ladder exactly as to a typed one.
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
 * Tomorrow rather than "in an hour": a staged card wants a window its author can still edit bands
 * in after a coffee, and an hour is close enough to now that a slow afternoon freezes it.
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
 * Narrow a `<select>` value to a mode by MEMBERSHIP, not by assertion — an assertion would also
 * silently accept `multimodal` the day somebody points this picker at the five-member tuple, and
 * that lands as a 422 from a `.strict()` body with no clue why.
 */
function toFreightMode(value: string): FreightMode | null {
  return FREIGHT_MODES.find((freightMode) => freightMode === value) ?? null;
}

export default function ProviderRateCardComposer({ onClose }: { onClose: () => void }) {
  const [originCountryCode, setOriginCountryCode] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [mode, setMode] = useState<FreightMode>("sea");
  const [currency, setCurrency] = useState("USD");
  const [volumetricDivisorCm3PerKg, setVolumetricDivisorCm3PerKg] = useState("");
  const [validFromLocal, setValidFromLocal] = useState(defaultValidFromLocalValue);
  const [validUntilLocal, setValidUntilLocal] = useState("");
  const [bandDrafts, setBandDrafts] = useState<WeightBandDraft[]>([newZeroFloorBandDraft()]);
  const [pastedGrid, setPastedGrid] = useState("");
  const [pasteProblems, setPasteProblems] = useState<readonly string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAcknowledgedSupersede, setHasAcknowledgedSupersede] = useState(false);

  const createMutation = useCreateProviderFreightRateCardMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const isLaneComplete =
    originCountryCode.trim().length === 2 &&
    destinationCountryCode.trim().length === 2 &&
    currency.trim().length === 3;

  const supersedeQuery = useProviderSupersedeCandidateQuery(
    {
      originCountryCode: originCountryCode.trim().toUpperCase(),
      destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
      mode,
      currency: currency.trim().toUpperCase(),
    },
    isLaneComplete,
  );
  const incumbentCard = supersedeQuery.data ?? null;

  const hasFloorBand = hasZeroWeightFloorDraft(bandDrafts);
  const isSubmitBlocked = !hasFloorBand || (incumbentCard !== null && !hasAcknowledgedSupersede);

  /**
   * Pasting REPLACES the ladder rather than appending to it, and says so on the button. A paste
   * that merged would leave the author reconciling their sheet against whatever was already there,
   * which is the reconciliation this box exists to remove.
   */
  function handleApplyPaste(): void {
    setLocalError(null);
    const parsed = parseFreightBandGrid(pastedGrid);
    if (parsed.problems.length > 0) {
      setPasteProblems(parsed.problems.map((problem) => problem.message));
      return;
    }
    setPasteProblems([]);
    setBandDrafts([...parsed.bands]);
    setPastedGrid("");
  }

  function handleSubmit(): void {
    setLocalError(null);

    // `now` read HERE rather than at mount: the clock moved while this form was open, and a
    // `validFrom` that was future when it was typed may not be by the time it is sent.
    const built = buildCreateRateCardInput(
      {
        originCountryCode,
        destinationCountryCode,
        mode,
        currency,
        validFromLocal,
        validUntilLocal,
        volumetricDivisorCm3PerKg,
        bandDrafts,
      } satisfies RateCardComposerDraft,
      new Date(),
    );
    if (!built.ok) {
      setLocalError(built.error);
      return;
    }

    createMutation.mutate(
      { input: built.input, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => {
          // Rotate ONLY on a confirmed success: a retry of a failed attempt must carry the key of
          // the attempt it is retrying, or one click publishes two tariffs.
          if (!result.success) return;
          resetIdempotencyKey();
        },
      },
    );
  }

  const createResult = createMutation.data;

  if (createResult?.success) {
    const card = createResult.data.rateCard;
    return (
      <section className={CARD_CLASS}>
        <h3 className="text-sm font-semibold text-foreground">Lane published</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {card.originCountryCode} → {card.destinationCountryCode} ·{" "}
          {FREIGHT_TRANSPORT_MODE_LABELS[card.mode]} · {card.currency} · starts{" "}
          {formatIsoInstantLabel(card.validFrom)}
        </p>
        {/* The provenance the server derived, shown back so the author can see whose name it carries. */}
        <p className="mt-1 text-xs text-muted-foreground">
          Published as <span className="font-medium">{card.sourceForwarderName}</span>, taken from
          your organization.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {card.bandsEditable
            ? "Staged — its bands can still be corrected until it starts applying."
            : "Already in force. Its bands are frozen; publish a new card for this lane to change them."}
        </p>
        {createResult.data.supersededRateCardId !== null && (
          /*
           * The ONLY report this ever gets. No later read announces it, so a composer that dropped
           * this line would lose the fact that a live price of theirs stopped applying.
           */
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            This replaced your previous card on the lane ({createResult.data.supersededRateCardId}).
            It has been closed and stops pricing when this one starts.
          </p>
        )}
        <button type="button" onClick={onClose} className={`${QUIET_BUTTON_CLASS} mt-4`}>
          Back to your lanes
        </button>
      </section>
    );
  }

  return (
    <section className={CARD_CLASS}>
      <h3 className="text-sm font-semibold text-foreground">Publish a lane</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The price is yours and is published under your organization&apos;s name. Qatoto charges no
        freight and books nothing — this prices the lane on the buyer&apos;s delivery sheet.
      </p>

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
          {/*
           * Guidance, never a default. The divisor varies by forwarder as well as by mode, so a
           * default would be the platform choosing a tariff convention on their behalf — and the
           * 100–20000 bound catches a decimal slip and nothing subtler: a road divisor on an air
           * card sits inside it and underbills every bulky consignment, quietly.
           */}
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

      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
        <label className="block text-xs">
          <span className="font-medium text-foreground">
            Starts applying (must be in the future)
          </span>
          <input
            type="datetime-local"
            value={validFromLocal}
            onChange={(event) => setValidFromLocal(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Until it starts, you can still correct the bands. Once it is in force they are frozen —
          there is no editing a live tariff, only publishing a new card for the lane.
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-medium text-foreground">Paste your rate sheet</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Copy the band rows out of your spreadsheet and paste them here. Six columns, in this
          order: {FREIGHT_BAND_PASTE_COLUMNS.join(" · ")}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The price is <span className="font-medium">per kilogram of chargeable weight</span>, not
          per consignment. A flat lane price goes in the minimum charge column.
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
          onClick={handleApplyPaste}
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

      <div className="mt-4">
        <WeightBandEditor
          bandDrafts={bandDrafts}
          onChange={setBandDrafts}
          currency={currency.trim().toUpperCase() || "USD"}
        />
      </div>

      {!hasFloorBand && (
        /*
         * §19.11 step 4, as a BLOCK rather than the editor's warning. Without a 0 kg band every
         * lighter consignment rates `below_smallest_break` and the lane publishes no option at all
         * — which reaches the buyer as an empty delivery sheet, indistinguishable from a lane
         * nobody ever priced.
         */
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Add a band starting at 0 kg before publishing. Without one, every consignment lighter than
          your smallest band prices nothing and buyers see an empty delivery sheet.
        </p>
      )}

      {incumbentCard !== null && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
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
              onChange={(event) => setHasAcknowledgedSupersede(event.target.checked)}
            />
            <span>I understand this replaces the card above.</span>
          </label>
        </div>
      )}

      {localError !== null && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {localError}
        </p>
      )}

      {createResult !== undefined && !createResult.success && (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">{createResult.error.message}</p>
          {/* A `.strict()` rejection lands under `form`; renderFieldErrors is what names the key. */}
          {renderFieldErrors(createResult.error.fieldErrors)}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createMutation.isPending || isSubmitBlocked}
          className={PRIMARY_BUTTON_CLASS}
        >
          {createMutation.isPending ? "Publishing…" : "Publish this lane"}
        </button>
        <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
          Cancel
        </button>
      </div>
    </section>
  );
}
