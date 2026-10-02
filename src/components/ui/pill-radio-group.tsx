// TRANSPORT: props-only — a presentational control.
"use client";

import Image from "next/image";

/**
 * Three-or-so choices, one picked. Real radio inputs inside pill labels, so arrow keys move between
 * them and a screen reader announces "radio group, Medium, selected". The picked pill carries a
 * check glyph AND a fill: state is never carried by colour alone (docs/Design.md §6).
 *
 * `groupName` must be unique on the page. Two groups sharing a name are one group to the browser,
 * and picking in one would clear the other.
 */
export default function PillRadioGroup<Value extends string>({
  legend,
  groupName,
  values,
  labels,
  selectedValue,
  onSelect,
  note,
}: {
  readonly legend: string;
  readonly groupName: string;
  readonly values: readonly Value[];
  readonly labels: Record<Value, string>;
  readonly selectedValue: Value;
  readonly onSelect: (value: Value) => void;
  readonly note?: string | null;
}) {
  return (
    <fieldset>
      <legend className="text-xs leading-4 font-medium text-muted-foreground">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => {
          const isSelected = value === selectedValue;
          return (
            <label
              key={value}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted has-checked:border-primary-imprint/60 has-checked:bg-secondary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-imprint"
            >
              <input
                type="radio"
                name={groupName}
                value={value}
                checked={isSelected}
                onChange={() => onSelect(value)}
                className="sr-only"
              />
              {isSelected && (
                <Image
                  src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={14}
                  height={14}
                />
              )}
              {labels[value]}
            </label>
          );
        })}
      </div>
      {note !== null && note !== undefined && (
        <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{note}</p>
      )}
    </fieldset>
  );
}
