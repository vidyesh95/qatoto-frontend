import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    icon: "/icons/account_circle_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Team formation",
    title: "Find your CTO before you find your office.",
    body: "Post the idea. Engineers, operators, domain specialists, hobbyists — apply. Qatoto helps shape the cap table, define roles (CEO, CTO, CFO, leads), and seal commitments before a line of code ships.",
  },
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Funding",
    title: "Crowdfund, equity, or VC — same dashboard.",
    body: "Run a community crowdfund, sell equity for capital, or close a strategic investor. All three flows live in the same fundraise console with disclosures, term sheets, and signing baked in.",
  },
  {
    icon: "/icons/screen_share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Daily updates + AI",
    title: "Every team member posts EOD.",
    body: "Investors see real progress, not curated decks. AI ingests video and transcripts, flags blockers, suggests workflow improvements, and quietly compounds team velocity update by update.",
  },
  {
    icon: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Ship + sell",
    title: "Compliance, fulfilment, and marketing — handled.",
    body: "Qatoto Store ships your product, files compliance paperwork, and handles support tickets. Marketing videos get produced on the same platform you used to build it.",
  },
];

const TOOLS = [
  { label: "Team builder", desc: "Roles, cap table, NDAs" },
  { label: "Fundraise console", desc: "Crowdfund, equity, VC" },
  { label: "Daily standup wall", desc: "EOD posts, AI summary" },
  { label: "Workflow AI", desc: "Suggests fixes from updates" },
  { label: "Compensation ledger", desc: "Pay = effort + research + promo" },
  { label: "Audit trail", desc: "Every fund movement, traceable" },
  { label: "Compliance + ship", desc: "Store handles end-to-end" },
  { label: "Marketing studio", desc: "Spin up product videos in-platform" },
  { label: "Demand map", desc: "Where the buyers actually are" },
];

const VOICES = [
  {
    quote:
      "I had the AI architecture in my head for two years. Posted it on Qatoto, had a hardware lead and a regulatory specialist on the team within a week. We crowdfunded the first prototype.",
    name: "Defense robotics founder",
    role: "Pre-seed, AI ground systems",
  },
  {
    quote:
      "The daily-update wall changed our investors' relationship with us. They stopped asking for monthly reports — they could see the work, every day.",
    name: "Climate hardware CEO",
    role: "Series A, atmospheric capture",
  },
  {
    quote:
      "Fair pay was always the hardest part of a small team. The compensation ledger settled it. Effort, research, and promotion contributions are visible — nobody has to argue.",
    name: "Medtech CTO",
    role: "Bootstrapped, diagnostic devices",
  },
];

export default function Creator() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_70%_at_30%_0%,var(--color-primary)_0%,transparent_55%),radial-gradient(50%_50%_at_80%_20%,var(--color-secondary)_0%,transparent_50%)] opacity-80"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-24 pb-28 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              For founders
            </span>
            <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.04] tracking-tight sm:text-7xl">
              Bring the idea.
              <br />
              <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                We bring the rest.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl">
              No capex. No connections. No supply chain. Just a concept and the will to build it.
              Qatoto stitches the team, the funding, the build process, and the go-to-market into a
              single workspace — so first-time founders ship like tenth-time founders.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition hover:opacity-90"
              >
                Pitch your idea
              </Link>
              <Link
                href="/how-qatoto-works"
                className="inline-flex h-12 items-center rounded-full border border-border bg-card px-7 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                See the pipeline →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl">
              <div className="grid h-full grid-rows-3">
                <div className="flex flex-col justify-between bg-gradient-to-br from-primary/60 to-primary/20 p-6">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                    Round raised
                  </span>
                  <div>
                    <div className="font-serif text-5xl font-semibold tracking-tight">$1.2M</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      crowdfund · 38% · 412 backers
                    </div>
                  </div>
                </div>
                <div className="border-y border-border bg-card p-6">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    EOD updates · today
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span>CTO · firmware v0.4</span>
                      <span className="rounded-full bg-primary/40 px-2 py-0.5 text-xs">
                        shipped
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>ME · enclosure rev3</span>
                      <span className="rounded-full bg-primary/40 px-2 py-0.5 text-xs">
                        shipped
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Reg · FCC pre-scan</span>
                      <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs">
                        in progress
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col justify-between bg-gradient-to-br from-secondary/70 to-secondary/20 p-6">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                    AI workflow note
                  </span>
                  <div>
                    <div className="font-serif text-2xl font-semibold tracking-tight leading-snug">
                      Move enclosure review before firmware freeze — saves 4 days.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <article
              key={p.title}
              className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl transition group-hover:bg-primary/50"
              />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/60">
                  <Image src={p.icon} alt="" width={28} height={28} />
                </div>
                <span className="mt-7 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {p.eyebrow}
                </span>
                <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {p.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            The workspace
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            One platform. The full operating stack.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Team, funding, daily updates, AI oversight, fair pay, audit trail, compliance, ship, and
            market — without leaving the tab.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <div
              key={tool.label}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 shadow-sm transition hover:border-foreground/20"
            >
              <div>
                <div className="text-base font-semibold tracking-tight">{tool.label}</div>
                <div className="text-sm text-muted-foreground">{tool.desc}</div>
              </div>
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
              >
                →
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-secondary)_0%,transparent_70%)] opacity-60"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
              Founders on record
            </span>
            <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              Built without the usual gatekeepers.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {VOICES.map((v) => (
              <figure
                key={v.name}
                className="rounded-3xl border border-border bg-card p-8 shadow-sm"
              >
                <span aria-hidden className="font-serif text-5xl leading-none text-primary">
                  &ldquo;
                </span>
                <blockquote className="mt-3 text-base leading-relaxed text-foreground">
                  {v.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-border pt-4">
                  <div className="text-sm font-semibold tracking-tight">{v.name}</div>
                  <div className="text-sm text-muted-foreground">{v.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">
              Idea + grit
            </span>
            <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              That's the only entry fee.
            </h2>
            <p className="mt-6 text-base text-background/70 sm:text-lg">
              Pitch your concept, draw a team, raise the round, and ship the product. The platform
              keeps the receipts honest and the workflow moving.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Start a project
              </Link>
              <Link
                href="/developers"
                className="inline-flex h-12 items-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Join as a specialist
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
