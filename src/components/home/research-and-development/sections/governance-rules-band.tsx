import type { GovernanceDisclosureKey } from "@/types/research-and-development";

// The three rules arrive as KEYS, never as server prose, so each client renders
// them in its own locale. Each one has a statute behind it, which is why none of
// them is negotiable copy:
// - the platform holds no funds, because holding them is regulated money
//   movement in the EU, US and India;
// - a verification verdict never reduces cash, because gating a wage on an
//   automated verdict is unlawful withholding;
// - a statement is gross, because Qatoto is not a payroll processor.
const GOVERNANCE_DISCLOSURES: Record<GovernanceDisclosureKey, { title: string; body: string }> = {
  platform_holds_no_funds: {
    title: "Qatoto holds no funds and charges nobody",
    body: "A pledge is a commitment, not a payment. No money moves through Qatoto, nothing is held in escrow, and there is no platform fee on any figure on this page.",
  },
  verification_never_reduces_cash: {
    title: "A verification verdict never reduces cash",
    body: "A flagged claim annotates a compensation line and changes no number on it. Verification gates equity — how much of the pie an hour mints — never a wage.",
  },
  statement_is_gross_only: {
    title: "A statement is gross only",
    body: "No tax, withholding or social contribution is computed or deducted anywhere. Whatever a statement shows is the gross figure the parties settle between themselves.",
  },
};

const DISCLOSURE_RENDER_ORDER: GovernanceDisclosureKey[] = [
  "platform_holds_no_funds",
  "verification_never_reduces_cash",
  "statement_is_gross_only",
];

// Stage 05 rules band. Rendered from the keys the summary payload carries, in a
// fixed order, so a key the backend stops sending simply stops rendering.
export default function GovernanceRulesBand({
  disclosureKeys,
}: {
  disclosureKeys: GovernanceDisclosureKey[];
}) {
  const visibleDisclosureKeys = DISCLOSURE_RENDER_ORDER.filter((disclosureKey) =>
    disclosureKeys.includes(disclosureKey),
  );

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <h2 className="text-sm font-medium tracking-wide xl:text-lg">The rules, stated publicly</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        {visibleDisclosureKeys.map((disclosureKey) => (
          <div key={disclosureKey} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <p className="font-medium">{GOVERNANCE_DISCLOSURES[disclosureKey].title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {GOVERNANCE_DISCLOSURES[disclosureKey].body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
