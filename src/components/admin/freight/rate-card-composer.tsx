// TRANSPORT: client-query — "use client" island. Runs the supersede pre-flight against
// GET /commerce/admin/freight-rate-cards and writes POST /commerce/admin/freight-rate-cards.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/commerce/freight/field-errors";
import WeightBandEditor from "@/components/commerce/freight/weight-band-editor";
import {
  RateCardLaneFields,
  RateCardOutcomeCard,
  RateCardStartsField,
  RateCardSupersedeAlert,
} from "./rate-card-composer-sections";
import {
  collectBands,
  newZeroFloorBandDraft,
  type WeightBandDraft,
} from "@/lib/store/freight-band-draft";
import {
  useCreateFreightRateCardMutation,
  useSupersedeCandidateQuery,
} from "@/hooks/store/admin-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { FreightMode } from "@/lib/store/freight.schemas";

const CARD_CLASS = "rounded-2xl border border-outline-variant/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

function defaultValidFromLocalValue(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setMinutes(0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

type RateCardValidationResult =
  | {
      ok: true;
      validFromInstant: Date;
      validUntilInstant: Date | null;
      parsedDivisor: number;
      collectedBands: Extract<ReturnType<typeof collectBands>, { ok: true }>["bands"];
    }
  | { ok: false; error: string };

function validateRateCardInput({
  validFromLocal,
  validUntilLocal,
  bandDrafts,
  volumetricDivisorCm3PerKg,
}: {
  validFromLocal: string;
  validUntilLocal: string;
  bandDrafts: WeightBandDraft[];
  volumetricDivisorCm3PerKg: string;
}): RateCardValidationResult {
  const validFromInstant = validFromLocal.length > 0 ? new Date(validFromLocal) : null;
  const isValidFromStillInFuture =
    validFromInstant !== null &&
    !Number.isNaN(validFromInstant.getTime()) &&
    validFromInstant.getTime() > Date.now();
  if (!isValidFromStillInFuture || validFromInstant === null) {
    return {
      ok: false,
      error:
        "Start the card in the future. A card that is already in force can never have its bands edited, and that cannot be undone.",
    };
  }

  const collected = collectBands(bandDrafts);
  if (!collected.ok) {
    return { ok: false, error: collected.error };
  }

  const parsedDivisor = Number(volumetricDivisorCm3PerKg.trim());
  if (
    !Number.isFinite(parsedDivisor) ||
    !Number.isInteger(parsedDivisor) ||
    parsedDivisor < 100 ||
    parsedDivisor > 20000
  ) {
    return {
      ok: false,
      error: "Volumetric divisor must be an integer between 100 and 20000.",
    };
  }

  const validUntilInstant = validUntilLocal.length > 0 ? new Date(validUntilLocal) : null;
  if (validUntilInstant !== null) {
    if (Number.isNaN(validUntilInstant.getTime())) {
      return { ok: false, error: "Valid-until date is not valid." };
    }
    if (validUntilInstant.getTime() <= validFromInstant.getTime()) {
      return { ok: false, error: "Valid-until must be after valid-from." };
    }
  }

  return {
    ok: true,
    validFromInstant,
    validUntilInstant,
    parsedDivisor,
    collectedBands: collected.bands,
  };
}

function RateCardComposerErrorMessages({
  localError,
  createResult,
}: {
  localError: string | null;
  createResult: ReturnType<typeof useCreateFreightRateCardMutation>["data"];
}) {
  return (
    <>
      {localError !== null && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{localError}</p>
      )}

      {createResult !== undefined && !createResult.success && (
        <div className="space-y-1 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">{createResult.error.message}</p>
          {renderFieldErrors(createResult.error.fieldErrors)}
        </div>
      )}
    </>
  );
}

function RateCardComposerActionButtons({
  isPending,
  isSubmitBlocked,
  onSubmit,
  onClose,
}: {
  isPending: boolean;
  isSubmitBlocked: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending || isSubmitBlocked}
        className={PRIMARY_BUTTON_CLASS}
      >
        {isPending ? "Creating…" : "Create the card"}
      </button>
      <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
        Cancel
      </button>
    </div>
  );
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

    const validation = validateRateCardInput({
      validFromLocal,
      validUntilLocal,
      bandDrafts,
      volumetricDivisorCm3PerKg,
    });
    if (!validation.ok) {
      setLocalError(validation.error);
      return;
    }

    createMutation.mutate(
      {
        input: {
          providerOrganizationId: providerOrganizationId.trim(),
          sourceForwarderName: sourceForwarderName.trim(),
          originCountryCode: originCountryCode.trim().toUpperCase(),
          destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
          mode,
          currency: currency.trim().toUpperCase(),
          volumetricDivisorCm3PerKg: validation.parsedDivisor,
          validFrom: validation.validFromInstant.toISOString(),
          ...(validation.validUntilInstant === null
            ? {}
            : { validUntil: validation.validUntilInstant.toISOString() }),
          breaks: validation.collectedBands,
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
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
        <RateCardOutcomeCard
          rateCard={createResult.data.rateCard}
          supersededRateCardId={createResult.data.supersededRateCardId}
          onClose={onClose}
        />
      ) : (
        <>
          <RateCardLaneFields
            providerOrganizationId={providerOrganizationId}
            setProviderOrganizationId={setProviderOrganizationId}
            sourceForwarderName={sourceForwarderName}
            setSourceForwarderName={setSourceForwarderName}
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

          <RateCardStartsField
            validFromLocal={validFromLocal}
            setValidFromLocal={setValidFromLocal}
            isValidFromInFuture={isValidFromInFuture}
          />

          <WeightBandEditor
            bandDrafts={bandDrafts}
            onChange={setBandDrafts}
            currency={currency.trim().toUpperCase() || "USD"}
          />

          {incumbentCard !== null && (
            <RateCardSupersedeAlert
              incumbentCard={incumbentCard}
              hasAcknowledgedSupersede={hasAcknowledgedSupersede}
              onToggleAcknowledge={setHasAcknowledgedSupersede}
            />
          )}

          <RateCardComposerErrorMessages localError={localError} createResult={createResult} />

          <RateCardComposerActionButtons
            isPending={createMutation.isPending}
            isSubmitBlocked={isSubmitBlocked}
            onSubmit={handleSubmit}
            onClose={onClose}
          />
        </>
      )}
    </section>
  );
}
