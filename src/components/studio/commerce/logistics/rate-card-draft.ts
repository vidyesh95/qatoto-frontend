import {
  collectBands,
  type WeightBandDraft,
} from "@/components/commerce/freight/weight-band-editor";
import type { FreightMode } from "@/lib/store/freight.schemas";
import {
  CreateProviderFreightRateCardInputSchema,
  type CreateProviderFreightRateCardInput,
} from "@/lib/store/provider-freight.schemas";

/**
 * The ONE place a forwarder's composer draft becomes a wire payload (§19.12).
 *
 * PURE, AND SEPARATE FROM THE COMPONENT, on the `wizard-shared.ts` precedent — this is the single
 * function where a silent mistake reaches the backend as a 422 the publisher cannot act on, so it
 * is the single function worth a test.
 *
 * ⚠️ WHAT IT MUST NEVER PUT ON THE WIRE. `providerOrganizationId` and `sourceForwarderName` are
 * derived from the session by the server, whose schema is `.strict()` — so sending either is a 422
 * on the WHOLE submission, not an ignored key. There is no branch below that can add them, and the
 * test asserts their absence, because a regression there breaks every publish rather than a field.
 */

export interface RateCardComposerDraft {
  readonly originCountryCode: string;
  readonly destinationCountryCode: string;
  readonly mode: FreightMode;
  readonly currency: string;
  /** `datetime-local` value, LOCAL time, `YYYY-MM-DDTHH:mm`. */
  readonly validFromLocal: string;
  readonly validUntilLocal: string;
  /** Held as text: a numeric state cannot tell "empty" from `0`. */
  readonly volumetricDivisorCm3PerKg: string;
  readonly bandDrafts: readonly WeightBandDraft[];
}

export type BuildRateCardInputResult =
  | { readonly ok: true; readonly input: CreateProviderFreightRateCardInput }
  | { readonly ok: false; readonly error: string };

/** §19.11 step 4, against DRAFTS rather than server rows. */
export function hasZeroWeightFloorDraft(bandDrafts: readonly WeightBandDraft[]): boolean {
  return bandDrafts.some((draft) => draft.minBillableWeightGrams.trim() === "0");
}

/**
 * Turn a draft into a create body, or say why it cannot be one.
 *
 * `now` IS A PARAMETER so the future-`validFrom` rule is testable without faking a clock, and so a
 * caller can check the same instant it is about to submit against.
 */
export function buildCreateRateCardInput(
  draft: RateCardComposerDraft,
  now: Date,
): BuildRateCardInputResult {
  /**
   * §19.11 step 1, and the reason this is a refusal rather than a warning: the server defaults
   * nothing, and a card in force the instant it exists can never have its bands edited — `validFrom`
   * is absent from every PATCH schema, so there is no correcting it, only withdraw and re-author.
   */
  const validFrom = new Date(draft.validFromLocal);
  if (Number.isNaN(validFrom.getTime())) {
    return { ok: false, error: "Enter a date and time for when this card starts applying." };
  }
  if (validFrom.getTime() <= now.getTime()) {
    return {
      ok: false,
      error:
        "The start must be in the future. A card that is already in force can never have its bands edited.",
    };
  }

  let validUntil: string | undefined;
  if (draft.validUntilLocal.trim().length > 0) {
    const parsedValidUntil = new Date(draft.validUntilLocal);
    if (Number.isNaN(parsedValidUntil.getTime())) {
      return { ok: false, error: "That end date could not be read." };
    }
    if (parsedValidUntil.getTime() <= validFrom.getTime()) {
      return { ok: false, error: "The end must be after the start, or the window covers no time." };
    }
    validUntil = parsedValidUntil.toISOString();
  }

  /**
   * §19.9. Never defaulted — the divisor is a tariff convention that varies by forwarder as well as
   * by mode, so the platform picking one would be choosing on their behalf.
   *
   * ⚠️ The bound catches a decimal slip and nothing subtler: a road divisor typed onto an air card
   * is inside 100–20000 and underbills every bulky consignment on that lane, silently.
   */
  const divisorText = draft.volumetricDivisorCm3PerKg.trim();
  if (!/^\d+$/.test(divisorText)) {
    return { ok: false, error: "Enter the volumetric divisor as a whole number of cm³ per kg." };
  }
  const volumetricDivisorCm3PerKg = Number(divisorText);
  if (volumetricDivisorCm3PerKg < 100 || volumetricDivisorCm3PerKg > 20_000) {
    return {
      ok: false,
      error: "The volumetric divisor must be between 100 and 20000 cm³ per kg.",
    };
  }

  // The same collector the typed ladder and the pasted ladder both end at.
  const collected = collectBands(draft.bandDrafts);
  if (!collected.ok) {
    return { ok: false, error: collected.error };
  }

  /**
   * §19.11 step 4. `collectBands` does NOT check this — it is a property of a CARD, not of a band —
   * and without it every consignment lighter than the smallest floor rates `below_smallest_break`,
   * so the lane publishes no option at all and reaches the buyer as an empty delivery sheet,
   * indistinguishable from having loaded nothing.
   */
  if (!hasZeroWeightFloorDraft(draft.bandDrafts)) {
    return {
      ok: false,
      error:
        "One band must start at 0 kg. Without it every lighter consignment prices nothing and the lane publishes no option at all.",
    };
  }

  const candidate = {
    originCountryCode: draft.originCountryCode.trim().toUpperCase(),
    destinationCountryCode: draft.destinationCountryCode.trim().toUpperCase(),
    mode: draft.mode,
    currency: draft.currency.trim().toUpperCase(),
    validFrom: validFrom.toISOString(),
    ...(validUntil === undefined ? {} : { validUntil }),
    volumetricDivisorCm3PerKg,
    breaks: collected.bands,
  };

  /**
   * Parsed rather than asserted, which is where this departs from the staff composer's hand-rolled
   * checks: the paste box produces bodies no human typed, so the last chance to catch a mis-parsed
   * column before it becomes a published tariff is here.
   */
  const parsed = CreateProviderFreightRateCardInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldName = firstIssue?.path.join(".") ?? "form";
    return {
      ok: false,
      error: `${fieldName}: ${firstIssue?.message ?? "This card is not valid."}`,
    };
  }

  return { ok: true, input: parsed.data };
}
