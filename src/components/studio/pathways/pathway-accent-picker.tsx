"use client";

// TRANSPORT: props-only — a controlled swatch row, no network.
//
// ⚠️ **THE WRITE TUPLE, NOT `AccentTokenSchema`.** The read schema is `z.string()` on purpose so a
// set saved with an accent nobody has styled yet still parses; a PICKER has the opposite duty,
// because the backend body is a strict five-value enum and a sixth swatch would be a control whose
// only outcome is a 422. `PATHWAY_ACCENTS` is that tuple.
//
// The tint classes come from `accentSurfaceClass`, the same lookup the storefront cards use, so an
// author picking "amber" sees the surface a shopper will see rather than an approximation.

import { accentSurfaceClass } from "@/lib/store/labels";
import { PATHWAY_ACCENTS, type PathwayAccent } from "@/lib/store/pathway-authoring.schemas";

export default function PathwayAccentPicker({
  selectedAccent,
  onAccentSelect,
  isDisabled = false,
}: {
  readonly selectedAccent: PathwayAccent;
  readonly onAccentSelect: (accent: PathwayAccent) => void;
  readonly isDisabled?: boolean;
}) {
  return (
    <fieldset className="mt-1">
      <legend className="text-xs text-muted-foreground">Card tint</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {PATHWAY_ACCENTS.map((accent) => (
          <button
            key={accent}
            type="button"
            // `aria-pressed` rather than a radio group: these are toggles over a known-closed set
            // and the label is the colour name, which a radio's own label would duplicate.
            aria-pressed={accent === selectedAccent}
            disabled={isDisabled}
            onClick={() => onAccentSelect(accent)}
            className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium capitalize outline -outline-offset-1 disabled:opacity-40 ${accentSurfaceClass(
              accent,
            )} ${accent === selectedAccent ? "outline-2 outline-primary" : "outline-border"}`}
          >
            {accent}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
