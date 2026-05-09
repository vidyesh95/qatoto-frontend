import Image from "next/image";
import Link from "next/link";

const STAGES = [
  {
    n: "01",
    eyebrow: "Pitch",
    title: "Post the idea.",
    body: "A defense-grade AI robot. A water-purification module. A new diagnostic device. You don't need a deck or a connection — you need a clear concept and the conviction to lead it.",
    accent: "from-primary/60 to-primary/10",
  },
  {
    n: "02",
    eyebrow: "Form team",
    title: "Recruit the people who finish things.",
    body: "Engineers, operators, domain specialists, hobbyists apply. Qatoto helps you fill CEO, CTO, CFO, leads, and individual contributors. Cap table and role agreements signed before work starts.",
    accent: "from-secondary/60 to-secondary/10",
  },
  {
    n: "03",
    eyebrow: "Raise",
    title: "Crowdfund, equity, or investor round.",
    body: "Run a public crowdfunding campaign. Sell shares directly to backers. Close a strategic VC. Or stack all three. Disclosures, term sheets, and signing happen on platform.",
    accent: "from-primary/40 to-secondary/30",
  },
  {
    n: "04",
    eyebrow: "Build",
    title: "Daily updates. AI-tuned workflow.",
    body: "Every team member posts an end-of-day update — short video or transcript. Investors watch the work compound. AI parses every update and suggests workflow fixes, sequencing changes, and blocker resolutions.",
    accent: "from-secondary/50 to-accent/40",
  },
  {
    n: "05",
    eyebrow: "Ship",
    title: "Compliance, fulfilment, marketing.",
    body: "Qatoto Store ships your product worldwide, files compliance and certifications, and runs first-line support. Spin up marketing videos in the same studio you used to coordinate the build.",
    accent: "from-accent to-primary/20",
  },
];

const SURFACES = [
  {
    icon: "/icons/account_circle_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Team builder",
    body: "Match founders with engineers, operators, and specialists. Define roles, lock equity, sign agreements — all before kickoff.",
  },
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Fundraise console",
    body: "Crowdfund, equity sale, or direct investor — same disclosure flow, same investor wall, one source of truth for the cap table.",
  },
  {
    icon: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Daily update wall",
    body: "EOD video or text from every team member. Investors get unfiltered visibility. AI distills sentiment, blockers, and progress.",
  },
  {
    icon: "/icons/screen_share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Workflow AI",
    body: "Reads updates, transcribes video, and suggests reordering, parallelization, or scope cuts that improve velocity.",
  },
  {
    icon: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Store + compliance",
    body: "End-to-end fulfilment, customs, certifications, returns, and support tickets — handled by the Qatoto Store layer.",
  },
  {
    icon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Marketing studio",
    body: "Produce launch videos, ad creative, and product walkthroughs on the same platform you built the product on.",
  },
  {
    icon: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Anime inspiration",
    body: "User-uploaded anime as an R&D feed — fantasy devices, garments, vehicles. Bookmark a frame, brief your team, build the real thing.",
  },
  {
    icon: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Project Immortal",
    body: "Long-horizon research wing. Immortality, energy, teleportation. Hobbyists and serious researchers share work in the open.",
  },
  {
    icon: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Civic problem map",
    body: "Geo-tagged reports — missing roads, no drinking water, broken infrastructure. Fuel for civic-tech projects with real demand.",
  },
];

const PRINCIPLES = [
  {
    title: "Fair compensation by ledger.",
    body: "Pay reflects effort logged, research delivered, and promotion contributed — measured on platform, not negotiated in private.",
  },
  {
    title: "Funds you can audit.",
    body: "Every dollar in and out lives on the project ledger. Missing funds and corruption become structurally hard, not policy-hard.",
  },
  {
    title: "Knowledge that compounds.",
    body: "Demand by region, lessons from past builds, key insights — surfaced to every team that needs them, not locked in a slide deck.",
  },
  {
    title: "Updates that build trust.",
    body: "EOD posts give investors continuous visibility. Trust scales with evidence, and evidence scales with cadence.",
  },
];

const FAQ = [
  {
    q: "What if I have an idea but no money or team?",
    a: "That's the default starting state. Post the concept, the platform helps you recruit the team, then a fundraise console opens up — crowdfund, equity, or direct investors.",
  },
  {
    q: "Why are daily updates required?",
    a: "Two reasons. First, investors get continuous visibility — no surprises, no quarterly theater. Second, the AI reads every update and suggests workflow improvements, blocker resolutions, and resequencing that compound team velocity.",
  },
  {
    q: "How does compensation work?",
    a: "The platform tracks effort, research, and promotional contribution per team member. Pay is allocated against the contribution ledger — not the loudest voice in the room.",
  },
  {
    q: "What does Qatoto handle after launch?",
    a: "Shipping worldwide, compliance and certifications, returns, customer support, and marketing video production. You stay in product mode; the platform runs operations.",
  },
  {
    q: "What's the Anime section actually for?",
    a: "Inspiration. Fantasy devices, garments, and worldbuilding turn into product briefs. Watch, bookmark, hand to your design lead, build the real thing.",
  },
  {
    q: "What's Project Immortal?",
    a: "A long-horizon research wing covering immortality, energy, and teleportation. Both hobbyist and serious research lives here, openly shared.",
  },
];

export default function HowQatotoWorks() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,var(--color-primary)_0%,transparent_55%),radial-gradient(40%_50%_at_15%_30%,var(--color-secondary)_0%,transparent_55%)] opacity-80"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            How it works
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl md:text-8xl">
            Idea on Monday.
            <br />
            <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              Team by Friday.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Qatoto compresses the journey from concept to shipped product into a single, transparent
            pipeline. Five stages. One workspace. Every step visible to the people who funded it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <li
              key={s.n}
              className={`relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br ${s.accent} p-10 shadow-sm`}
            >
              <span className="font-serif text-7xl font-semibold tracking-tight text-foreground/30">
                {s.n}
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                {s.eyebrow}
              </span>
              <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-foreground/80">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm sm:p-14">
          <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-center">
            <div>
              <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Worked example
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                AI ground robot for defense.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Founder has the architecture in their head and zero capital. They post the concept
                on Qatoto. A hardware lead, a controls engineer, a regulatory specialist, and a CFO
                apply within ten days. Roles signed. Cap table closed.
              </p>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                The team launches a public crowdfund for prototype capital, posts EOD updates as
                firmware and chassis ship, and uses the AI workflow notes to reorder integration
                testing — saving four weeks. Qatoto Store handles export compliance. First units
                ship to early backers eight months after the original post.
              </p>
            </div>

            <ol className="relative space-y-3 border-l border-border pl-6">
              {[
                "Day 0 — Concept posted.",
                "Day 8 — CTO + 3 leads onboarded.",
                "Day 14 — Crowdfund opens.",
                "Day 41 — Crowdfund closes at 138% of target.",
                "Day 60 — Daily updates begin. AI suggests parallel firmware/chassis tracks.",
                "Day 180 — MVP integration. Compliance pre-scan via Store.",
                "Day 240 — First units ship to backers.",
              ].map((line) => (
                <li key={line} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[31px] top-2 h-2.5 w-2.5 rounded-full bg-primary"
                  />
                  <p className="text-sm leading-relaxed text-foreground">{line}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            The surfaces
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Nine tools. One operating system for invention.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Each surface stands alone — and shares the same identity, ledger, audience, and AI layer
            underneath.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((s) => (
            <article
              key={s.title}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/40">
                <Image src={s.icon} alt="" width={24} height={24} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_80%_50%,var(--color-primary)_0%,transparent_70%)] opacity-50"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-14 md:grid-cols-[1fr_1.2fr] md:items-start">
            <div>
              <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Operating principles
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                The fairness is structural, not aspirational.
              </h2>
              <p className="mt-6 text-base text-muted-foreground sm:text-lg">
                Daily updates, on-platform ledgers, and contribution-tracked compensation aren't
                policies you opt into — they're how the system runs.
              </p>
              <Link
                href="/developers"
                className="mt-8 inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium transition hover:bg-muted"
              >
                Read the docs →
              </Link>
            </div>
            <div className="grid gap-4">
              {PRINCIPLES.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center">
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            Common questions
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            The short answers.
          </h2>
        </div>

        <dl className="mt-14 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {FAQ.map((item) => (
            <div key={item.q} className="px-8 py-7">
              <dt className="text-lg font-semibold tracking-tight">{item.q}</dt>
              <dd className="mt-2 text-base leading-relaxed text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">
                Ready to build?
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                The pipeline is open. Bring your idea.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Start a project, join one as a specialist, or back the next round of inventions
                shipping on Qatoto.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Pitch your idea
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Read about us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
