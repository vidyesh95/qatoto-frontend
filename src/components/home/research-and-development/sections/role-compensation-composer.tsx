// TRANSPORT: props-only — pure form state, no network. The island that owns it does the write.
"use client";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { RoleCompensationDraft } from "@/lib/rnd/compensation-draft";
import { COMPENSATION_EARNED_AS_POLICY_LABELS } from "@/lib/rnd/labels";

export default function RoleCompensationComposer({
  draft,
  currency,
  onDraftChange,
}: {
  readonly draft: RoleCompensationDraft;
  readonly currency: string;
  readonly onDraftChange: (patch: Partial<RoleCompensationDraft>) => void;
}) {
  const hasAnyCash = draft.hasSalary || draft.hasOneTime;

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <legend className={LABEL_CLASS}>What it pays</legend>

      <StrandToggle
        label="Equity"
        isOn={draft.hasEquity}
        onToggle={() => {
          onDraftChange({ hasEquity: !draft.hasEquity });
        }}
      />
      {draft.hasEquity && (
        <div className="flex flex-col gap-1 pl-6">
          <div className="flex items-center gap-2">
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={draft.equityMinPercent}
              aria-label="Minimum equity percent"
              placeholder="2"
              onChange={(changeEvent) => {
                onDraftChange({ equityMinPercent: changeEvent.target.value });
              }}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              className={INPUT_CLASS}
              inputMode="decimal"
              value={draft.equityMaxPercent}
              aria-label="Maximum equity percent"
              placeholder="4 (optional)"
              onChange={(changeEvent) => {
                onDraftChange({ equityMaxPercent: changeEvent.target.value });
              }}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          {/* The mechanism, stated rather than chosen — and it is the honest one: equity here
              is not handed over on joining, it accrues as verified work earns slices. */}
          <p className="text-xs text-muted-foreground">
            {COMPENSATION_EARNED_AS_POLICY_LABELS.slicing_pie_vesting}
          </p>
        </div>
      )}

      <StrandToggle
        label="Monthly cash"
        isOn={draft.hasSalary}
        onToggle={() => {
          onDraftChange({ hasSalary: !draft.hasSalary });
        }}
      />
      {draft.hasSalary && (
        <div className="flex items-center gap-2 pl-6">
          <input
            className={INPUT_CLASS}
            inputMode="decimal"
            value={draft.salaryMinPerMonth}
            aria-label="Minimum monthly cash"
            placeholder="40000"
            onChange={(changeEvent) => {
              onDraftChange({ salaryMinPerMonth: changeEvent.target.value });
            }}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            className={INPUT_CLASS}
            inputMode="decimal"
            value={draft.salaryMaxPerMonth}
            aria-label="Maximum monthly cash"
            placeholder="60000 (optional)"
            onChange={(changeEvent) => {
              onDraftChange({ salaryMaxPerMonth: changeEvent.target.value });
            }}
          />
          <span className="text-xs whitespace-nowrap text-muted-foreground">{currency}/mo</span>
        </div>
      )}

      <StrandToggle
        label="One-time payment"
        isOn={draft.hasOneTime}
        onToggle={() => {
          onDraftChange({ hasOneTime: !draft.hasOneTime });
        }}
      />
      {draft.hasOneTime && (
        <div className="flex items-center gap-2 pl-6">
          <input
            className={INPUT_CLASS}
            inputMode="decimal"
            value={draft.oneTimeMin}
            aria-label="Minimum one-time payment"
            placeholder="100000"
            onChange={(changeEvent) => {
              onDraftChange({ oneTimeMin: changeEvent.target.value });
            }}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            className={INPUT_CLASS}
            inputMode="decimal"
            value={draft.oneTimeMax}
            aria-label="Maximum one-time payment"
            placeholder="optional"
            onChange={(changeEvent) => {
              onDraftChange({ oneTimeMax: changeEvent.target.value });
            }}
          />
          <span className="text-xs whitespace-nowrap text-muted-foreground">{currency}</span>
        </div>
      )}

      {/* ONE POLICY FOR BOTH CASH STRANDS. They are the same promise about the same money, and
          a role that paid a salary "by the company" but a bonus "directly" would be describing
          a distinction nobody meant. */}
      {hasAnyCash && (
        <label className="flex flex-col gap-1 pl-6">
          <span className="text-xs text-muted-foreground">How the cash reaches them</span>
          <select
            className={INPUT_CLASS}
            value={draft.cashPolicy}
            onChange={(changeEvent) => {
              onDraftChange({
                cashPolicy:
                  changeEvent.target.value === "direct_transfer"
                    ? "direct_transfer"
                    : "off_platform_payroll",
              });
            }}
          >
            <option value="off_platform_payroll">
              {COMPENSATION_EARNED_AS_POLICY_LABELS.off_platform_payroll}
            </option>
            <option value="direct_transfer">
              {COMPENSATION_EARNED_AS_POLICY_LABELS.direct_transfer}
            </option>
          </select>
        </label>
      )}

      {!draft.hasEquity && !hasAnyCash && (
        <p className="text-xs text-muted-foreground">
          Nothing ticked means an <strong>unpaid</strong> role — someone contributing for the work
          itself. That is a real offer and the board will show it as unpaid.
        </p>
      )}
    </fieldset>
  );
}

function StrandToggle({
  label,
  isOn,
  onToggle,
}: {
  readonly label: string;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isOn}
      className="flex cursor-pointer items-center gap-2 text-left text-sm text-foreground"
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
          isOn ? "border-foreground bg-foreground text-background" : "border-border"
        }`}
      >
        {isOn && <span className="text-xs leading-none">✓</span>}
      </span>
      {label}
    </button>
  );
}
