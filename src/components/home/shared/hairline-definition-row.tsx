// TRANSPORT: props-only — every value arrives already formatted or already `null`.

/**
 * A row of labelled facts separated by hairlines, not a grid of boxes.
 *
 * ⚠️ **THIS IS NOT THE HERO-METRIC TEMPLATE AND MUST NOT DRIFT INTO IT.** The banned shape is one
 * big number with a small label and supporting stats beside it — a figure sized for persuasion.
 * These are peers at body size in a hairline row, sized so a reader COMPARES them rather than
 * admires one. `docs/Design.md` §6 names the hero metric as the shape that tells a skeptical backer
 * the product is a deck, and bans the four-identical-box version of the same content in the same
 * breath: "If four cards share an icon, a heading and two lines of text, the content wanted a table
 * or a list."
 *
 * ⚠️ **AN ABSENT FACT DROPS OUT OF THE ROW ENTIRELY.** No dash, no zero, no placeholder. §5's Stat
 * Readout is explicit — "Absent value: renders nothing." Printing "$0" for a build nobody costed
 * says the parts are free, which is a different claim from nobody having added them up. **The floor
 * is one cell**, and when every fact is absent the row renders nothing at all rather than an empty
 * rule.
 *
 * ⚠️ **HOISTED FROM `blueprints/teardowns/sections/teardown-decision-row.tsx`, WHICH NOW WRAPS IT.**
 * That component was already this row; a second copy beside it is the shape where one gets a fix
 * and the other does not. `src/components/home/shared/filter-chip-row.tsx` set the precedent — move
 * the implementation here, leave the old path as a named entry point, and its callers never notice.
 *
 * Figures take `tabular-nums` and NOT `font-mono`: `docs/Design.md` §3 reserves Code type for
 * "identifiers, slugs, enum values, cursor tokens, anything that must be copied exactly", and a
 * count is a figure to compare rather than a string to copy. A caller with a genuine identifier —
 * a coordinate, a submission id — renders it in mono itself, outside this row.
 */
export interface HairlineDefinitionFact {
  readonly label: string;
  /** Already formatted, including its unit. `null` drops the whole cell. */
  readonly value: string | null;
}

export default function HairlineDefinitionRow({
  facts,
  className,
}: {
  readonly facts: readonly HairlineDefinitionFact[];
  /**
   * Spacing only, for the caller's own flow.
   *
   * It exists because the teardown page needs `mt-4` and the cluster detail sits in a `space-y-6`
   * stack that provides its own. It is NOT a restyling hook: the border, the type sizes and the
   * absent-value rule are this component's business, and a caller overriding them would be
   * rebuilding the banned shape through the back door.
   */
  readonly className?: string;
}) {
  const presentFacts = facts.filter((fact) => fact.value !== null);
  if (presentFacts.length === 0) return null;

  return (
    <dl
      className={`flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-3${
        className === undefined ? "" : ` ${className}`
      }`}
    >
      {presentFacts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-xs tracking-wider text-muted-foreground uppercase">{fact.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
