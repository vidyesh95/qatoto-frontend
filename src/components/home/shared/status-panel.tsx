// TRANSPORT: props-only — renders copy it is handed, no network.
//
// The bordered panel every list surface shows instead of rows: loading, failed, empty,
// signed-out, not-a-member. There were TWO copies of this before — one module-local in
// `src/components/studio/pages/products-page.tsx` and one exported for R&D — and a third
// was about to appear under store. This is the hoist.
//
// `className` rather than a `tone` enum, because the two palettes in this codebase are
// genuinely different vocabularies and not two values of one: studio uses semantic tokens
// (`border-border`, `text-muted-foreground`) that follow dark mode, while store and R&D use
// hardcoded Material-3 hexes that do not. A `tone` prop would have to encode both, and
// every future surface would have to pick one from a list that explains nothing. A wrapper
// per surface supplies its own default and the choice is made once, in one place.

import type { ReactNode } from "react";

const BASE_PANEL_CLASS = "flex flex-col items-center gap-4 rounded-2xl text-center";

/**
 * A neutral panel standing in for content.
 *
 * `message` is a full sentence — this component never composes copy, because a panel that
 * builds its own message ends up saying "No results found." on a failed request. The
 * caller knows which of the five states it is in; this only knows how to look.
 *
 * `action` is the way out, when there is one. Omit it for a state the visitor cannot act
 * on: a loading panel with a button is a trap, and an empty catalog offers nothing to
 * clear.
 */
export default function StatusPanel({
  message,
  action,
  className = "border border-border px-6 py-16",
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${BASE_PANEL_CLASS} ${className}`}>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
