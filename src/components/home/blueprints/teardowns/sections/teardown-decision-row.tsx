// TRANSPORT: props-only — every value arrives already formatted or already `null`.

import HairlineDefinitionRow, {
  type HairlineDefinitionFact,
} from "@/components/home/shared/hairline-definition-row";

/**
 * THE FOUR FACTS A FOUNDER CAME FOR, above the fold and before the prose.
 *
 * ⚠️ **THE ROW ITSELF LIVES IN `shared/hairline-definition-row.tsx` NOW.** The Civic Pulse cluster
 * detail needed exactly this shape for exactly the same reason — `docs/Design.md` §6 bans the
 * four-identical-box version of a labelled value list — and two copies of one component is the
 * arrangement where one gets a fix and the other does not. The implementation moved; this stayed as
 * the teardown's own entry point so its caller and its reasoning are untouched. Same precedent as
 * `filter-chip-row.tsx`, which was hoisted out of R&D for the store.
 *
 * ⚠️ AN ABSENT FACT DROPS OUT OF THE ROW ENTIRELY. No dash, no zero, no "not costed" placeholder.
 * `formatCentsRangeLabel` returns `null` for a build nobody priced and `null` renders NO CELL —
 * printing "$0" would say the parts are free, which is a different claim from nobody having added
 * them up. THE FLOOR IS ONE CELL: `thermal-camera-module-teardown` has a null cost range and a null
 * part count, so its row is difficulty alone, and the title above carries the page.
 */
export type TeardownDecisionFact = HairlineDefinitionFact;

export default function TeardownDecisionRow({
  facts,
}: {
  readonly facts: readonly TeardownDecisionFact[];
}) {
  // `mt-4` is this page's spacing, not the row's — see the note on `className` in the shared
  // component. Passing it here keeps the rendered markup byte-identical to what shipped before.
  return <HairlineDefinitionRow facts={facts} className="mt-4" />;
}
