"use client";

// An add/remove list of short strings — the choice values of a customization slot, and the values
// of a variant option axis. Duplicates are refused, Enter adds, and × removes. Moved out of
// `customization-step.tsx` so both steps share one control rather than two that drift.
import { useState } from "react";

export function StringListRows({
  legend,
  placeholder,
  values,
  maxCount,
  maxLength = 120,
  onChange,
}: {
  readonly legend: string;
  readonly placeholder: string;
  readonly values: readonly string[];
  readonly maxCount: number;
  /** Characters one value may hold. 120 suits a choice label; an option value is shorter. */
  readonly maxLength?: number;
  readonly onChange: (values: string[]) => void;
}) {
  const [pendingValue, setPendingValue] = useState("");

  function addPendingValue() {
    const trimmed = pendingValue.trim();
    if (trimmed.length === 0 || values.length >= maxCount || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setPendingValue("");
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{legend}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={pendingValue}
          maxLength={maxLength}
          onChange={(changeEvent) => setPendingValue(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key !== "Enter") return;
            keyEvent.preventDefault();
            addPendingValue();
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={addPendingValue}
          disabled={pendingValue.trim().length === 0 || values.length >= maxCount}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {values.map((value, valueIndex) => (
            <li
              key={value}
              className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, index) => index !== valueIndex))}
                aria-label={`Remove ${value}`}
                className="cursor-pointer text-muted-foreground"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
