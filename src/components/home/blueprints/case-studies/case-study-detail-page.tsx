// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.

import { notFound } from "next/navigation";

import BlueprintAuthorLine from "@/components/home/blueprints/sections/blueprint-author-line";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DISCIPLINE_NUMERAL_CLASSES,
  formatBlueprintMetricValue,
  formatConceptNumberLabel,
} from "@/lib/blueprints/format";
import { BLUEPRINT_DISCIPLINE_LABELS } from "@/lib/blueprints/schemas";
import { formatCountLabel } from "@/lib/store/format";

export default async function CaseStudyDetailPage({ slug }: { slug: string }) {
  const caseStudy = await getBlueprintByCategory("case_study", slug);
  if (caseStudy === null) notFound();

  return (
    <article className="px-4 pt-5 pb-12 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#6F7979] uppercase">
            {BLUEPRINT_DISCIPLINE_LABELS[caseStudy.discipline]}
          </p>
          <h1 className="mt-1 max-w-2xl text-xl font-medium text-foreground lg:text-2xl">
            {caseStudy.title}
          </h1>
        </div>
        <p
          className={`font-serif text-5xl leading-none ${BLUEPRINT_DISCIPLINE_NUMERAL_CLASSES[caseStudy.discipline]}`}
        >
          {formatConceptNumberLabel(caseStudy.conceptNumber)}
        </p>
      </div>

      {/* The lede — the single sentence the index card carries, set larger here because it is the
          claim the rest of the page argues for. */}
      <p className="mt-5 max-w-2xl font-serif text-2xl leading-snug text-foreground">
        {caseStudy.oneLineDefinition}
      </p>

      <BlueprintAuthorLine author={caseStudy.author} />

      <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground">{caseStudy.summary}</p>

      {caseStudy.takeaways.length === 0 ? null : (
        <section className="mt-8 max-w-2xl">
          <h2 className="text-sm font-medium text-foreground">Takeaways</h2>
          <ul className="mt-2 space-y-2">
            {caseStudy.takeaways.map((takeaway) => (
              <li
                key={takeaway}
                className="border-l-2 border-[#00696E]/30 pl-3 text-sm leading-6 text-foreground"
              >
                {takeaway}
              </li>
            ))}
          </ul>
        </section>
      )}

      {caseStudy.outcomeMetrics.length === 0 ? null : (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-foreground">Outcome</h2>
          {/* Each value is formatted by its own kind — a count, an amount in cents and a basis-point
              percentage are three different renderings, which is why the wire carries the kind. */}
          <dl className="mt-2 grid max-w-2xl gap-4 sm:grid-cols-3">
            {caseStudy.outcomeMetrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-[#CAC4D0]/60 px-3 py-2.5">
                <dt className="text-[11px] tracking-[0.5px] text-[#6F7979] uppercase">
                  {metric.label}
                </dt>
                <dd className="mt-1 text-lg font-medium text-foreground">
                  {formatBlueprintMetricValue(metric.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {caseStudy.furtherReading.length === 0 ? null : (
        <section className="mt-8 max-w-2xl">
          <h2 className="text-sm font-medium text-foreground">Further reading</h2>
          <ul className="mt-2 space-y-1.5">
            {caseStudy.furtherReading.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#00696E] hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BlueprintTagList tags={caseStudy.tags} />

      <p className="mt-6 text-[11px] text-[#6F7979]">
        {formatCountLabel(caseStudy.viewCount)} views · {formatCountLabel(caseStudy.likeCount)}{" "}
        likes
      </p>
    </article>
  );
}
