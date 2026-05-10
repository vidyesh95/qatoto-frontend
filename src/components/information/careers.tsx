import Image from "next/image";
import Link from "next/link";

const VALUES = [
  {
    icon: "/icons/swords_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Build, don't pitch.",
    body: "Output beats opinion. Daily updates, shipped artifacts, and demonstrated craft are the currency here.",
  },
  {
    icon: "/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Pay tracks contribution.",
    body: "Compensation reflects effort, research, and promotion logged on platform — not who's loudest in the room.",
  },
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Receipts over rhetoric.",
    body: "Every fund movement and workflow change is auditable. We hire people who like that, not the ones who fear it.",
  },
  {
    icon: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Long-horizon work welcome.",
    body: "Climate tech, defense AI, immortality research, civic infra. If it's hard and worth doing, it has a home here.",
  },
];

const NUMBERS = [
  { value: "Remote-first", label: "With on-site studios when teams need them" },
  { value: "EOD", label: "Update cadence — same as every founder" },
  { value: "0 layers", label: "Between you and the work that ships" },
  { value: "1 ledger", label: "Pay, equity, and contribution, transparent" },
];

const ROLES = [
  {
    team: "Engineering",
    title: "Senior Platform Engineer",
    location: "Remote · Global",
    type: "Full-time",
    blurb:
      "Own core systems behind the team builder, fundraise console, and daily-update wall. TypeScript, Postgres, distributed systems.",
  },
  {
    team: "Engineering",
    title: "ML / AI Engineer",
    location: "Remote · Global",
    type: "Full-time",
    blurb:
      "Build the workflow AI that ingests EOD video, transcripts, and fund movements, then suggests fixes. Strong applied ML chops required.",
  },
  {
    team: "Hardware",
    title: "Hardware Program Lead",
    location: "Hybrid · Bay Area or Tokyo",
    type: "Full-time",
    blurb:
      "Run hardware-track teams from prototype through compliance and shipping. Background in consumer or industrial hardware preferred.",
  },
  {
    team: "Compliance",
    title: "Regulatory + Compliance Specialist",
    location: "Remote · US / EU",
    type: "Full-time",
    blurb:
      "Scale Qatoto Store's compliance pipeline across categories — FCC, CE, FDA, export controls. Past in-house regulatory experience required.",
  },
  {
    team: "Design",
    title: "Product Designer",
    location: "Remote · Global",
    type: "Full-time",
    blurb:
      "Design the founder operating system. Cap tables, fundraise flows, daily updates — surfaces that compound across thousands of teams.",
  },
  {
    team: "Operations",
    title: "Founder Operations Partner",
    location: "Remote · Americas",
    type: "Full-time",
    blurb:
      "Pair with funded teams on the platform. Translate AI workflow notes into action, unblock founders, surface platform gaps to product.",
  },
];

const PERKS = [
  { label: "Equity in Qatoto", desc: "Real ownership, plain English vesting" },
  { label: "Health + dental", desc: "Top-tier coverage, global where possible" },
  { label: "Learning budget", desc: "$3k/year, no approval theater" },
  { label: "Hardware allowance", desc: "Spec your own machine" },
  { label: "Studio access", desc: "Drop in to the build studios anytime" },
  { label: "Sabbatical", desc: "1 month paid, every 3 years" },
];

export default function Careers() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-primary)_0%,transparent_60%),radial-gradient(50%_50%_at_85%_30%,var(--color-secondary)_0%,transparent_55%)] opacity-70"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Careers at Qatoto
          </span>
          <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl md:text-8xl">
            Help builders
            <br />
            <span className="bg-linear-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              skip the gatekeepers.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Qatoto is the operating system for turning ideas into shipped products. We're hiring
            engineers, designers, operators, and specialists to make the pipeline faster, fairer,
            and harder to corrupt.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#open-roles"
              className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
            >
              See open roles
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Why Qatoto exists →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-10 shadow-xl sm:grid-cols-4 sm:p-14">
          {NUMBERS.map((item) => (
            <div key={item.label} className="text-center sm:text-left">
              <div className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
            How we work
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The same rules we ask of every team on the platform.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Qatoto is built by people who use Qatoto. We post EOD updates. Our compensation lives on
            the same ledger. AI watches our workflow and suggests cuts. It's the only honest way to
            ship the thing.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <article
              key={v.title}
              className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/40">
                <Image src={v.icon} alt="" width={28} height={28} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="open-roles" className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-secondary)_0%,transparent_70%)] opacity-60"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                Open roles
              </span>
              <h2 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                {ROLES.length} positions hiring now.
              </h2>
            </div>
            <p className="max-w-md text-base text-muted-foreground">
              Don't see your role? We're always open to a good pitch. Send your work to{" "}
              <a
                href="mailto:careers@qatoto.com"
                className="font-medium text-foreground underline decoration-dotted underline-offset-4"
              >
                careers@qatoto.com
              </a>
              .
            </p>
          </div>

          <ul className="grid gap-4">
            {ROLES.map((role) => (
              <li
                key={role.title}
                className="group rounded-3xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        {role.team}
                      </span>
                      <span>{role.location}</span>
                      <span aria-hidden>·</span>
                      <span>{role.type}</span>
                    </div>
                    <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                      {role.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                      {role.blurb}
                    </p>
                  </div>
                  <a
                    href={`mailto:careers@qatoto.com?subject=${encodeURIComponent(
                      `Application: ${role.title}`,
                    )}`}
                    className="inline-flex h-11 items-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition group-hover:bg-foreground group-hover:text-background"
                  >
                    Apply →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-4xl border border-border bg-card p-12 shadow-sm sm:p-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Perks
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight">
                Boring benefits, done right.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                We don't oversell perks. The work is the perk. These are the basics — clean
                coverage, honest equity, real time off — without the fine print designed to take
                them back.
              </p>
            </div>
            <ul className="grid gap-3 text-sm">
              {PERKS.map((perk) => (
                <li
                  key={perk.label}
                  className="rounded-2xl border border-border bg-background px-5 py-4"
                >
                  <strong className="font-semibold">{perk.label}</strong>
                  <span className="ml-2 text-muted-foreground">— {perk.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-4xl border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">
                Build with us
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                The platform is the resume. So is the work.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Send links to what you've shipped. Code, hardware, deals closed, problems solved.
                We'd rather see one project you actually built than a polished CV of titles.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a
                href="mailto:careers@qatoto.com"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Email careers@qatoto.com
              </a>
              <Link
                href="/contact-us"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Talk to the team →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
