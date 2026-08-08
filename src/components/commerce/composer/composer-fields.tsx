// TRANSPORT: props-only — controlled inputs. They hold nothing and send nothing.
"use client";

// THE FIELD VOCABULARY BOTH COMPOSERS SPEAK. `/store/rfqs/new` and `/studio/services/create` fill two
// different `.strict()` bodies, but they ask for the same SHAPES of answer — a string, a paragraph, a set of
// chips, a number, a yes/no — so those live here once. Semantic tokens, because this sits under
// `src/components/commerce/**` and renders on both the store and studio surfaces.
//
// `TriStateBooleanField` IS THE REASON THIS FILE EXISTS RATHER THAN TWO COPIES OF IT.
//
// An RFQ requirement's booleans are `.optional()` on the wire; a service offering's are REQUIRED. That is
// not a schema accident — it is the difference between asking and answering:
//
//   A BUYER who has not said whether they need hazardous-goods handling has not said "no". Sending `false`
//   claims they do not need it, and a provider who could have handled it filters itself out. So the control
//   has THREE positions and "Not specified" is the initial one, which is then OMITTED from the request.
//
//   A PROVIDER publishing a listing must answer. `false` there is a real, published statement — "we do not
//   consolidate" — and a buyer filtering on consolidation depends on it being said. So that control is a
//   plain checkbox with two positions and no third.
//
// A single "boolean field" used for both would send `false` for every question a buyer skipped.

import { useState, type ReactNode } from "react";

const FIELD_LABEL_CLASS = "text-xs font-medium text-muted-foreground";
const FIELD_INPUT_CLASS =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

export function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {hint !== undefined && (
        <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      )}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function TextField({
  label,
  hint,
  value,
  onValueChange,
  placeholder,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="text"
        value={value}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        placeholder={placeholder}
        // MIRRORS THE BACKEND LIMIT so an over-long value is impossible rather than a 422. The server still
        // checks; this only means the buyer finds out while typing instead of on submit.
        maxLength={maxLength}
        className={FIELD_INPUT_CLASS}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  value,
  onValueChange,
  rows = 3,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        value={value}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        rows={rows}
        maxLength={maxLength}
        className={FIELD_INPUT_CLASS}
      />
    </FieldShell>
  );
}

/**
 * An integer, held as TEXT.
 *
 * THE STATE IS A STRING ON PURPOSE. A numeric state cannot represent "the field is empty" separately from
 * "the field holds zero", and on this surface those are different facts: an empty lead time means the
 * provider did not say, while `0` means same-day. Conversion happens once, at submit, where an unparseable
 * or blank value becomes `undefined` and is omitted from the body.
 */
export function IntegerField({
  label,
  hint,
  value,
  onValueChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        placeholder={placeholder}
        className={FIELD_INPUT_CLASS}
      />
    </FieldShell>
  );
}

export function SelectField<TValue extends string>({
  label,
  hint,
  value,
  options,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: TValue;
  options: readonly { readonly value: TValue; readonly label: string }[];
  onValueChange: (nextValue: TValue) => void;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value}
        onChange={(changeEvent) => {
          const chosen = options.find((option) => option.value === changeEvent.target.value);
          // Looked up in the option list rather than cast. `changeEvent.target.value` is a `string`, and
          // `as TValue` would be a type assertion on a DOM value — the exact move Pattern 2 forbids.
          if (chosen !== undefined) onValueChange(chosen.value);
        }}
        className={`${FIELD_INPUT_CLASS} cursor-pointer`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** A fixed set of enum chips, toggled. Used where the wire field is an array of enum members. */
export function ChipMultiSelectField<TValue extends string>({
  label,
  hint,
  selectedValues,
  options,
  onSelectedValuesChange,
}: {
  label: string;
  hint?: string;
  selectedValues: readonly TValue[];
  options: readonly { readonly value: TValue; readonly label: string }[];
  onSelectedValuesChange: (nextValues: readonly TValue[]) => void;
}) {
  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {hint !== undefined && (
        <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onSelectedValuesChange(
                  isSelected
                    ? selectedValues.filter((selected) => selected !== option.value)
                    : [...selectedValues, option.value],
                )
              }
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground outline -outline-offset-1 outline-border"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A free-text list, entered one entry at a time.
 *
 * NOT A COMMA-SPLIT TEXTBOX. Several of these fields hold values that legitimately contain commas —
 * "Rotterdam, Netherlands" as a laboratory location, "IEC 61010-1, Annex C" as a standard — so splitting on
 * a comma would silently cut one entry into two and the backend would store both.
 */
export function TokenListField({
  label,
  hint,
  values,
  onValuesChange,
  placeholder,
  maxEntries,
}: {
  label: string;
  hint?: string;
  values: readonly string[];
  onValuesChange: (nextValues: readonly string[]) => void;
  placeholder?: string;
  maxEntries: number;
}) {
  const [pendingEntry, setPendingEntry] = useState("");
  const isAtLimit = values.length >= maxEntries;

  const commitPendingEntry = () => {
    const trimmed = pendingEntry.trim();
    if (trimmed === "" || isAtLimit) return;
    // Duplicates dropped here rather than sent. Several of these columns are used as filter inputs, and a
    // repeated entry is noise in every one of them.
    if (values.includes(trimmed)) {
      setPendingEntry("");
      return;
    }
    onValuesChange([...values, trimmed]);
    setPendingEntry("");
  };

  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {hint !== undefined && (
        <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      )}

      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={pendingEntry}
          onChange={(changeEvent) => setPendingEntry(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key !== "Enter") return;
            // The composer sits inside a form-shaped page; Enter must add an entry, not submit an RFQ.
            keyEvent.preventDefault();
            commitPendingEntry();
          }}
          placeholder={placeholder}
          disabled={isAtLimit}
          className={FIELD_INPUT_CLASS}
        />
        <button
          type="button"
          onClick={commitPendingEntry}
          disabled={isAtLimit || pendingEntry.trim() === ""}
          className="shrink-0 cursor-pointer rounded-lg bg-background px-3 py-2 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((entry) => (
            <li key={entry}>
              <button
                type="button"
                onClick={() => onValuesChange(values.filter((value) => value !== entry))}
                aria-label={`Remove ${entry}`}
                className="cursor-pointer rounded-full bg-muted px-3 py-1.5 text-xs text-foreground"
              >
                {entry} ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAtLimit && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          That is the most this field accepts.
        </p>
      )}
    </div>
  );
}

/** The three answers an optional wire boolean can carry. `unspecified` is OMITTED from the request. */
export type TriStateAnswer = "unspecified" | "yes" | "no";

const TRI_STATE_OPTIONS: readonly { readonly value: TriStateAnswer; readonly label: string }[] = [
  { value: "unspecified", label: "Not specified" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/**
 * A yes / no / not-specified control, for a wire field that is `.optional()` and not nullable.
 *
 * "NOT SPECIFIED" IS THE DEFAULT AND IS NOT A "NO". It means the field is left out of the request entirely,
 * so the backend stores nothing and no provider is filtered on an answer the buyer never gave.
 */
export function TriStateBooleanField({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: TriStateAnswer;
  onValueChange: (nextValue: TriStateAnswer) => void;
}) {
  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {hint !== undefined && (
        <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      )}
      {/* A `fieldset` rather than `div role="group"` — the semantic element carries the grouping natively. */}
      <fieldset className="mt-1 flex flex-wrap gap-2">
        <legend className="sr-only">{label}</legend>
        {TRI_STATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onValueChange(option.value)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground outline -outline-offset-1 outline-border"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

/**
 * A plain two-state checkbox, for a wire field that is REQUIRED.
 *
 * `false` HERE IS A PUBLISHED ANSWER, not an absence — which is why this control has no third position and
 * why an offering composer must not reach for `TriStateBooleanField`.
 */
export function CheckboxField({
  label,
  hint,
  isChecked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  isChecked: boolean;
  onCheckedChange: (nextChecked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(changeEvent) => onCheckedChange(changeEvent.target.checked)}
        className="mt-0.5 size-4 cursor-pointer accent-primary"
      />
      <span>
        <span className="block text-sm leading-5 text-foreground">{label}</span>
        {hint !== undefined && (
          <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
        )}
      </span>
    </label>
  );
}

/** The step rail. Completed steps are reachable; steps ahead are not — they may depend on earlier answers. */
export function ComposerStepRail({
  steps,
  currentStepIndex,
  onStepSelect,
}: {
  steps: readonly { readonly id: string; readonly label: string }[];
  currentStepIndex: number;
  onStepSelect: (stepIndex: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2 pb-4">
      {steps.map((step, stepIndex) => {
        const isCurrent = stepIndex === currentStepIndex;
        const isReachable = stepIndex <= currentStepIndex;
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!isReachable}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onStepSelect(stepIndex)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isReachable
                    ? "cursor-pointer bg-background text-foreground outline -outline-offset-1 outline-border"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {stepIndex + 1}. {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
