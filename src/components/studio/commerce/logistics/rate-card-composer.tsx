// TRANSPORT: client-query — "use client" island. Runs the supersede pre-flight against
// GET /commerce/provider/freight-rate-cards and writes POST /commerce/provider/freight-rate-cards.
"use client";

import { renderFieldErrors } from "@/components/commerce/freight/field-errors";
import WeightBandEditor from "@/components/commerce/freight/weight-band-editor";
import { useProviderRateCardComposerState } from "@/hooks/store/use-provider-rate-card-composer-state";
import {
  CARD_CLASS,
  FIELD_CLASS,
  IncumbentCardNotice,
  LaneIdentityFormFields,
  PRIMARY_BUTTON_CLASS,
  ProviderLanePublishedNotice,
  QUIET_BUTTON_CLASS,
  RateSheetPasteArea,
} from "./rate-card-composer-sections";

export default function ProviderRateCardComposer({ onClose }: { readonly onClose: () => void }) {
  const {
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
    validFromLocal,
    setValidFromLocal,
    validUntilLocal,
    setValidUntilLocal,
    bandDrafts,
    setBandDrafts,
    pastedGrid,
    setPastedGrid,
    pasteProblems,
    localError,
    hasAcknowledgedSupersede,
    setHasAcknowledgedSupersede,
    createMutation,
    incumbentCard,
    hasFloorBand,
    isSubmitBlocked,
    handleApplyPaste,
    handleSubmit,
  } = useProviderRateCardComposerState();

  const createResult = createMutation.data;

  if (createResult?.success) {
    return (
      <ProviderLanePublishedNotice
        card={createResult.data.rateCard}
        supersededRateCardId={createResult.data.supersededRateCardId}
        onClose={onClose}
      />
    );
  }

  return (
    <section className={CARD_CLASS}>
      <h3 className="text-sm font-semibold text-foreground">Publish a lane</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The price is yours and is published under your organization&apos;s name. Qatoto charges no
        freight and books nothing — this prices the lane on the buyer&apos;s delivery sheet.
      </p>

      <LaneIdentityFormFields
        originCountryCode={originCountryCode}
        setOriginCountryCode={setOriginCountryCode}
        destinationCountryCode={destinationCountryCode}
        setDestinationCountryCode={setDestinationCountryCode}
        mode={mode}
        setMode={setMode}
        currency={currency}
        setCurrency={setCurrency}
        volumetricDivisorCm3PerKg={volumetricDivisorCm3PerKg}
        setVolumetricDivisorCm3PerKg={setVolumetricDivisorCm3PerKg}
        validUntilLocal={validUntilLocal}
        setValidUntilLocal={setValidUntilLocal}
      />

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

      <RateSheetPasteArea
        pastedGrid={pastedGrid}
        setPastedGrid={setPastedGrid}
        onApplyPaste={handleApplyPaste}
        pasteProblems={pasteProblems}
      />

      <div className="mt-4">
        <WeightBandEditor
          bandDrafts={bandDrafts}
          onChange={setBandDrafts}
          currency={currency.trim().toUpperCase() || "USD"}
        />
      </div>

      {!hasFloorBand && (
        <p className="mt-3 rounded-lg bg-warning-container px-3 py-2 text-xs text-warning-container-foreground">
          Add a band starting at 0 kg before publishing. Without one, every consignment lighter than
          your smallest band prices nothing and buyers see an empty delivery sheet.
        </p>
      )}

      {incumbentCard !== null && (
        <IncumbentCardNotice
          incumbentCard={incumbentCard}
          hasAcknowledgedSupersede={hasAcknowledgedSupersede}
          onAcknowledgeChange={setHasAcknowledgedSupersede}
        />
      )}

      {localError !== null && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {localError}
        </p>
      )}

      {createResult !== undefined && !createResult.success && (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">{createResult.error.message}</p>
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
