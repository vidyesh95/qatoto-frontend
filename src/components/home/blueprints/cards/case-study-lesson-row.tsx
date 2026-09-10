// TRANSPORT: props-only — the case study arrives from `case-studies-index-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Link from "next/link";

import {
  BLUEPRINT_DISCIPLINE_LABELS,
  buildBlueprintHref,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";

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
 * `outcomeSummary` NULL RENDERS NOTHING — not "Unknown", not a dash. There is no outcome enum on
 * this surface and the schema records the argument at length.
 */
export default function CaseStudyLessonRow({ caseStudy }: { caseStudy: CaseStudyBlueprint }) {
  const evidenceLabel = buildEvidenceLabel(caseStudy);

  return (
    <details className="group/lesson border-t border-black/5 transition-colors open:bg-muted/30 hover:bg-muted/50">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] lg:px-6 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="text-sm leading-5 font-medium text-foreground">{caseStudy.title}</h3>
          <p className="mt-1 text-xs leading-4 text-[#6F7979]">{evidenceLabel}</p>
        </div>

        {caseStudy.outcomeSummary === null ? null : (
          <span className="hidden shrink-0 text-xs leading-4 font-medium text-foreground/70 sm:block sm:max-w-48 sm:text-right">
            {caseStudy.outcomeSummary}
          </span>
        )}
      </summary>

      <div className="px-4 pb-4 lg:px-6">
        <p className="max-w-2xl text-sm leading-5 font-medium text-foreground">
          {caseStudy.oneLineAction}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-5 text-[#6F7979]">{caseStudy.summary}</p>

        <Link
          href={buildBlueprintHref(caseStudy)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Read the full record
          <span aria-hidden="true">&rarr;</span>
        </Link>
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
function buildEvidenceLabel(caseStudy: CaseStudyBlueprint): string {
  const [firstCompany] = caseStudy.evidenceCompanies;

  const parts = [
    caseStudy.sector,
    firstCompany === undefined
      ? undefined
      : `${firstCompany.locationLabel}, ${firstCompany.yearLabel}`,
    BLUEPRINT_DISCIPLINE_LABELS[caseStudy.discipline],
  ];

  return parts.filter((part) => part !== undefined).join(" · ");
}
