import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Earnings",
    title: "Three revenue lines.",
    body: "Ads, store, and direct support stack on the same channel. One audience funds three businesses — yours.",
  },
  {
    icon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Storefront",
    title: "Your shop, in the stream.",
    body: "Spin up a Qatoto Store next to your video in minutes. Fulfilment, returns, and tax handled — you stay in the studio.",
  },
  {
    icon: "/icons/screen_share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "AI tools",
    title: "Production that doesn't sleep.",
    body: "Captions, dubs, thumbnails, chapter splits. Models trained on what makes Qatoto videos work — not on yours.",
  },
  {
    icon: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Reach",
    title: "A discovery layer that pays attention.",
    body: "Recommendations weight craft, completion, and community — not just clicks. Slow-burn videos finally get a chance.",
  },
];

const TOOLS = [
  { label: "Studio", desc: "Edit, schedule, version" },
  { label: "Live", desc: "Multistream + co-host" },
  { label: "Store", desc: "Drops, subs, fulfilment" },
  { label: "Insights", desc: "Cohorts and retention" },
  { label: "Moderation", desc: "Queue + appeal flow" },
  { label: "API", desc: "Push from your stack" },
];

const VOICES = [
  {
    quote:
      "I moved my entire shop onto Qatoto in a weekend. The day my next video dropped, the storefront got the same traffic as the player.",
    name: "Anya Park",
    role: "Animator + merch creator",
  },
  {
    quote:
      "First platform that didn't punish me for posting twice a month. The audience that wanted me, found me.",
    name: "Ren Oduya",
    role: "Long-form essayist",
  },
  {
    quote:
      "The dub tool handles four languages in the time it used to take me to write captions. My channel finally feels global.",
    name: "Mira Salas",
    role: "Cooking + travel",
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
              For creators
            </span>
            <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.04] tracking-tight sm:text-7xl">
              Make once.
              <br />
              <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                Earn three ways.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Qatoto puts your video, your store, and your audience on the same surface. The work
              you already do, paid for in three currencies — attention, sales, and support.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition hover:opacity-90"
              >
                Start your channel
              </Link>
              <Link
                href="/how-qatoto-works"
                className="inline-flex h-12 items-center rounded-full border border-border bg-card px-7 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                See how it works →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl">
              <div className="grid h-full grid-rows-3">
                <div className="flex flex-col justify-between bg-gradient-to-br from-primary/60 to-primary/20 p-6">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                    This week
                  </span>
                  <div>
                    <div className="font-serif text-5xl font-semibold tracking-tight">$4,820</div>
                    <div className="mt-1 text-sm text-muted-foreground">across video + store</div>
                  </div>
                </div>
                <div className="border-y border-border bg-card p-6">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Watching now
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    {[40, 70, 55, 85, 60, 95, 75, 100, 80].map((h, i) => (
                      <span
                        key={i}
                        className="w-3 rounded-full bg-foreground/80"
                        style={{ height: `${h * 0.6}px` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between bg-gradient-to-br from-secondary/70 to-secondary/20 p-6">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                    Top SKU
                  </span>
                  <div>
                    <div className="font-serif text-3xl font-semibold tracking-tight">
                      Limited print 02
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">142 sold · 38 left</div>
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
            The studio
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            One workspace. Six surfaces. No tab-jockeying.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Everything you need to run a channel, a shop, and a community lives in the same window.
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
              Voices
            </span>
            <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              From the people in the studio.
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
              No fee. No gatekeepers.
            </span>
            <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Your audience is waiting.
            </h2>
            <p className="mt-6 text-base text-background/70 sm:text-lg">
              Set up your channel in under five minutes. Open a store the same day. Keep what you
              earn.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Become a creator
              </Link>
              <Link
                href="/developers"
                className="inline-flex h-12 items-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Bring your tools
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
