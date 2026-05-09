import Image from "next/image";
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Create.",
    body: "Upload, livestream, or build with the AI tools. Captions, dubs, chapters, and thumbnails come for free. Versioning, drafts, and scheduling stay in one place.",
    accent: "from-primary/60 to-primary/10",
  },
  {
    n: "02",
    title: "Connect.",
    body: "Your video, your store, and your community live on one page. Viewers can watch, buy, comment, and follow without leaving the surface.",
    accent: "from-secondary/60 to-secondary/10",
  },
  {
    n: "03",
    title: "Compound.",
    body: "Insights show what holds attention and what converts. AI suggests cuts, drops, and tests. Every video makes the next one easier.",
    accent: "from-accent to-accent/20",
  },
];

const SURFACES = [
  {
    icon: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Home",
    body: "A feed shaped by craft and completion, not just clicks. Discoverable for slow-burn creators.",
  },
  {
    icon: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Anime",
    body: "A licensed anime hub with creator-led commentary, watch parties, and merch native to each title.",
  },
  {
    icon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Store",
    body: "Drop-friendly storefront — limited prints, subs, fulfilment, and tax handled end-to-end.",
  },
  {
    icon: "/icons/screen_share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "AI",
    body: "Production assistants for editing, dubbing, thumbnails, and analysis. Trained on what works on Qatoto, not on your work.",
  },
  {
    icon: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    title: "Project Immortal",
    body: "Long-form research and archives — preserving creator work and culture for the people who come after.",
  },
  {
    icon: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    title: "Studio",
    body: "Your control room. Drafts, schedule, monetization, moderation, and live insights — together.",
  },
];

const PRINCIPLES = [
  {
    title: "Open by default",
    body: "Public APIs, exportable data, no lock-in. If you ever want to leave, the door isn't locked.",
  },
  {
    title: "Privacy isn't a tier",
    body: "We minimize collection, encrypt at rest, and let you switch off personalization with one toggle. No premium-only privacy.",
  },
  {
    title: "Recommendations you can read",
    body: "Why a video showed up is one tap away. Adjust signals, mute themes, and shape your feed without a black box.",
  },
  {
    title: "Moderation with appeal",
    body: "Decisions come with the rule that triggered them and a real path to challenge. Humans on call where it matters.",
  },
];

const FAQ = [
  {
    q: "Is Qatoto free?",
    a: "Yes. Watching, posting, and opening a store cost nothing. We take a small revenue share when you earn — never a flat fee.",
  },
  {
    q: "Who owns the content?",
    a: "You do. Always. Qatoto holds the rights it needs to host and distribute, and nothing more.",
  },
  {
    q: "How does discovery work?",
    a: "Recommendations weight watch completion, return rate, and craft signals over raw clicks. You can read why and tune the inputs.",
  },
  {
    q: "Can my tools talk to Qatoto?",
    a: "Public APIs cover upload, store, insights, and moderation. Bring your own pipelines or build new ones — we publish docs and SDKs.",
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
            One platform.
            <br />
            <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              Five surfaces. Zero seams.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Qatoto stitches video, anime, commerce, AI, and long-form research into a single
            experience. Here's the shape of it — what each piece does, and how they pull together.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className={`relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br ${s.accent} p-10 shadow-sm`}
            >
              <span className="font-serif text-7xl font-semibold tracking-tight text-foreground/30">
                {s.n}
              </span>
              <h3 className="mt-4 font-serif text-3xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-foreground/80">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            The surfaces
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Different rooms, same building.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Each surface stands on its own — and shares the same identity, payments, audience, and
            tools underneath.
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
                Architecture
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Built on principles you can audit.
              </h2>
              <p className="mt-6 text-base text-muted-foreground sm:text-lg">
                The technical decisions match the product promises. We publish the rules,
                document the trade-offs, and update them in public.
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
                Ready to look around?
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                The fastest tour is to use it.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Sign up takes a minute. Browse. Watch. Buy. Or open a channel — the studio is right
                there.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Try Qatoto
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
