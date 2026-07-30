// TRANSPORT: props-only — presentational server component. Fetches nothing; strands
// arrive as props from a parent that read GET /open-roles or GET /discovery/talent.
import type { TalentCompensationAsk } from "@/lib/rnd/discovery.schemas";
import {
  formatEquityBasisPointsRange,
  formatMonthlySalaryRange,
  formatOneTimeAmountRange,
} from "@/lib/rnd/format";
import type { OpenRoleCompensationStrand } from "@/lib/rnd/shared.schemas";

type CompensationKind = "salary" | "one_time" | "equity";

export const COMPENSATION_KIND_LABELS: Record<CompensationKind, string> = {
  salary: "Salary",
  one_time: "One-time",
  equity: "Equity",
};

// Canonical per-kind chip colors — matches the research-program contributor chips so a
// compensation kind reads the same everywhere in the app.
const COMPENSATION_KIND_BADGE_CLASS: Record<CompensationKind, string> = {
  salary: "bg-[#D6E3FF] text-blue-900",
  one_time: "bg-amber-100 text-amber-800",
  equity: "bg-[#00696E]/10 text-[#00696E]",
};

/**
 * The amount for one strand of a ROLE's offer.
 *
 * The backend returns the raw `open_role_compensation` row — every money column present
 * and null for the kinds that don't use it — so this reads the columns matching `kind`.
 * A DB CHECK guarantees the others are null, and the `?? 0` fallbacks exist only to
 * keep the types honest; they are unreachable for a well-formed row.
 */
function formatRoleStrandAmount(strand: OpenRoleCompensationStrand, currency: string): string {
  switch (strand.kind) {
    case "salary":
      return formatMonthlySalaryRange(
        strand.salaryMinInCentsPerMonth ?? 0,
        strand.salaryMaxInCentsPerMonth,
        currency,
      );
    case "one_time":
      return formatOneTimeAmountRange(
        strand.oneTimeMinInCents ?? 0,
        strand.oneTimeMaxInCents,
        currency,
      );
    case "equity":
      return formatEquityBasisPointsRange(
        strand.equityBasisPointsMin ?? 0,
        strand.equityBasisPointsMax,
      );
    default: {
      const exhaustiveCheck: never = strand.kind;
      return exhaustiveCheck;
    }
  }
}

/**
 * The amount for one strand of a PERSON's ask. A real discriminated union, unlike the
 * role strand, so each branch sees only the fields its kind carries — and `equity`
 * genuinely has no currency, because basis points are dimensionless.
 */
function formatTalentAskAmount(ask: TalentCompensationAsk): string {
  switch (ask.kind) {
    case "salary":
      return formatMonthlySalaryRange(
        ask.salaryMinInCentsPerMonth,
        ask.salaryMaxInCentsPerMonth,
        ask.currency,
      );
    case "one_time":
      return formatOneTimeAmountRange(ask.oneTimeMinInCents, ask.oneTimeMaxInCents, ask.currency);
    case "equity":
      return formatEquityBasisPointsRange(ask.equityBasisPointsMin, ask.equityBasisPointsMax);
    default: {
      const exhaustiveCheck: never = ask;
      return exhaustiveCheck;
    }
  }
}

function CompensationBadge({ kind, amountLabel }: { kind: CompensationKind; amountLabel: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPENSATION_KIND_BADGE_CLASS[kind]}`}
    >
      {amountLabel} {COMPENSATION_KIND_LABELS[kind]}
    </span>
  );
}

/**
 * Colored amount+kind chips for a blended offer, e.g. "$4,000–$6,000/mo Salary" +
 * "2%–4% Equity". Colorblind-safe: the kind is carried by both the word and the color.
 * Returns a bare fragment so the parent keeps its own flex-wrap container.
 */
export default function CompensationBadges({
  strands,
  currency,
}: {
  strands: OpenRoleCompensationStrand[];
  currency: string;
}) {
  return (
    <>
      {strands.map((strand) => (
        <CompensationBadge
          key={strand.kind}
          kind={strand.kind}
          amountLabel={formatRoleStrandAmount(strand, currency)}
        />
      ))}
    </>
  );
}

/** The talent-profile counterpart — same chips, over the ask union. */
export function TalentCompensationAskBadges({ asks }: { asks: TalentCompensationAsk[] }) {
  return (
    <>
      {asks.map((ask) => (
        <CompensationBadge
          key={ask.kind}
          kind={ask.kind}
          amountLabel={formatTalentAskAmount(ask)}
        />
      ))}
    </>
  );
}

/** "Salary + Equity" — a one-line summary of which kinds an offer blends. */
export function summarizeCompensationKinds(
  strands: readonly { readonly kind: CompensationKind }[],
): string {
  return strands.map((strand) => COMPENSATION_KIND_LABELS[strand.kind]).join(" + ");
}
