// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` and
// `listRelatedCaseStudies` from `@/lib/blueprints/api`, which serve fixtures from
// `@/mocks/blueprints-mocks`.
//
// A REPORT, NOT AN ESSAY, AND THE SECTION ORDER IS FIXED. Problem, context, what they did, what to
// avoid, the business facts, sources, related lessons — every case study, every time, so a reader
// learns the shape once and can then skip straight to the part they came for. The anchor is an
// accident report: what happened, what was done, what to avoid, sources listed. It reads as a
// record and never as persuasion, which is the lane "startup lessons" reflexively falls into.
//
// ⚠️ NO SERIF ANYWHERE. This page carried two serif blocks — a 5xl numeral and a 2xl lede —
// and `docs/Design.md` §3 is unambiguous: "A serif heading inside `(home)` is a bug." The numeral
// went with the concept number it rendered; the lede is now `oneLineAction`, set in the house sans
// at body size with weight doing the work the face used to.
//
// EVERY OPTIONAL SECTION ABSENT RENDERS NOTHING AT ALL — no heading, no empty box. That is
// PRODUCT.md Principle 2, and the one deliberate exception is documented on `sources` below.

import Link from "next/link";
import { notFound } from "next/navigation";

import BlueprintAuthorLine from "@/components/home/blueprints/sections/blueprint-author-line";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import SpecificationList, {
  type SpecificationRow,
} from "@/components/home/blueprints/sections/specification-list";
import { getBlueprintByCategory, listRelatedCaseStudies } from "@/lib/blueprints/api";
import { formatBlueprintMetricValue } from "@/lib/blueprints/format";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  buildBlueprintHref,
  CASE_STUDY_AUTHOR_RELATIONSHIP_READER_NOTES,
  CASE_STUDY_WITHHELD_COMPANY_LABEL,
  type CaseStudyBlueprint,
} from "@/lib/blueprints/schemas";
import { formatCentsLabel, formatCountLabel } from "@/lib/store/format";

export default async function CaseStudyDetailPage({ slug }: { slug: string }) {
  const caseStudy = await getBlueprintByCategory("case_study", slug);
  if (caseStudy === null) notFound();

  const relatedLessons = await listRelatedCaseStudies(caseStudy.relatedLessonSlugs);

  return (
    <article className="px-4 pt-5 pb-12 lg:px-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#6F7979] uppercase">
          {caseStudy.sector} · {BLUEPRINT_DISCIPLINE_LABELS[caseStudy.discipline]}
        </p>
        <h1 className="mt-1 max-w-2xl text-xl font-medium text-foreground lg:text-2xl">
          {caseStudy.title}
        </h1>

        {/* The imperative the reader can act on. It is the claim the rest of the page argues for,
            so it is set at body size in medium weight rather than given a size of its own — the
            Two-Size Rule, `docs/Design.md` §3. */}
        <p className="mt-4 max-w-2xl text-sm leading-6 font-medium text-foreground">
          {caseStudy.oneLineAction}
        </p>

        {caseStudy.outcomeSummary === null ? null : (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F7979]">
            {caseStudy.outcomeSummary}
          </p>
        )}
      </header>

      <BlueprintAuthorLine author={caseStudy.author} />
      {/* HOW THE WRITER KNOWS THIS, said once under their name, because a figure from somebody who
          was there and a figure retold from a build log are different claims. */}
      <p className="mt-1 text-xs text-[#6F7979]">
        {CASE_STUDY_AUTHOR_RELATIONSHIP_READER_NOTES[caseStudy.authorRelationship]}
      </p>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground">{caseStudy.summary}</p>

      <CaseStudyProse heading="Problem" body={caseStudy.problem} />
      <CaseStudyProse heading="Context" body={caseStudy.context} />

      <CaseStudySteps heading="What they did" items={caseStudy.actionSteps} isOrdered />
      <CaseStudySteps heading="What to avoid" items={caseStudy.pitfalls} isOrdered={false} />

      <BusinessFacts caseStudy={caseStudy} />

      <Sources caseStudy={caseStudy} />

      <RelatedLessons lessons={relatedLessons} />

      <BlueprintTagList tags={caseStudy.tags} />

      <p className="mt-6 text-[11px] text-[#6F7979]">
        {formatCountLabel(caseStudy.viewCount)} views · {formatCountLabel(caseStudy.likeCount)}{" "}
        likes
      </p>
    </article>
  );
}

/** One prose section. An empty body renders nothing, heading included. */
function CaseStudyProse({ heading, body }: { heading: string; body: string }) {
  if (body.length === 0) return null;

  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">{heading}</h2>
      <p className="mt-2 text-sm leading-6 text-foreground">{body}</p>
    </section>
  );
}

/**
 * The two step lists.
 *
 * ORDERED FOR WHAT THEY DID, UNORDERED FOR WHAT TO AVOID, and the difference is a claim rather
 * than a style: the actions happened in that sequence, the pitfalls did not. Numbering a list of
 * mistakes would assert an order nobody recorded.
 */
function CaseStudySteps({
  heading,
  items,
  isOrdered,
}: {
  heading: string;
  items: readonly string[];
  isOrdered: boolean;
}) {
  if (items.length === 0) return null;

  // A BULLET, NOT A MIDDLE DOT, for the unordered list. The `·` was a one-pixel grey speck at 14px
  // and read as no marker at all, so the pitfalls looked like one wrapped paragraph.
  const rows = items.map((item, index) => (
    <li key={item} className="flex gap-3 text-sm leading-6 text-foreground">
      <span className="shrink-0 text-[#6F7979] tabular-nums" aria-hidden="true">
        {isOrdered ? `${index + 1}.` : "•"}
      </span>
      <span>{item}</span>
    </li>
  ));

  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">{heading}</h2>
      {isOrdered ? (
        <ol className="mt-2 space-y-2">{rows}</ol>
      ) : (
        <ul className="mt-2 space-y-2">{rows}</ul>
      )}
    </section>
  );
}

/**
 * The label for a company whose writer withheld its name.
 *
 * ⚠️ NUMBERED WHEN THERE IS MORE THAN ONE, and not for decoration: `SpecificationList` keys its rows by
 * label, so two rows both reading "Name withheld" would collide. One withheld company needs no number.
 */
function buildWithheldCompanyLabel(
  companies: CaseStudyBlueprint["evidenceCompanies"],
  companyIndex: number,
): string {
  const withheldCompanyCount = companies.filter((company) => company.name === null).length;
  if (withheldCompanyCount <= 1) return CASE_STUDY_WITHHELD_COMPANY_LABEL;

  const withheldOrdinal = companies
    .slice(0, companyIndex + 1)
    .filter((company) => company.name === null).length;
  return `${CASE_STUDY_WITHHELD_COMPANY_LABEL} (${withheldOrdinal})`;
}

/**
 * The business facts, as a readout rather than prose.
 *
 * ⚠️ IT REUSES `SpecificationList`, which is already the hairline `<dl>` every other detail layout
 * on this surface renders and which already returns `null` on an empty list. Building a second one
 * here would be two components that must agree about what an absence looks like — the exact reason
 * that file was hoisted in the first place.
 *
 * ROWS ARE FILTERED BEFORE MAPPING, never styled around. A null `timelineLabel` or `capitalRaised`
 * produces no row at all; printing a dash against the label would invent a fact.
 *
 * ⚠️ `capitalRaised` IS AN AMOUNT SOMEBODY RAISED ELSEWHERE. No copy near it may say paid,
 * collected, held, escrowed or processed — Qatoto operates no money rail, and this page is not a
 * record of one.
 */
function BusinessFacts({ caseStudy }: { caseStudy: CaseStudyBlueprint }) {
  const specifications: (SpecificationRow | undefined)[] = [
    caseStudy.timelineLabel === null
      ? undefined
      : { label: "Timeline", value: caseStudy.timelineLabel },
    caseStudy.capitalRaised === null
      ? undefined
      : {
          label: "Capital raised",
          value: formatCentsLabel(
            caseStudy.capitalRaised.amountInCents,
            caseStudy.capitalRaised.currency,
          ),
        },
    ...caseStudy.evidenceCompanies.map((company, companyIndex) => ({
      label: company.name ?? buildWithheldCompanyLabel(caseStudy.evidenceCompanies, companyIndex),
      value: `${company.locationLabel}, ${company.yearLabel}`,
    })),
    // Each value is formatted by its own kind — a count, an amount in cents and a basis-point
    // percentage are three different renderings, which is why the wire carries the kind.
    ...caseStudy.outcomeMetrics.map((metric) => ({
      label: metric.label,
      value: formatBlueprintMetricValue(metric.value),
    })),
  ];

  const rows = specifications.filter((row) => row !== undefined);
  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">The business facts</h2>
      {/* `break-inside-avoid` on each row: CSS columns balance by height and would otherwise break
          INSIDE a row, leaving a label at the foot of one column and its value at the head of the
          next ("Norrfall Bracketworks" / "Gothenburg, 2024" on `aluminium-tool-before-steel`). */}
      <SpecificationList
        specifications={rows}
        className="mt-2 max-w-2xl sm:columns-2 sm:gap-8 [&>div]:break-inside-avoid"
      />
    </section>
  );
}

/**
 * Where the figures came from.
 *
 * ⚠️ THE ONE ABSENCE ON THIS SURFACE THAT RENDERS COPY, AND IT IS A KNOWING DEPARTURE FROM
 * PRODUCT.md PRINCIPLE 2. Everywhere else an empty list renders nothing; here, saying nothing would
 * leave a page of specific figures looking sourced when it is not. PRODUCT.md's own rule is the
 * reason: "An unattributed figure reads as invented on this product, because on comparable products
 * it usually is." Silence is the shape that lets that happen, so the absence is stated out loud.
 */
function Sources({ caseStudy }: { caseStudy: CaseStudyBlueprint }) {
  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">Sources</h2>

      {caseStudy.sources.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-[#6F7979]">No public source for this one.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {caseStudy.sources.map((source) => (
            <li key={source.url} className="text-sm leading-5">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-[#00696E] transition-colors hover:underline"
              >
                {source.label}
              </a>
              <span className="block text-xs text-[#6F7979]">{source.publisherLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Other lessons this one points at.
 *
 * THE SLUGS ARE RESOLVED BY THE GETTER, not here — `listRelatedCaseStudies` drops the ones that no
 * longer exist, so a stale reference is an absence rather than a dead row. This component receives
 * rows or receives nothing.
 */
function RelatedLessons({ lessons }: { lessons: readonly CaseStudyBlueprint[] }) {
  if (lessons.length === 0) return null;

  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">Related lessons</h2>
      <ul className="mt-2">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="border-t border-black/5">
            <Link
              href={buildBlueprintHref(lesson)}
              className="flex items-center justify-between gap-4 py-2.5 text-sm leading-5 text-foreground transition-colors hover:text-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
            >
              {lesson.title}
              {/* The arrow says the row goes somewhere; decorative, so hidden from screen readers,
                  which already announce the row as a link. */}
              <span aria-hidden="true" className="shrink-0 text-[#6F7979]">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
