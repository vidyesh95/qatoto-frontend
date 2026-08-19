// TRANSPORT: props-only — client island. Holds the draft ladder in local state and hands a
// collected result to its parent; it fetches nothing and writes nothing itself.
"use client";

import { formatCentsLabel, formatGramsLabel } from "@/lib/store/format";
import type { FreightRateBreakInput } from "@/lib/store/admin-freight.schemas";

/**
 * The weight/volume ladder, as typed.
 *
 * EVERY NUMERIC FIELD IS HELD AS A STRING, following the bulk-pricing-tier editor in
 * `studio/pages/create-listing-page.tsx`. A number-typed state cannot represent a half-entered
 * value: "1." and "" both collapse to `NaN` or `0`, and the operator's cursor jumps. Parsing is
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

function parseWholeNumber(value: string): number | null {
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

const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

export default function WeightBandEditor({
  bandDrafts,
  onChange,
  currency,
  isDisabled = false,
}: {
  bandDrafts: readonly WeightBandDraft[];
  onChange: (nextDrafts: WeightBandDraft[]) => void;
  /**
   * The card's own currency, threaded in rather than assumed. An echo line that said "USD" under a
   * EUR card would be a fabricated fact about money on the screen where money is authored.
   */
  currency: string;
  isDisabled?: boolean;
}) {
  function handleFieldChange(
    draftIndex: number,
    field: keyof Omit<WeightBandDraft, "id">,
    value: string,
  ) {
    onChange(
      bandDrafts.map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: value } : draft,
      ),
    );
  }

  function handleRemoveClick(indexToRemove: number) {
    onChange(bandDrafts.filter((_, index) => index !== indexToRemove));
  }

  const hasZeroFloorDraft = bandDrafts.some((draft) => draft.minBillableWeightGrams.trim() === "0");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Weight bands</h4>
        <div className="flex gap-2">
          {!hasZeroFloorDraft && (
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onChange([newZeroFloorBandDraft(), ...bandDrafts])}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              Add a 0 g floor band
            </button>
          )}
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onChange([...bandDrafts, newWeightBandDraft()])}
            className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            Add a band
          </button>
        </div>
      </div>

      {/*
        THE WARNING THAT MATTERS MOST ON THIS SCREEN, and the reason it is not a nicety: rating
        picks the highest band a consignment clears. With nothing at a 0 g floor, every consignment
        lighter than the smallest band answers `below_smallest_break`, which reaches the buyer as an
        EMPTY options list — identical to a lane with no rate card at all. The lane reads as
        unserved rather than mispriced, so nobody reports it.
      */}
      {bandDrafts.length > 0 && !hasZeroFloorDraft && (
        <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          No band starts at 0 g. Anything lighter than your smallest band will price as nothing at
          all — the buyer sees an empty delivery list, indistinguishable from a lane you never
          loaded.
        </p>
      )}

      <ul className="space-y-2">
        {bandDrafts.map((draft, draftIndex) => (
          <li key={draft.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Band {draftIndex + 1}
                {draft.minBillableWeightGrams.trim() === "0" && " · floor"}
              </span>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleRemoveClick(draftIndex)}
                className="cursor-pointer text-xs text-muted-foreground underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["minBillableWeightGrams", "Min weight (g)", "0"],
                  ["minVolumeCubicCm", "Min volume (cm³)", "0"],
                  ["unitPriceInCents", "Unit price (cents)", "0"],
                  ["minimumChargeInCents", "Minimum charge (cents)", "0"],
                  ["transitDaysMin", "Transit min (days)", "0"],
                  ["transitDaysMax", "Transit max (days)", "0"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <input
                    inputMode="numeric"
                    disabled={isDisabled}
                    value={draft[field]}
                    placeholder={placeholder}
                    onChange={(changeEvent) =>
                      handleFieldChange(draftIndex, field, changeEvent.target.value)
                    }
                    className={FIELD_CLASS}
                  />
                </label>
              ))}
            </div>
            {/* Echoes the two figures back in the units a person reads them in — through the same
                `formatGramsLabel` and `formatCentsLabel` the buyer's delivery sheet uses, so an
                operator and a buyer can never read the same number differently. Blank until the
                field parses: an echo under a half-typed value would be guessing at intent. */}
            <p className="mt-2 text-xs text-muted-foreground">
              {parseWholeNumber(draft.minBillableWeightGrams) !== null &&
                `From ${formatGramsLabel(Number(draft.minBillableWeightGrams))}`}
              {parseWholeNumber(draft.unitPriceInCents) !== null &&
                ` · ${formatCentsLabel(Number(draft.unitPriceInCents), currency)} per unit`}
            </p>
          </li>
        ))}
      </ul>

      {bandDrafts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No bands yet. A card prices nothing until it has at least one.
        </p>
      )}
    </div>
  );
}
