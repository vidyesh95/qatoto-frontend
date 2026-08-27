// TRANSPORT: props-only — pure form state, no network. The island that owns it does the write.
"use client";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { COMPENSATION_EARNED_AS_POLICY_LABELS } from "@/lib/rnd/labels";
import type { OpenRoleCompensationStrandInput } from "@/lib/rnd/projects.api";

/**
 * What a role pays: nothing, equity, cash, or a blend.
 *
 * ⚠️ THIS DID NOT EXIST, AND ITS ABSENCE MADE THE WHOLE SURFACE VAGUE. The role form sent a
 * title, a commitment and a description — so a founder could not advertise "2–4% equity and
 * ₹40,000/mo" even though the backend, the columns and the CHECK constraints have all
 * supported exactly that since the table shipped. Every role on the public board was therefore
 * silent about terms, which is the one thing a candidate most wants to know.
 *
 * THE SHAPE IS A SET, NOT AN ENUM, and that is what makes "both" expressible. Each kind is at
 * most one strand — the DB's unique index is `(open_role_id, kind)` — so cash+equity is two
 * rows on one role rather than a fourth value nobody would think to add.
 *
 * NOTHING TICKED IS A REAL ANSWER: an unpaid role, which is the hobbyist case. The form says
 * so rather than leaving a blank that reads like an oversight.
 *
 * THE POLICY IS NOT A FREE CHOICE PER KIND, and offering one would be offering a 422.
 * `open_role_compensation_policy_pairing_ck` refuses anything but `slicing_pie_vesting` on
 * equity, and anything but the two off-platform values on cash. So equity's policy is fixed
 * here and only cash gets a picker.
 *
 * ⚠️ NO LABEL MAY IMPLY A PAYMENT RAIL. Qatoto holds no funds and charges nobody in this
 * domain — cash is paid by the company and merely reported. The copy reuses
 * `COMPENSATION_EARNED_AS_POLICY_LABELS`, which already says "Paid by the company, reported
 * here", instead of inventing new wording that might promise more.
 */

export interface RoleCompensationDraft {
  readonly hasEquity: boolean;
  readonly equityMinPercent: string;
  readonly equityMaxPercent: string;
  readonly hasSalary: boolean;
  readonly salaryMinPerMonth: string;
  readonly salaryMaxPerMonth: string;
  readonly hasOneTime: boolean;
  readonly oneTimeMin: string;
  readonly oneTimeMax: string;
  readonly cashPolicy: "off_platform_payroll" | "direct_transfer";
}

export const EMPTY_ROLE_COMPENSATION_DRAFT: RoleCompensationDraft = {
  hasEquity: false,
  equityMinPercent: "",
  equityMaxPercent: "",
  hasSalary: false,
  salaryMinPerMonth: "",
  salaryMaxPerMonth: "",
  hasOneTime: false,
  oneTimeMin: "",
  oneTimeMax: "",
  cashPolicy: "off_platform_payroll",
};

/**
 * Major units as typed → the integer minor units the wire takes.
 *
 * STRING ARITHMETIC, NOT `* 100`: floating point turns `40000.10` into a value a cent short,
 * and a wage is the wrong place to lose a cent. `null` means "not a usable amount", which is
 * what disables the submit.
 */
function toMinorUnits(rawAmount: string): number | null {
  const trimmed = rawAmount.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const minorUnits = Number(`${wholePart}${fractionPart.padEnd(2, "0")}`);
  return Number.isSafeInteger(minorUnits) && minorUnits > 0 ? minorUnits : null;
}

/**
 * A percent as typed → integer basis points. `2.5` → `250`.
 *
 * BASIS POINTS ARE THE STORED UNIT because equity must never be a float — the whole ledger is
 * integer arithmetic. Two decimal places is the resolution basis points give, so the regex
 * refuses a third rather than silently rounding somebody's share.
 */
function toBasisPoints(rawPercent: string): number | null {
  const trimmed = rawPercent.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const basisPoints = Math.round(Number(trimmed) * 100);
  return Number.isInteger(basisPoints) && basisPoints >= 0 && basisPoints <= 10_000
    ? basisPoints
    : null;
}

/**
 * The draft as the API takes it, or `null` when a ticked strand is incomplete.
 *
 * `null` IS THE SUBMIT GUARD, not an error message: a half-filled range is a form that is not
 * finished, and the caller disables the button rather than sending something the CHECK
 * constraints would refuse anyway.
 */
export function buildCompensationStrands(
  draft: RoleCompensationDraft,
): readonly OpenRoleCompensationStrandInput[] | null {
  const strands: OpenRoleCompensationStrandInput[] = [];

  if (draft.hasEquity) {
    const minimum = toBasisPoints(draft.equityMinPercent);
    if (minimum === null) return null;
    const maximum =
      draft.equityMaxPercent.trim().length === 0
        ? undefined
        : toBasisPoints(draft.equityMaxPercent);
    if (maximum === null || (maximum !== undefined && maximum < minimum)) return null;
    strands.push({
      kind: "equity",
      equityBasisPointsMin: minimum,
      ...(maximum === undefined ? {} : { equityBasisPointsMax: maximum }),
      // Fixed, not chosen — the DB refuses every other pairing.
      earnedAsPolicy: "slicing_pie_vesting",
    });
  }

  if (draft.hasSalary) {
    const minimum = toMinorUnits(draft.salaryMinPerMonth);
    if (minimum === null) return null;
    const maximum =
      draft.salaryMaxPerMonth.trim().length === 0
        ? undefined
        : toMinorUnits(draft.salaryMaxPerMonth);
    if (maximum === null || (maximum !== undefined && maximum < minimum)) return null;
    strands.push({
      kind: "salary",
      salaryMinInCentsPerMonth: minimum,
      ...(maximum === undefined ? {} : { salaryMaxInCentsPerMonth: maximum }),
      earnedAsPolicy: draft.cashPolicy,
    });
  }

  if (draft.hasOneTime) {
    const minimum = toMinorUnits(draft.oneTimeMin);
    if (minimum === null) return null;
    const maximum =
      draft.oneTimeMax.trim().length === 0 ? undefined : toMinorUnits(draft.oneTimeMax);
    if (maximum === null || (maximum !== undefined && maximum < minimum)) return null;
    strands.push({
      kind: "one_time",
      oneTimeMinInCents: minimum,
      ...(maximum === undefined ? {} : { oneTimeMaxInCents: maximum }),
      earnedAsPolicy: draft.cashPolicy,
    });
  }

  return strands;
}

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
        {isOn && <span className="text-[10px] leading-none">✓</span>}
      </span>
      {label}
    </button>
  );
}
