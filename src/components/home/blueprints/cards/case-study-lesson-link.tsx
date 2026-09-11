// TRANSPORT: props-only — the case study arrives from `blueprints-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Link from "next/link";

import {
  BLUEPRINT_DISCIPLINE_LABELS,
  buildBlueprintHref,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";

/**
 * One lesson in the hub's case-study lane.
 *
 * ⚠️ THE SIBLING OF `CaseStudyLessonRow`, AND IT DOES NOT EXPAND. That is the difference between
 * the two files and the only reason there are two. On the index a row expands in place, because a
 * reader working through a filtered list wants to triage without leaving it. On the hub there are
 * four rows and the lane's job is routing, so the whole row is a link and there is exactly one way
 * through — a `<details>` here would be a second affordance competing with the lane's own.
 *
 * The alternative was one component with an `isExpandable` prop, which would have switched the root
 * element between `<details>` and `<Link>`. A prop that changes what element renders is two
 * components wearing one name, and every style below would have needed to be correct in both.
 *
 * NO SUMMARY, NO ACTION LINE, NO OUTCOME. The teaser carries the lesson and its evidence; the rest
 * is what the index and the record are for. Four of these must fit above the fold beside two other
 * lanes.
 *
 * ⚠️ NO BORDER AND NO GUTTER PADDING OF ITS OWN. The hub's `<ul>` draws the hairlines between rows
 * and `BlueprintLane` owns the gutter, so the rules stop where the text does. The hover fill is
 * pulled 12px into that gutter (`-mx-3 px-3`) so the title keeps its alignment with the lane
 * heading while the pressed area still reads as a row, and `my-1` keeps the rounded fill off the
 * hairlines above and below it.
 */
export default function CaseStudyLessonLink({ caseStudy }: { caseStudy: CaseStudyBlueprint }) {
  const [firstCompany] = caseStudy.evidenceCompanies;

  return (
    <Link
      href={buildBlueprintHref(caseStudy)}
      className="-mx-3 my-1 block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
    >
      <h3 className="text-sm leading-5 font-medium text-foreground">{caseStudy.title}</h3>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        {/* An absent company drops out of the line rather than stranding a separator — the same
            guard `CaseStudyLessonRow` documents, and the reason neither builds this with a
            template literal. */}
        {[
          caseStudy.sector,
          firstCompany === undefined
            ? undefined
            : `${firstCompany.locationLabel}, ${firstCompany.yearLabel}`,
          BLUEPRINT_DISCIPLINE_LABELS[caseStudy.discipline],
        ]
          .filter((part) => part !== undefined)
          .join(" · ")}
      </p>
    </Link>
  );
}
