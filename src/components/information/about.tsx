import Image from "next/image";
import Link from "next/link";

const PRINCIPLES = [
  {
    icon: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Idea is enough.",
    body: "Capital, contacts, and credentials should not gate invention. If you have a problem worth solving and the grit to chase it, the rest of the stack should come to you — not the other way around.",
  },
  {
    icon: "/icons/swords_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Teams beat lone founders.",
    body: "A CEO without a CTO is a deck. A CTO without a CFO is a prototype. Qatoto matches founders with the engineers, operators, specialists, and hobbyists who turn ideas into shipped products.",
  },
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Daily updates kill rot.",
    body: "Every team member posts an end-of-day update. Investors see real progress. AI watches the workflow and suggests cuts, fixes, and reorderings. Funds don't wander. Corruption doesn't compound.",
  },
  {
    icon: "/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Compensation tracks contribution.",
    body: "Pay reflects effort, research, and promotion delivered — measured by the work logged on the platform, not by who shouts loudest in the meeting.",
  },
];

const NUMBERS = [
  { value: "1 idea", label: "All it takes to start" },
  { value: "0 capex", label: "Required from the founder" },
  { value: "EOD", label: "Update cadence, every member" },
  { value: "1 stack", label: "Team, funding, build, ship, market" },
];

const TIMELINE = [
  {
    year: "Pitch",
    title: "Idea goes public.",
    body: "Founder posts the concept. Specialists, engineers, and operators apply. The platform helps shape the team — CEO, CTO, developers, domain experts — and locks the cap table on day one.",
  },
  {
    year: "Build",
    title: "MVP and money.",
    body: "Team ships a concept or MVP. Funding follows: crowdfunding, equity rounds, or direct investors. Each backer sees the same daily update wall the team posts to.",
  },
  {
    year: "Ship",
    title: "From prototype to product.",
    body: "Qatoto Store handles shipping, compliance, and support. Marketing videos get produced on platform. Insights from demand maps and anime-inspired R&D feed back into the next iteration.",
  },
];

export default function About() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-primary)_0%,transparent_60%),radial-gradient(50%_50%_at_85%_30%,var(--color-secondary)_0%,transparent_55%)] opacity-70"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            About Qatoto
          </span>
          <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl md:text-8xl">
            From an idea
            <br />
            <span className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              to a shipped product.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Qatoto is a B2B platform for bringing novel, profitable products to market. Bring the
            idea and the grit — we handle team formation, funding, build oversight, compliance,
            shipping, and the market that wants what you make.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/how-qatoto-works"
              className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
            >
              See the pipeline
            </Link>
            <Link
              href="/creator"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              For founders →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-10 shadow-xl sm:grid-cols-4 sm:p-14">
          {NUMBERS.map((item) => (
            <div key={item.label} className="text-center sm:text-left">
              <div className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {item.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            Our mission
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Make invention a question of will, not capital.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Most great ideas die in the gap between "I should build this" and "I have the team, the
            money, and the supply chain to build this." Qatoto closes that gap. Pitch the concept,
            assemble the team, raise the round, ship to market — on one platform, with one ledger,
            and one source of truth.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <article
              key={p.title}
              className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/40">
                <Image src={p.icon} alt="" width={28} height={28} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-secondary)_0%,transparent_70%)] opacity-60"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                The arc
              </span>
              <h2 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Three phases. One platform.
              </h2>
            </div>
            <p className="max-w-md text-base text-muted-foreground">
              Pitch, build, ship. Each phase has its own tools, but the data — team, funding, daily
              updates, demand signals — flows through all of them.
            </p>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {TIMELINE.map((step, i) => (
              <li
                key={step.year}
                className="rounded-3xl border border-border bg-card p-8 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {step.year}
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-[2rem] border border-border bg-card p-12 shadow-sm sm:p-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Beyond the studio
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight">
                Knowledge that compounds across teams.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Demand maps show where the need is. Civic reports flag missing roads, water,
                infrastructure — by location. Anime-inspired R&D feeds devices and designs.
                Long-horizon research like Project Immortal lives next to commercial work. Every
                project benefits from what every other project learned.
              </p>
            </div>
            <ul className="grid gap-3 text-sm">
              <li className="rounded-2xl border border-border bg-background px-5 py-4">
                <strong className="font-semibold">Demand insights</strong>
                <span className="ml-2 text-muted-foreground">— what's wanted, where</span>
              </li>
              <li className="rounded-2xl border border-border bg-background px-5 py-4">
                <strong className="font-semibold">Civic problem map</strong>
                <span className="ml-2 text-muted-foreground">— roads, water, gaps to solve</span>
              </li>
              <li className="rounded-2xl border border-border bg-background px-5 py-4">
                <strong className="font-semibold">Project Immortal</strong>
                <span className="ml-2 text-muted-foreground">
                  — immortality, energy, teleportation
                </span>
              </li>
              <li className="rounded-2xl border border-border bg-background px-5 py-4">
                <strong className="font-semibold">Anime inspiration feed</strong>
                <span className="ml-2 text-muted-foreground">— devices and designs, made real</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">
                Bring the idea
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                The team, the money, and the market are already here.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                AI robots for defense, novel hardware, climate tech, civic tools — if it's buildable
                and the demand exists, Qatoto stitches together the people and capital to ship it.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/creator"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Pitch your idea
              </Link>
              <Link
                href="/careers"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Join a team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
