// TRANSPORT: props-only — the case study arrives from `case-studies-index-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import { BLUEPRINT_DISCIPLINE_LABELS, type CaseStudyBlueprint } from "@/lib/blueprints/schemas";

/**
 * One lesson in the case-study index.
 *
 * ⚠️ IT REPLACED `CaseStudyIndexCard`, A NUMBERED SERIF CARD IN A DISCIPLINE-TINTED GRID. That
 * design was three `docs/Design.md` violations standing together, which is why none of it survived
 * rather than being toned down:
 *
 * - §6 — "Don't repeat an identical card grid. If four cards share an icon, a heading and two lines
 *   of text, the content wanted a table or a list." Five tinted tiles of eyebrow + numeral + title +
 *   sentence is precisely that, and the content did want a list.
 * - §3, The Serif Boundary — "A serif heading inside `(home)` is a bug." There were two here.
 * - §2, The One Hue Rule — "Every meaningful colour in this system lives between 196 and 201
 *   degrees." The tint map carried five hues, four of them invented for this one grid.
 *
 * A LESSON IS A SENTENCE, SO THE ROW LEADS WITH THE SENTENCE. The title is an imperative the reader
 * can act on, and everything else on the collapsed row is evidence for it: who it happened to, what
 * came of it. That is the whole reason the index reads as a reference rather than a feed.
 *
 * ⚠️ NATIVE `<details>`, NOT A CLIENT ISLAND. Click and Enter both toggle, `aria-expanded` is the
 * element's own, and no height is animated — `docs/Design.md` §6 bans animating a layout property,
 * and the cheapest way to obey that is to use the element the browser already animates correctly.
 * The house precedent is eight `<details>` blocks across `store/sections/*` and
 * `research-and-development/cards/daily-log-card.tsx`. This file ships zero JavaScript.
 *
 * ⚠️ THE LINK IS INSIDE THE PANEL, NEVER INSIDE `<summary>`. A `<summary>` is already an
 * interactive element; a link within it is nested interactive content, and a reader who meant to
 * expand the row navigates away instead. One row, one toggle, one way through.
 *
 * ⚠️ THE OUTCOME IS A COLUMN AT A FIXED POSITION, NOT PINNED TO THE RIGHT EDGE. It used to be
 * `justify-between` + `text-right`, so at 1440 it sat 427 to 643px from the title it belongs to,
 * ragged-left and wrapped to two lines in a 192px box — a reader had to carry the lesson across half
 * the screen to find what came of it. The summary is now a four-track grid: the title capped at
 * 36rem, the outcome in a 16rem column that starts at the same x on every row, a spacer, and the
 * disclosure glyph at the far edge. Rows read as a two-column ledger, lesson and outcome.
 *
 * THE GLYPH IS THE ONLY SIGN THE ROW OPENS, and the row had none. `group-open` flips it with no
 * transition, because motion here would be decoration on a state change the panel already shows.
 *
 * ⚠️ NO BORDER AND NO GUTTER PADDING OF ITS OWN. The index's `<ul>` draws the hairlines and owns the
 * gutter, the same construction as the hub's `CaseStudyLessonLink`; the hover and open fills are
 * pulled 12px into that gutter so the title stays aligned with the page heading.
 *
 * `outcomeSummary` NULL RENDERS NOTHING — not "Unknown", not a dash. There is no outcome enum on
 * this surface and the schema records the argument at length.
 */
export type CaseStudyLessonRowFields = Pick<
  CaseStudyBlueprint,
  | "title"
  | "sector"
  | "discipline"
  | "evidenceCompanies"
  | "outcomeSummary"
  | "oneLineAction"
  | "summary"
>;

/**
 * ⚠️ THE ROW TAKES ONLY THE FIELDS IT RENDERS, PLUS ITS LINK, so the case-study form can preview a
 * lesson with this exact component rather than a copy of its classes. A preview has no record to
 * open, so `recordHref` is `null` there and the panel carries no link; the index always passes one.
 */
export default function CaseStudyLessonRow({
  lesson,
  recordHref,
}: {
  readonly lesson: CaseStudyLessonRowFields;
  readonly recordHref: string | null;
}) {
  const evidenceLabel = buildEvidenceLabel(lesson);

  return (
    <details className="group/lesson -mx-3 my-1 rounded-lg px-3 transition-colors open:bg-muted/40 hover:bg-muted/50">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] sm:grid-cols-[minmax(0,36rem)_16rem_minmax(0,1fr)_auto] sm:gap-x-6 [&::-webkit-details-marker]:hidden">
        <div className="col-start-1 row-start-1 min-w-0">
          <h3 className="text-sm leading-5 font-medium text-foreground">{lesson.title}</h3>
          <p className="mt-1 text-xs leading-4 text-[#6F7979]">{evidenceLabel}</p>
        </div>

        {lesson.outcomeSummary === null ? null : (
          <span className="col-start-2 row-start-1 hidden pt-0.5 text-xs leading-4 font-medium text-foreground/70 sm:block">
            {lesson.outcomeSummary}
          </span>
        )}

        {/* Placed explicitly, so a row with no outcome does not pull the glyph into the outcome
            column and break the right edge every other row keeps. */}
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
          className="col-start-2 row-start-1 size-5 opacity-50 group-open/lesson:rotate-180 sm:col-start-4"
        />
      </summary>

      <div className="pb-4">
        <p className="max-w-2xl text-sm leading-5 font-medium text-foreground">
          {lesson.oneLineAction}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-5 text-[#6F7979]">{lesson.summary}</p>

        {recordHref === null ? null : (
          <Link
            href={recordHref}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
          >
            Read the full record
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </details>
  );
}

/**
 * The evidence line under the lesson: sector, where and when it happened, and the discipline.
 *
 * ⚠️ IT SKIPS AN EMPTY `evidenceCompanies`, so the separators cannot strand. A row that reads
 * "Hardware ·  · Unit economics" is the failure this exists to avoid, and it is the one an
 * unconditional template string produces the first time a lesson has no company behind it.
 *
 * ONLY THE FIRST COMPANY IS NAMED. A lesson drawn from three businesses is still one lesson, and
 * three names in a 12px line is a list where the reader wanted a label — the detail page carries
 * the full set as a readout, which is where a list belongs.
 */
function buildEvidenceLabel(lesson: CaseStudyLessonRowFields): string {
  const [firstCompany] = lesson.evidenceCompanies;

  const parts = [
    lesson.sector,
    firstCompany === undefined
      ? undefined
      : `${firstCompany.locationLabel}, ${firstCompany.yearLabel}`,
    BLUEPRINT_DISCIPLINE_LABELS[lesson.discipline],
  ];

  // An empty sector is dropped too: the form's preview renders this row while the field is blank.
  return parts.filter((part) => part !== undefined && part !== "").join(" · ");
}
