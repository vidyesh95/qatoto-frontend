import type { CompensationComponent, CompensationKind } from "@/types/research-and-development";

export const COMPENSATION_KIND_LABELS: Record<CompensationKind, string> = {
  salary: "Salary",
  "one-time": "One-time",
  equity: "Equity",
};

// Canonical per-kind chip colors — matches the Immortal contributor chips so a
// compensation kind reads the same everywhere in the app.
const COMPENSATION_KIND_BADGE_CLASS: Record<CompensationKind, string> = {
  salary: "bg-[#D6E3FF] text-blue-900",
  "one-time": "bg-amber-100 text-amber-800",
  equity: "bg-[#00696E]/10 text-[#00696E]",
};

// Colored amount+kind chips for a blended compensation offer/ask, e.g.
// "$4k–6k/mo Salary" + "2–4% Equity". Colorblind-safe: the kind is carried by
// both the word and the color. Returns a bare fragment so the parent keeps its
// own flex-wrap container.
export default function CompensationBadges({
  components,
}: {
  components: CompensationComponent[];
}) {
  return (
    <>
      {components.map((component) => (
        <span
          key={component.kind}
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMPENSATION_KIND_BADGE_CLASS[component.kind]}`}
        >
          {component.amountLabel} {COMPENSATION_KIND_LABELS[component.kind]}
        </span>
      ))}
    </>
  );
}

// "Salary + Equity" — a one-line summary of which kinds an offer blends.
export function summarizeCompensationKinds(components: CompensationComponent[]): string {
  return components.map((component) => COMPENSATION_KIND_LABELS[component.kind]).join(" + ");
}
