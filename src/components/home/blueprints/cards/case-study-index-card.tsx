// TRANSPORT: props-only — the case study arrives from `case-studies-index-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Link from "next/link";

import {
  BLUEPRINT_DISCIPLINE_NUMERAL_CLASSES,
  BLUEPRINT_DISCIPLINE_TINT_CLASSES,
  formatConceptNumberLabel,
} from "@/lib/blueprints/format";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  buildBlueprintHref,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";

/**
 * One case study in the index.
 *
 * A NUMBERED, TINTED, TYPESET CARD — NOT A THUMBNAIL. A manufacturing lesson has no photograph
 * worth showing; what it has is a name, a number and one sentence. Colour-coding by discipline is
 * what lets a reader scan five of these and find the supply-chain one without reading any of them.
 *
 * The composition is `pipeline-stages-strip.tsx:85-106` (numeral top-right in the serif face, over
 * a tinted card) with the eyebrow and serif title from `how-qatoto-works.tsx:163-181`. Both tint
 * records are literal class strings, for the reason `pipeline-stages-strip.tsx:63-67` gives:
 * Tailwind only sees classes it can read in the source.
 */
export default function CaseStudyIndexCard({ caseStudy }: { caseStudy: CaseStudyBlueprint }) {
  return (
    <Link
      href={buildBlueprintHref(caseStudy)}
      className={`flex flex-col rounded-2xl border p-6 transition-colors hover:border-[#00696E]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${BLUEPRINT_DISCIPLINE_TINT_CLASSES[caseStudy.discipline]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium tracking-[0.2em] text-foreground/70 uppercase">
          {BLUEPRINT_DISCIPLINE_LABELS[caseStudy.discipline]}
        </span>
        <span
          className={`font-serif text-3xl leading-none ${BLUEPRINT_DISCIPLINE_NUMERAL_CLASSES[caseStudy.discipline]}`}
        >
          {formatConceptNumberLabel(caseStudy.conceptNumber)}
        </span>
      </div>

      <h3 className="mt-4 font-serif text-xl leading-tight font-semibold tracking-tight text-foreground">
        {caseStudy.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">
        {caseStudy.oneLineDefinition}
      </p>
    </Link>
  );
}
