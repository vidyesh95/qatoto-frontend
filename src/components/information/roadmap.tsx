// TRANSPORT: props-only — a server component over authored constants. Fetches nothing.
//
// THE GEOMETRY IS CSS, NOT COORDINATES, AND THAT IS THE WHOLE DESIGN.
//
// A roadmap.sh-style trunk with branches off it is tempting to draw with an SVG and a table of
// hand-tuned x/y values. `src/lib/rnd/branch-tree-layout.ts` already argues against that in its own
// header — "authored coordinates are layout masquerading as data. They break at any other
// viewport" — and it is just as true here, where the map has to survive a phone, a laptop and an
// eleventh milestone being added.
//
// So the trunk is one absolutely-positioned dashed line, each milestone is a three-column grid row
// whose middle column holds the marker, and each connector is a `before:` pseudo-element exactly
// as wide as the grid gap. Nothing is measured, so nothing needs JavaScript, and the whole page
// ships zero client bytes.
//
// `layOutBranchTree` is NOT reusable for this: it takes `readonly ResearchBranch[]` and reads
// `branchId`/`parentBranchId`/`siblingOrder` off every row, with no generic parameter.

import Link from "next/link";
import { ROADMAP_AUDIENCES } from "@/lib/roadmap/site-capabilities";
import {
  ROADMAP_REFERENCE_DESTINATIONS,
  SITE_ROADMAP_MILESTONES,
  type RoadmapDestination,
} from "@/lib/roadmap/site-roadmap";

const CARD_BASE_CLASS_NAME = "rounded-2xl border p-5 shadow-sm transition";

/**
 * One node on the map. An exhaustive `switch` with a `never` default, so a fourth destination kind
 * becomes a compile error here rather than a silently unrendered node.
 */
function RoadmapDestinationCard({ destination }: { destination: RoadmapDestination }) {
  switch (destination.kind) {
    case "route":
      return (
        <Link
          href={destination.href}
          className={`${CARD_BASE_CLASS_NAME} group block border-border bg-card hover:-translate-y-0.5 hover:shadow-md`}
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold tracking-tight">{destination.label}</span>
            <span
              aria-hidden
              className="text-sm text-muted-foreground transition group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
          <span className="mt-1 block font-mono text-xs break-all text-muted-foreground">
            {destination.href}
          </span>
          <span className="mt-3 block text-sm leading-relaxed text-muted-foreground">
            {destination.summary}
          </span>
        </Link>
      );

    case "dynamic":
      return (
        <div className={`${CARD_BASE_CLASS_NAME} border-border bg-card/60`}>
          <p className="text-base font-semibold tracking-tight">{destination.label}</p>
          <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
            {destination.pathPattern}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {destination.summary}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-foreground/70">
            <span className="font-medium">Reached from</span> {destination.reachedFrom}.
          </p>
        </div>
      );

    case "planned":
      return (
        <div className={`${CARD_BASE_CLASS_NAME} border-dashed border-border bg-transparent`}>
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold tracking-tight text-muted-foreground">
              {destination.label}
            </span>
            <span className="text-[0.625rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Soon
            </span>
          </p>
          <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
            {destination.pathPattern}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {destination.summary}
          </p>
        </div>
      );

    default: {
      const exhaustiveCheck: never = destination;
      return exhaustiveCheck;
    }
  }
}

export default function Roadmap() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,var(--color-primary)_0%,transparent_55%),radial-gradient(40%_50%_at_15%_30%,var(--color-secondary)_0%,transparent_55%)] opacity-80"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Roadmap
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl font-serif text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl md:text-8xl">
            Every surface.
            <br />
            <span className="bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              And how to reach it.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            What Qatoto is for, what you can do here, and where each of those things lives. Then ten
            stages in the order you meet them — from making an account to shipping a product and
            selling it. Every node is a real page.
          </p>
        </div>
      </section>

      <section id="what-this-is" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:items-start">
          <div>
            <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
              What this is
            </span>
            <h2 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              One pipeline, from a problem to a product on a shelf.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Qatoto takes an idea from the person who had it to a product someone can buy, without
              that person needing capital, a network or a team they already know. A problem gets
              posted, people apply to work on it, the build happens in the open with a daily log,
              backers commit against work they can watch, and the finished thing goes to market
              through the Store — manufacturing, listing, orders and returns included.
            </p>
            <p>
              Contribution is logged rather than negotiated, so the equity split is argued from a
              ledger. Progress is posted daily, so trust is evidence rather than a deck.
            </p>
            <p>
              The video feed, the Blueprints hub and the Store are not a second product bolted on —
              they are how an idea gets found, how a team gets an audience, and how the finished
              unit gets sold.
            </p>
          </div>
        </div>
      </section>

      <section id="what-you-can-do" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
            What you can do
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Eight reasons to be here.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Find yourself in one of these. Every capability names the page it actually lives on —
            and where a surface is still a placeholder, it says so instead of linking you into one.
          </p>
        </div>

        <div className="mt-14 space-y-12">
          {ROADMAP_AUDIENCES.map((audience) => (
            <section
              key={audience.id}
              id={audience.id}
              className="scroll-mt-24 md:grid md:grid-cols-[1fr_1.6fr] md:items-start md:gap-10"
            >
              <div className="md:sticky md:top-24">
                <h3 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                  {audience.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {audience.summary}
                </p>
              </div>

              <ul className="mt-6 grid gap-3 md:mt-0">
                {audience.capabilities.map((capability) => (
                  <li
                    key={capability.action}
                    className={`${CARD_BASE_CLASS_NAME} border-border bg-card`}
                  >
                    <p className="text-base font-semibold tracking-tight">{capability.action}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {capability.summary}
                    </p>
                    {capability.routes.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {capability.routes.map((route) => (
                          <li key={route.href}>
                            <Link
                              href={route.href}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                            >
                              {route.label}
                              <span className="font-mono text-xs text-muted-foreground">
                                {route.href}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

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

        <dl className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            <div>
              <dt className="font-medium">Solid card</dt>
              <dd className="text-muted-foreground">A page you can open right now.</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground" />
            <div>
              <dt className="font-medium">No link</dt>
              <dd className="text-muted-foreground">
                A detail page — the card says what to click to get there.
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border p-4">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full border border-muted-foreground"
            />
            <div>
              <dt className="font-medium">Dashed card</dt>
              <dd className="text-muted-foreground">Routed, but still a placeholder.</dd>
            </div>
          </div>
        </dl>
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
                  {/*
                    The dot that pins this milestone to the trunk — PHONE ONLY. From `md` up the
                    marker card itself sits centred on the trunk, so a dot would land inside the
                    card, on top of its own summary text.
                  */}
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

      <section id="reference" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
            Reference
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            The reading room.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Not a stage of anything — the pages you open when you want to know how something works,
            or what you agreed to.
          </p>
        </div>

        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP_REFERENCE_DESTINATIONS.map((destination) => (
            <li key={destination.label}>
              <RoadmapDestinationCard destination={destination} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-4xl border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium tracking-[0.2em] text-background/60 uppercase">
                Start anywhere
              </span>
              <h2 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
                The map is the product. Pick a stage.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Most people arrive at stage two and leave at stage ten. You do not have to walk the
                trunk in order — but it is the order the work actually happens in.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/research-and-development/new"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Post an idea
              </Link>
              <Link
                href="/how-qatoto-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                How Qatoto works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
