import { useState } from "react";
import { newZeroFloorBandDraft, type WeightBandDraft } from "@/lib/store/freight-band-draft";
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
import type { FreightMode } from "@/lib/store/freight.schemas";
import { parseFreightBandGrid } from "@/lib/store/freight-band-paste";

function padTwoDigits(part: number): string {
  return String(part).padStart(2, "0");
}

function defaultValidFromLocalValue(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${tomorrow.getFullYear()}-${padTwoDigits(tomorrow.getMonth() + 1)}-${padTwoDigits(tomorrow.getDate())}T${padTwoDigits(tomorrow.getHours())}:${padTwoDigits(tomorrow.getMinutes())}`;
}

export function useProviderRateCardComposerState() {
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
          if (!result.success) return;
          resetIdempotencyKey();
        },
      },
    );
  }

  return {
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
  };
}
