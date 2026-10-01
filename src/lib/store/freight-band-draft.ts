import type { FreightRateBreakInput } from "@/lib/store/admin-freight.schemas";

/**
 * The weight/volume ladder, as typed.
 *
 * EVERY NUMERIC FIELD IS HELD AS A STRING, following the bulk-pricing-tier editor in
 * `studio/pages/create-listing-page.tsx`. A number-typed state cannot represent a half-entered
 * row (empty, a trailing decimal, a backspace) without inventing a value, and inventing a value is
 * how a 500g threshold becomes 0g and underprices freight. Validation across the whole ladder is
 * deferred to `collectBands`, once, at submit.
 *
 * `id` IS A REACT KEY AND IS NEVER SENT. Band order on the wire IS the array order — the server
 * assigns dense positions from 0 — so there is no `position` field to type and nothing here may
 * offer one.
 */
export interface WeightBandDraft {
  readonly id: string;
  readonly minBillableWeightGrams: string;
  readonly minVolumeCubicCm: string;
  readonly unitPriceInCents: string;
  readonly minimumChargeInCents: string;
  readonly transitDaysMin: string;
  readonly transitDaysMax: string;
}

export function newWeightBandDraft(): WeightBandDraft {
  return {
    id: crypto.randomUUID(),
    minBillableWeightGrams: "",
    minVolumeCubicCm: "0",
    unitPriceInCents: "",
    minimumChargeInCents: "0",
    transitDaysMin: "",
    transitDaysMax: "",
  };
}

/** The band a lane needs so that nothing is too small to price. See `collectBands`. */
export function newZeroFloorBandDraft(): WeightBandDraft {
  return { ...newWeightBandDraft(), minBillableWeightGrams: "0" };
}

export type CollectBandsResult =
  | { readonly ok: true; readonly bands: FreightRateBreakInput[] }
  | { readonly ok: false; readonly error: string };

export function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Turn the draft ladder into a request body, or say what is wrong in one sentence.
 *
 * A UNION RATHER THAN A THROW, matching the listing composer: a validation failure here is an
 * expected outcome of a form, not an exception, and the caller renders the string beside the
 * submit button.
 *
 * WHOLLY BLANK ROWS ARE SKIPPED, a PARTIAL row is an error. An operator who tabs past an empty row
 * meant nothing by it; an operator who filled three of six fields meant something and got it
 * wrong, and silently dropping that row would publish a ladder they did not author.
 *
 * The backend re-validates every one of these bounds — this is fast feedback, never the authority.
 */
export function collectBands(drafts: readonly WeightBandDraft[]): CollectBandsResult {
  const bands: FreightRateBreakInput[] = [];

  for (const [draftIndex, draft] of drafts.entries()) {
    const fields = [
      draft.minBillableWeightGrams,
      draft.minVolumeCubicCm,
      draft.unitPriceInCents,
      draft.minimumChargeInCents,
      draft.transitDaysMin,
      draft.transitDaysMax,
    ];
    if (fields.every((field) => field.trim().length === 0)) continue;

    const rowLabel = `Band ${draftIndex + 1}`;
    const minBillableWeightGrams = parseWholeNumber(draft.minBillableWeightGrams);
    const minVolumeCubicCm = parseWholeNumber(draft.minVolumeCubicCm);
    const unitPriceInCents = parseWholeNumber(draft.unitPriceInCents);
    const minimumChargeInCents = parseWholeNumber(draft.minimumChargeInCents);
    const transitDaysMin = parseWholeNumber(draft.transitDaysMin);
    const transitDaysMax = parseWholeNumber(draft.transitDaysMax);

    if (
      minBillableWeightGrams === null ||
      minVolumeCubicCm === null ||
      unitPriceInCents === null ||
      minimumChargeInCents === null ||
      transitDaysMin === null ||
      transitDaysMax === null
    ) {
      return {
        ok: false,
        error: `${rowLabel} needs a whole number in every field. Remove the row if you did not mean to add it.`,
      };
    }
    // Mirrors the backend's own floor: a zero-priced band is refused rather than read as free
    // carriage, so catching it here saves a round trip for an obvious slip.
    if (unitPriceInCents < 1) {
      return { ok: false, error: `${rowLabel} needs a unit price above zero.` };
    }
    if (transitDaysMax < transitDaysMin) {
      return {
        ok: false,
        error: `${rowLabel} has a maximum transit shorter than its minimum.`,
      };
    }

    bands.push({
      minBillableWeightGrams,
      minVolumeCubicCm,
      unitPriceInCents,
      minimumChargeInCents,
      transitDaysMin,
      transitDaysMax,
    });
  }

  if (bands.length === 0) {
    return { ok: false, error: "A card needs at least one band. It prices nothing without one." };
  }
  if (bands.length > 20) {
    return { ok: false, error: "A card takes at most 20 bands." };
  }

  // The backend enforces this with a unique index on (rateCardId, minBillableWeightGrams,
  // minVolumeCubicCm) and answers 422 without naming which row collided — so catching it here is
  // the only way an operator learns WHICH band is the duplicate.
  const seenFloors = new Set<string>();
  for (const [bandIndex, band] of bands.entries()) {
    const floorKey = `${band.minBillableWeightGrams}:${band.minVolumeCubicCm}`;
    if (seenFloors.has(floorKey)) {
      return {
        ok: false,
        error: `Band ${bandIndex + 1} repeats a floor another band already claims. Each band needs its own weight/volume floor.`,
      };
    }
    seenFloors.add(floorKey);
  }

  return { ok: true, bands };
}
