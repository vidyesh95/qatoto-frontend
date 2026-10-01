// TRANSPORT: props-only — draft types and builders for open role compensation.
import type { OpenRoleCompensationStrandInput } from "@/lib/rnd/projects.api";

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
