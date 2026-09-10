// TRANSPORT: props-only — three links over the `searchParams` the page already read.

import Link from "next/link";

import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import {
  DEFAULT_TEARDOWN_VIEW,
  TEARDOWN_VIEW_LABELS,
  TEARDOWN_VIEW_QUERY_KEY,
  TEARDOWN_VIEW_QUESTIONS,
  TEARDOWN_VIEWS,
  type TeardownView,
} from "@/lib/blueprints/teardown-views";

/**
 * THE DENSITY SWITCH: business, engineering, factory.
 *
 * ⚠️ THREE LINKS, NOT A CLIENT TOGGLE, and that is the load-bearing decision rather than an
 * implementation detail. `?view=factory` is a URL a founder sends to the shop that is going to make
 * the thing, and it lands them in the reading they need with nothing to click. Client state would
 * also mean this page shipped JavaScript to answer a question the server already knows the answer
 * to — the hub ships none of its own and this surface keeps that property.
 *
 * ⚠️ NO VIEW HIDES A FACT THE OTHERS SHOW. The three reorder sections and decide which disclosures
 * start open; none of them withholds anything. A view that withheld something would turn a reading
 * preference into an access control, and a reader who switched would have to wonder what they had
 * been missing in the one they started in.
 *
 * ⚠️ THE DEFAULT VIEW IS WRITTEN OUT OF THE URL, not into it. `buildFilterHref` drops a key whose
 * value is `undefined`, so choosing Business returns to the canonical `/blueprints/teardowns/<slug>`
 * rather than pinning `?view=business` on it. Two URLs for one page is what a canonical tag exists
 * to clean up after, and not minting the second one is cheaper than declaring it away.
 *
 * PILL GEOMETRY BECAUSE THE PILL MEANS PRESSABLE (`docs/Design.md` §5), and the active one takes
 * `Surface Wash` with `aria-current="page"` — the same active treatment the sidebar uses, so the
 * state is not carried by the tint alone.
 */
export default function TeardownViewSwitch({
  searchParams,
  activeView,
}: {
  readonly searchParams: RawSearchParams;
  readonly activeView: TeardownView;
}) {
  return (
    <div className="mt-4">
      <nav aria-label="Reading view" className="flex flex-wrap items-center gap-1">
        {TEARDOWN_VIEWS.map((view) => {
          const isActive = view === activeView;

          return (
            <Link
              key={view}
              href={buildFilterHref(searchParams, {
                [TEARDOWN_VIEW_QUERY_KEY]: view === DEFAULT_TEARDOWN_VIEW ? undefined : view,
              })}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${
                isActive
                  ? "bg-primary text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {TEARDOWN_VIEW_LABELS[view]}
            </Link>
          );
        })}
      </nav>
      {/*
        THE QUESTION THIS VIEW ANSWERS, one line, changing with the selection. Same device the hub's
        lanes use: a reader arrives with a question, and the control that would answer it should say
        so rather than making them try all three.
      */}
      <p className="mt-1.5 text-xs text-muted-foreground">{TEARDOWN_VIEW_QUESTIONS[activeView]}</p>
    </div>
  );
}
