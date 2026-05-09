import Image from "next/image";
import Link from "next/link";

const PRINCIPLES = [
  {
    icon: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Creators first",
    body: "Every product decision starts with one question: does this make a creator's life better, or worse? If it isn't the former, we don't ship it.",
  },
  {
    icon: "/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Privacy as default",
    body: "Your data is yours. We minimize what we collect, encrypt what we store, and never sell what we hold. No dark patterns. No quiet opt-ins.",
  },
  {
    icon: "/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Open by design",
    body: "Open APIs, open standards, open conversations. The web wins when platforms collaborate instead of capturing.",
  },
  {
    icon: "/icons/swords_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Resilience over hype",
    body: "We optimize for the next decade, not the next quarter. Slow products that last beat fast products that fade.",
  },
];

const NUMBERS = [
  { value: "200+", label: "Countries reached" },
  { value: "12M", label: "Hours of video monthly" },
  { value: "$0", label: "Cost to start creating" },
  { value: "100%", label: "Creator ownership" },
];

const TIMELINE = [
  {
    year: "2024",
    title: "The first sketch",
    body: "A small group of engineers, anime fans, and shopkeepers asked: what if video, commerce, and community lived under one roof — without the surveillance tax?",
  },
  {
    year: "2025",
    title: "Private alpha",
    body: "Hundreds of creators stress-tested the player, the storefront, and the moderation pipeline. Their feedback rewrote half the product.",
  },
  {
    year: "2026",
    title: "Public launch",
    body: "Qatoto opened the doors. Anime, store, AI, and Project Immortal — all wired together, all owned by the people who use them.",
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
            A new home for
            <br />
            <span className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              video, commerce, and craft.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Qatoto is one platform for the whole creative life — watching, selling, learning, and
            building — designed so the people who make it run own what they build.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/how-qatoto-works"
              className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
            >
              How it works
            </Link>
            <Link
              href="/creator"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              For creators →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-10 shadow-xl sm:grid-cols-4 sm:p-14">
          {NUMBERS.map((item) => (
            <div key={item.label} className="text-center sm:text-left">
              <div className="font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                {item.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/80">
            <span className="rounded-full bg-primary/40 px-3 py-1 text-foreground">Our mission</span>
          </p>
          <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Build the platform creators would build for themselves.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Big tech inherited the open web and turned it into a mall with surveillance cameras. We
            think the next era looks different — owned by creators, friendly to merchants, honest
            with the people who watch. Qatoto is our attempt at that platform.
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
                The story so far
              </span>
              <h2 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Three years, one idea.
              </h2>
            </div>
            <p className="max-w-md text-base text-muted-foreground">
              We didn't start with a launch date — we started with a question. The product showed up
              when the answer did.
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

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">
                Join us
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Build the next chapter with us.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Whether you make videos, code services, run a shop, or watch quietly from the side
                — there's a seat at the table.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/creator"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Start creating
              </Link>
              <Link
                href="/careers"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                See open roles
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
