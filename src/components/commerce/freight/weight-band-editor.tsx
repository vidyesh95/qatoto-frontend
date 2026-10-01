// TRANSPORT: props-only — client island. Holds the draft ladder in local state and hands a
// collected result to its parent; it fetches nothing and writes nothing itself.
//
// UNDER `components/commerce/**` RATHER THAN `components/admin/**` because TWO composers author
// the same ladder now: the staff console at `/admin/freight` and the forwarder's own composer at
// `/studio/logistics/rate-cards` (§19.12). A copy per surface is how the two ladders start
// disagreeing about the 20-band cap or the duplicate-floor rule, which are properties of the
// TABLE rather than of whoever is typing.
"use client";

import { formatCentsLabel, formatGramsLabel } from "@/lib/store/format";
import {
  newWeightBandDraft,
  newZeroFloorBandDraft,
  parseWholeNumber,
  type WeightBandDraft,
  type CollectBandsResult,
} from "@/lib/store/freight-band-draft";

export type { WeightBandDraft, CollectBandsResult };

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
        <p className="rounded-xl bg-warning-container p-2 text-xs text-warning-container-foreground">
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
