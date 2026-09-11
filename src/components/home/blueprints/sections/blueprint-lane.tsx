// TRANSPORT: props-only — the lane's contents arrive already fetched from `blueprints-page`.

import Link from "next/link";

import {
  BLUEPRINT_CATEGORY_LANE_HEADINGS,
  BLUEPRINT_CATEGORY_QUESTIONS,
  type BlueprintCategory,
  buildBlueprintCategoryHref,
} from "@/lib/blueprints/schemas";

/**
 * The shell around one hub lane: a heading, the question that lane answers, and one way through.
 *
 * ⚠️ IT IS A SHELL AND NOT A RAIL, WHICH IS THE WHOLE REDESIGN. `BlueprintRail` rendered all three
 * arms identically — a horizontal scroller of identical `BlueprintCard`s — and `docs/Design.md` §6
 * names that shape twice: "Don't repeat an identical card grid. If four cards share an icon, a
 * heading and two lines of text, the content wanted a table or a list", and "no three identical
 * icon-and-heading cards". Three arms that answer three different questions were being browsed the
 * same way, so the hub read as one content feed instead of three tools.
 *
 * THE CHILDREN ARE THE ARM'S OWN SHAPE, and this component deliberately does not constrain them: a
 * teardown previews as a thumbnail grid because "what is it" is a picture, a case study as a line
 * of text because "what did they learn" is a sentence, a showcase as a dated row because "what's
 * new" is a chronology. A reader knows which lane they are in before reading a word.
 *
 * ONE WAY THROUGH, AND IT IS THE HEADING. The "See all" link is the same destination as the
 * heading, placed where the eye finishes the row rather than repeated as a second call to action at
 * the foot of the lane — `docs/Design.md` §6 bans "a second call to action that repeats the first".
 * Both are one `buildBlueprintCategoryHref`, never a hand-built path.
 *
 * ⚠️ THE LANE OWNS THE GUTTER AND THE RULE, SO CHILDREN CARRY NO HORIZONTAL PADDING. Each lane opens
 * on a 1px hairline inset to the page gutter, which is the section rule of a spec sheet and the
 * Hairline-First Rule doing the work a heading background or a shadow would otherwise do. The
 * case-study rows used to run their hairlines full-bleed past the gutter while the teardown grid
 * above them stopped at it, so the hub had two different right edges.
 *
 * THE QUESTION ALWAYS SITS UNDER THE HEADING, never on its baseline. It was tried inline, and from
 * `xl` two lanes share a row: at 1440 the case-study question overflowed its half column and wrapped
 * while the showcase question beside it did not, so two headers in one row had two shapes. A header
 * whose shape depends on the length of its copy is not a header shape.
 */
export default function BlueprintLane({
  category,
  seeAllLabel,
  children,
}: {
  readonly category: BlueprintCategory;
  /** e.g. "See all 12 teardowns" — the count is the caller's, which has the full list. */
  readonly seeAllLabel: string;
  readonly children: React.ReactNode;
}) {
  const categoryHref = buildBlueprintCategoryHref(category);
  const headingId = `blueprint-lane-${category}`;

  return (
    <section aria-labelledby={headingId} className="min-w-0 px-4 lg:px-6">
      <header className="border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id={headingId}
            className="min-w-0 text-lg leading-7 font-medium tracking-tight text-foreground"
          >
            <Link
              href={categoryHref}
              className="transition-colors hover:text-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
            >
              {BLUEPRINT_CATEGORY_LANE_HEADINGS[category]}
            </Link>
          </h2>

          <Link
            href={categoryHref}
            className="flex shrink-0 items-center gap-1 text-sm leading-5 font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
          >
            {seeAllLabel}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          {BLUEPRINT_CATEGORY_QUESTIONS[category]}
        </p>
      </header>

      <div className="mt-4">{children}</div>
    </section>
  );
}
