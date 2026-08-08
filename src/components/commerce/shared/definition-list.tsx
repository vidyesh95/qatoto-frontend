// TRANSPORT: props-only — renders terms it is handed, no network.
//
// Commercial terms as label/value pairs. Twelve of the new surfaces render one — order
// detail, quote detail, RFQ detail, engagement detail, offering detail, checkout summary —
// and without a shared component they become twelve `<dl>` grids that diverge on the two
// things that actually matter: how a null renders, and what happens on a narrow screen.
//
// `src/components/commerce/` and not `home/store/` or `studio/commerce/`, because these
// components are mounted by BOTH — four detail routes are the same endpoint read by a buyer
// and by a counterparty. A studio page importing from "home" would be a lie about ownership,
// and the inverse is the same lie.
//
// EVERYTHING UNDER `src/components/commerce/**` USES SEMANTIC TOKENS, not the store's
// hardcoded Material-3 hexes. It has to pick one: store and R&D use `#00696E`/`#6F7979`,
// studio uses `bg-primary`/`text-muted-foreground`, and a component rendered in both cannot
// carry two palettes without a `tone` prop that would double every class string in the
// largest components on the surface. Tokens win because they follow dark mode; the store
// pages accept them.

import type { ReactNode } from "react";

export interface DefinitionListItem {
  readonly term: string;
  /**
   * Already-formatted content. Pass `null` for a term the record genuinely does not carry,
   * so this component can decide how an absence reads — not the twelve callers, one of
   * which would eventually decide it reads as `0` or `—` or `"N/A"`.
   */
  readonly value: ReactNode | null;
}

/**
 * A term/value block that stays readable at every width.
 *
 * TWO COLUMNS ON WIDE, STACKED PAIRS ON NARROW — never a horizontal scroll and never a
 * hidden column. A commercial term the buyer cannot see is the one they dispute later, so
 * "Incoterm" and "Payment terms" must survive a phone in portrait.
 *
 * A `null` value renders "Not provided" and the term still renders. Dropping the row would
 * make an unstated Incoterm indistinguishable from a record that has no Incoterm field at
 * all — and on an order, "the seller did not state this" is itself the fact worth showing.
 * A zero is NOT an absence: `0` is a real answer and prints as `0`.
 */
export default function DefinitionList({ items }: { items: readonly DefinitionListItem[] }) {
  if (items.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,14rem)_1fr]">
      {items.map((item) => (
        <div key={item.term} className="contents">
          <dt className="text-xs font-medium tracking-[0.4px] text-muted-foreground sm:pt-0.5">
            {item.term}
          </dt>
          <dd className="mb-2 text-sm text-foreground sm:mb-0">
            {item.value === null ? (
              <span className="text-muted-foreground">Not provided</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
