// TRANSPORT: props-only — a server component over authored constants. Fetches nothing.

import Link from "next/link";
import {
  RoadmapCallToActionSection,
  RoadmapDestinationCard,
  RoadmapHeroSection,
  RoadmapLegend,
  RoadmapReferenceSection,
  RoadmapWhatThisIsSection,
  RoadmapWhatYouCanDoSection,
} from "@/components/information/roadmap-sections";
import { SITE_ROADMAP_MILESTONES } from "@/lib/roadmap/site-roadmap";

export default function Roadmap() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <RoadmapHeroSection />
      <RoadmapWhatThisIsSection />
      <RoadmapWhatYouCanDoSection />

      <nav aria-label="Roadmap stages" className="mx-auto max-w-6xl px-6 pb-16">
        <ul className="flex flex-wrap justify-center gap-2">
          <li>
            <a
              href="#what-this-is"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <span className="font-mono text-xs text-muted-foreground">·</span>
              What it is
            </a>
          </li>
          <li>
            <a
              href="#what-you-can-do"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <span className="font-mono text-xs text-muted-foreground">·</span>
              What you can do
            </a>
          </li>
          {SITE_ROADMAP_MILESTONES.map((milestone) => (
            <li key={milestone.id}>
              <a
                href={`#${milestone.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {milestone.stageLabel}
                </span>
                {milestone.title}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#reference"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <span className="font-mono text-xs text-muted-foreground">·</span>
              Reference
            </a>
          </li>
        </ul>

        <RoadmapLegend />
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        {/*
          The trunk. One element, two positions: hard left on a phone (so the milestones read as an
          indented list) and dead centre from `md` up (so the clusters can alternate around it).
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-6 bottom-6 left-8 w-px border-l border-dashed border-border md:left-1/2"
        />

        <ol className="space-y-16 md:space-y-10">
          {SITE_ROADMAP_MILESTONES.map((milestone, index) => {
            // Alternating sides give the map its zig-zag. The connector offset flips with it, and
            // both class strings are written out in full so Tailwind's scanner can see them.
            const isClusterOnRight = index % 2 === 0;
            const clusterSideClassName = isClusterOnRight
              ? "md:col-start-3 md:before:-left-10"
              : "md:col-start-1 md:before:-right-10";

            return (
              <li
                key={milestone.id}
                id={milestone.id}
                className="scroll-mt-24 pl-16 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-x-10 md:pl-0"
              >
                <div className="relative md:col-start-2 md:row-start-1 md:w-72">
                  <span
                    aria-hidden
                    className="absolute top-6 -left-10 size-3 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background md:hidden"
                  />
                  <Link
                    href={milestone.entryHref}
                    className="block rounded-3xl border border-border bg-card p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="font-serif text-4xl font-semibold tracking-tight text-foreground/30">
                      {milestone.stageLabel}
                    </span>
                    <span className="mt-2 block font-serif text-2xl font-semibold tracking-tight">
                      {milestone.title}
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-muted-foreground">
                      {milestone.summary}
                    </span>
                  </Link>
                </div>

                <div
                  className={`relative mt-6 before:absolute before:top-8 before:hidden before:w-10 before:border-t before:border-dashed before:border-border md:row-start-1 md:mt-0 md:before:block ${clusterSideClassName}`}
                >
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {milestone.destinations.map((destination) => (
                      <li key={destination.label}>
                        <RoadmapDestinationCard destination={destination} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <RoadmapReferenceSection />
      <RoadmapCallToActionSection />
    </main>
  );
}
