// TRANSPORT: props-only — presentational field primitives for the Blueprints forms. No network.
//
// ⚠️ A SHARED MODULE RATHER THAN FILE-SCOPED HELPERS, WHICH IS A DELIBERATE DEPARTURE FROM
// `details-step.tsx`. That file declares `LabeledTextInput`, `LabeledSelect` and `CheckboxRow`
// file-scoped "per repo convention", and it is ONE file, so the convention costs nothing there. The
// Blueprints forms are many files, and a copy of a labelled input per file is a place for a focus
// ring or an error slot to drift. The convention exists to stop premature abstraction across
// FEATURES; these forms are one surface.
//
// ⚠️ IT LIVES IN `blueprints/authoring/` BECAUSE THREE FORMS IMPORT IT: the teardown wizard, the
// rights-claim composer and the launch composer. It sat inside the teardown wizard's folder while
// the wizard was its only caller. Still not `src/components/ui/`: that directory holds primitives
// more than one SURFACE imports, and all three callers are Blueprints.
//
// Everything here builds on `INPUT_CLASS` / `LABEL_CLASS` so the fields match every other form in
// the product rather than inventing a second field vocabulary.

import type { ReactNode } from "react";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

/**
 * The error slot every field carries.
 *
 * ⚠️ THE MESSAGE IS NOT THE ONLY SIGNAL. `docs/Design.md` §5 is explicit that a field's border does
 * not change colour alone, because colour alone is not an error signal — so the message renders as
 * text and the field keeps its ordinary border. `null` renders nothing at all, not an empty
 * reserved line: a form that reserves space for every possible error reads as a form full of
 * problems before anybody has typed.
 */
function FieldError({ message }: { readonly message: string | null }) {
  if (message === null) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

/** A hint under a field. Separate from the error so both can show at once. */
function FieldHint({ hint }: { readonly hint: string | undefined }) {
  if (hint === undefined) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{hint}</p>;
}

/**
 * A live character count under a field with a soft limit.
 *
 * ⚠️ SOFT, NOT `maxLength`. A hard cap silently drops the end of a paste, and the words that vanish
 * are usually the ones the person meant to keep; the schema's `.max()` is the real gate. Over the
 * limit the count says so IN WORDS ("83 of 80, 3 over"), because a colour change alone is not a
 * signal (`docs/Design.md` §6).
 */
function FieldCharacterCount({
  characterCount,
  characterLimit,
}: {
  readonly characterCount: number;
  readonly characterLimit: number;
}) {
  const overLimitCount = characterCount - characterLimit;
  return (
    <p
      className={`mt-1 text-xs tabular-nums ${overLimitCount > 0 ? "text-destructive" : "text-muted-foreground"}`}
    >
      {characterCount} of {characterLimit}
      {overLimitCount > 0 ? `, ${overLimitCount} over` : null}
    </p>
  );
}

export function LabeledTextInput({
  label,
  value,
  onValueChange,
  hint,
  errorMessage = null,
  placeholder,
  inputType = "text",
  characterLimit,
}: {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (nextValue: string) => void;
  readonly hint?: string;
  readonly errorMessage?: string | null;
  readonly placeholder?: string;
  /** `text`, `url` or `date`. No `number`: every scalar is text until the form's collector. */
  readonly inputType?: "text" | "url" | "date";
  /** A soft limit with a live count under the field. Omit for no counter. */
  readonly characterLimit?: number;
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <input
        type={inputType}
        value={value}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLASS} mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]`}
      />
      <FieldHint hint={hint} />
      {characterLimit === undefined ? null : (
        <FieldCharacterCount characterCount={value.length} characterLimit={characterLimit} />
      )}
      <FieldError message={errorMessage} />
    </label>
  );
}

export function LabeledTextArea({
  label,
  value,
  onValueChange,
  hint,
  errorMessage = null,
  rowCount = 4,
}: {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (nextValue: string) => void;
  readonly hint?: string;
  readonly errorMessage?: string | null;
  readonly rowCount?: number;
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <textarea
        value={value}
        rows={rowCount}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        className={`${INPUT_CLASS} mt-1 resize-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]`}
      />
      <FieldHint hint={hint} />
      <FieldError message={errorMessage} />
    </label>
  );
}

/**
 * A native `<select>` over an enum tuple and its label record.
 *
 * ⚠️ NATIVE, NOT A CUSTOM DROPDOWN. `product.md` bans reinventing standard affordances for flavour,
 * and a native select is keyboard-operable, screen-reader-correct and mobile-native for free. The
 * repo's one custom picker (`CreatableCombobox`) exists because it does something a select cannot:
 * accept a value that is not in the list.
 */
export function LabeledEnumSelect<TValue extends string>({
  label,
  value,
  options,
  optionLabels,
  onValueChange,
  hint,
  errorMessage = null,
  /** Rendered as the first option when the field is optional. Omit for a required one. */
  emptyOptionLabel,
}: {
  readonly label: string;
  readonly value: TValue | "";
  readonly options: readonly TValue[];
  readonly optionLabels: Record<TValue, string>;
  readonly onValueChange: (nextValue: TValue | "") => void;
  readonly hint?: string;
  readonly errorMessage?: string | null;
  readonly emptyOptionLabel?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <select
        value={value}
        /*
          ⚠️ THE SELECTED VALUE IS CHECKED AGAINST THE OPTIONS, NOT ASSERTED INTO THE TYPE. `as TValue`
          was the obvious spelling and it is the assertion CLAUDE.md Pattern 2 rules out: a `<select>`
          hands back a `string`, and claiming it is one of the enum members without looking is the
          same unchecked promise as `as MyType` on a network payload. `.find` is one comparison over a
          list that never exceeds ten, and it makes the empty option the only other reachable value.
        */
        onChange={(changeEvent) =>
          onValueChange(options.find((option) => option === changeEvent.target.value) ?? "")
        }
        className={`${INPUT_CLASS} mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]`}
      >
        {emptyOptionLabel === undefined ? null : <option value="">{emptyOptionLabel}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option]}
          </option>
        ))}
      </select>
      <FieldHint hint={hint} />
      <FieldError message={errorMessage} />
    </label>
  );
}

/**
 * A real `<input type="checkbox">`.
 *
 * ⚠️ NOT `details-step.tsx`'s `CheckboxRow`, WHICH IS A STYLED `<button>`. That works for a filter
 * pill; it is the wrong element for an attestation, where the control's semantics are the point.
 * A screen reader must announce "checkbox, not checked" and a form must be able to report which
 * boxes are unticked. Accessibility here is not a polish item — it is what makes the consent real.
 */
export function CheckboxRow({
  label,
  detail,
  isChecked,
  onCheckedChange,
}: {
  readonly label: string;
  readonly detail?: ReactNode;
  readonly isChecked: boolean;
  readonly onCheckedChange: (nextIsChecked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-t border-border py-3">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(changeEvent) => onCheckedChange(changeEvent.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {detail === undefined ? null : (
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span>
        )}
      </span>
    </label>
  );
}

/**
 * The shell every repeatable editor shares: a heading, the rows, an add control and an empty line.
 *
 * ⚠️ THE EMPTY STATE HERE RENDERS COPY, WHICH IS THE OPPOSITE OF THE READ SURFACE'S RULE. On a
 * published page an absence renders nothing, because the reader is being told what exists. In a
 * FORM the same absence is a question nobody has answered yet, and a blank space under a heading
 * does not say whether the author is finished or lost.
 */
export function RepeatableRowsShell({
  heading,
  description,
  emptyMessage,
  addLabel,
  onAddRow,
  rowCount,
  children,
}: {
  readonly heading: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly addLabel: string;
  readonly onAddRow: () => void;
  readonly rowCount: number;
  readonly children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-foreground">{heading}</h3>
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>

      {rowCount === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-3">{children}</div>
      )}

      <button
        type="button"
        onClick={onAddRow}
        className="mt-3 rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
      >
        {addLabel}
      </button>
    </section>
  );
}

/** One row's frame, with its remove control. */
export function RepeatableRowShell({
  rowLabel,
  onRemoveRow,
  children,
}: {
  readonly rowLabel: string;
  readonly onRemoveRow: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
          {rowLabel}
        </span>
        <button
          type="button"
          onClick={onRemoveRow}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
