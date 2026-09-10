// TRANSPORT: props-only — every value arrives already formatted or already `null`.

/**
 * THE FOUR FACTS A FOUNDER CAME FOR, above the fold and before the prose.
 *
 * ⚠️ THIS IS NOT THE HERO-METRIC TEMPLATE AND MUST NOT DRIFT INTO IT. The banned shape is one big
 * number with a small label and supporting stats beside it — a figure sized for persuasion. These
 * are four peers at body size in a hairline row, sized so a reader compares them rather than
 * admires one. `docs/Design.md` names the hero metric as the shape that tells a skeptical backer
 * the product is a deck, and a bill of materials rendered at 48px would be exactly that.
 *
 * ⚠️ AN ABSENT FACT DROPS OUT OF THE ROW ENTIRELY. No dash, no zero, no "not costed" placeholder.
 * `formatCentsRangeLabel` returns `null` for a build nobody priced and `null` renders NO CELL —
 * printing "$0" would say the parts are free, which is a different claim from nobody having added
 * them up. THE FLOOR IS ONE CELL: `thermal-camera-module-teardown` has a null cost range and a null
 * part count, so its row is difficulty alone, and the title above carries the page.
 *
 * A `<dl>`, NOT A GRID OF CARDS. Four labelled values is the definition list this element exists
 * for, and `docs/Design.md` §6 bans the four-identical-box version of the same content.
 */
export interface TeardownDecisionFact {
  readonly label: string;
  /** Already formatted, including its unit. `null` drops the whole cell. */
  readonly value: string | null;
}

export default function TeardownDecisionRow({
  facts,
}: {
  readonly facts: readonly TeardownDecisionFact[];
}) {
  const presentFacts = facts.filter((fact) => fact.value !== null);
  if (presentFacts.length === 0) return null;

  return (
    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-3">
      {presentFacts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
            {fact.label}
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
