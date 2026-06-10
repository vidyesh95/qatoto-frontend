import Image from "next/image";
import Link from "next/link";

const CAPABILITIES = [
  {
    icon: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Product intelligence API",
    title: "Live price, demand, and supply signals.",
    body: "Query Qatoto's product graph from your own frontend. Real-time prices, stock states, regional demand maps, and category trends — exposed over REST and GraphQL with per-call latency under 80ms.",
  },
  {
    icon: "/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Video upload API",
    title: "Push video straight to our pipeline.",
    body: "Direct-to-storage signed uploads, automatic transcoding to HLS/DASH, AI-generated transcripts and chapters, virus scan, and CDN distribution. Your users upload from your app — we handle the rest.",
  },
  {
    icon: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Playback + embed SDK",
    title: "Drop Qatoto videos into any site.",
    body: "Embed any public Qatoto video with a single component or iframe. Adaptive bitrate, DRM-ready, captions, recommendations, and full theme overrides. Works in React, Vue, plain HTML, mobile WebViews.",
  },
  {
    icon: "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Analytics API",
    title: "Your users, your dashboards.",
    body: "Stream watch-time, drop-off, conversion, and purchase events from videos and product pages on your site. Pipe straight to your warehouse — Snowflake, BigQuery, S3 — or pull JSON over the Reports API.",
  },
];

const ENDPOINTS = [
  { method: "GET", path: "/v1/products/:id", desc: "Product, price, stock, regional availability" },
  { method: "GET", path: "/v1/products/search", desc: "Faceted search across the catalog" },
  { method: "GET", path: "/v1/insights/demand", desc: "Demand map: category × geography × window" },
  { method: "POST", path: "/v1/videos", desc: "Create video, returns signed upload URL" },
  { method: "GET", path: "/v1/videos/:id", desc: "Playback manifest + metadata" },
  {
    method: "GET",
    path: "/v1/analytics/sessions",
    desc: "Watch sessions, paginated, since cursor",
  },
  { method: "POST", path: "/v1/webhooks", desc: "Subscribe to upload + playback events" },
  { method: "GET", path: "/v1/oauth/token", desc: "OAuth 2.0 client-credentials + PKCE" },
];

const SDKS = [
  { label: "TypeScript / JavaScript", desc: "Node, browser, edge runtimes" },
  { label: "Python", desc: "asyncio + sync clients" },
  { label: "Rust", desc: "tokio-native, zero-copy types" },
  { label: "Go", desc: "context-aware, zero-dep" },
  { label: "Java / Kotlin", desc: "JVM + Android, coroutines ready" },
  { label: "Swift", desc: "iOS, macOS, visionOS native" },
  { label: ".NET", desc: "C# / F#, NuGet, AOT-friendly" },
];

const TIERS = [
  {
    name: "Sandbox",
    price: "Free",
    summary: "Build and test against the full API.",
    perks: [
      "10k product reads / mo",
      "100 video uploads / mo",
      "Test-mode analytics",
      "Community support",
    ],
    cta: "Get an API key",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Scale",
    price: "Usage-based",
    summary: "Pay only for what you ship to production.",
    perks: [
      "Unmetered product reads",
      "$0.004 per minute transcoded",
      "$0.001 per GB delivered",
      "Realtime webhooks + SLAs",
    ],
    cta: "Start metered",
    href: "/sign-up",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    summary: "Dedicated infra, BYO region, audit logs.",
    perks: [
      "Single-tenant pipeline",
      "Custom data residency",
      "SOC2 + DPA available",
      "24/7 on-call channel",
    ],
    cta: "Talk to sales",
    href: "/contact-us",
    highlight: false,
  },
];

const CODE_CURL = `curl https://api.qatoto.dev/v1/products/sku_8f2a \\
  -H "Authorization: Bearer $QATOTO_API_KEY"`;

const CODE_JS = `import { Qatoto } from "@qatoto/sdk";

const qt = new Qatoto({ apiKey: process.env.QATOTO_API_KEY });

const { uploadUrl, videoId } = await qt.videos.create({
  title: "Launch teaser",
  visibility: "public",
});

await fetch(uploadUrl, { method: "PUT", body: file });

const stats = await qt.analytics.sessions({ videoId, since: "24h" });`;

export default function Developers() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_65%_at_25%_0%,var(--color-primary)_0%,transparent_55%),radial-gradient(50%_50%_at_85%_25%,var(--color-secondary)_0%,transparent_50%)] opacity-80"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-24 pb-28 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              For developers
            </span>
            <h1 className="mt-8 font-serif text-5xl leading-[1.04] font-semibold tracking-tight sm:text-7xl">
              Build on
              <br />
              <span className="bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                Qatoto's backend.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Your frontend, our infrastructure. Pull live product prices, upload and stream video,
              embed our player, and stream analytics into your own dashboards — without standing up
              transcoding farms, CDN contracts, or a product graph from scratch.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background transition hover:opacity-90"
              >
                Get an API key
              </Link>
              <Link
                href="#endpoints"
                className="inline-flex h-12 items-center rounded-full border border-border bg-card px-7 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Read the docs →
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8 text-sm">
              <div>
                <dt className="text-muted-foreground">P99 read latency</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tracking-tight">78ms</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CDN PoPs</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tracking-tight">240+</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Uptime SLO</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold tracking-tight">99.95%</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border bg-foreground text-background shadow-2xl">
              <div className="relative flex items-center px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    aria-label="close"
                    className="size-3 rounded-full bg-[#ff5f57] ring-1 ring-black/10 ring-inset"
                  />
                  <span
                    aria-label="minimize"
                    className="size-3 rounded-full bg-[#febc2e] ring-1 ring-black/10 ring-inset"
                  />
                  <span
                    aria-label="expand"
                    className="size-3 rounded-full bg-[#28c840] ring-1 ring-black/10 ring-inset"
                  />
                </div>
                <span className="absolute left-1/2 -translate-x-1/2 font-mono text-background/60">
                  qatoto.dev — zsh
                </span>
              </div>
              <div className="p-5">
                <div className="text-xs font-medium tracking-[0.2em] text-background/50 uppercase">
                  Fetch product
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-background/90">
                  {CODE_CURL}
                </pre>
                <div className="mt-6 text-xs font-medium tracking-[0.2em] text-background/50 uppercase">
                  Upload + analytics
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-background/90">
                  {CODE_JS}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <article
              key={c.title}
              className="group relative overflow-hidden rounded-4xl border border-border bg-card p-10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/30 blur-3xl transition group-hover:bg-primary/50"
              />
              <div className="relative">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary/60">
                  <Image src={c.icon} alt="" width={28} height={28} />
                </div>
                <span className="mt-7 block text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  {c.eyebrow}
                </span>
                <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {c.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="endpoints" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
            API surface
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            One key. Everything Qatoto runs on.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            REST and GraphQL. OAuth 2.0 with PKCE for end-user delegated access. Webhooks for every
            state change. Cursor pagination. Idempotent writes.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {ENDPOINTS.map((ep) => (
              <li
                key={ep.path}
                className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:gap-6"
              >
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 font-mono text-xs font-semibold tracking-wider ${
                    ep.method === "POST"
                      ? "bg-primary/40 text-foreground"
                      : "bg-secondary/60 text-foreground"
                  }`}
                >
                  {ep.method}
                </span>
                <code className="font-mono text-sm font-medium text-foreground sm:min-w-65">
                  {ep.path}
                </code>
                <span className="text-sm text-muted-foreground">{ep.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-secondary)_0%,transparent_70%)] opacity-60"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
              SDKs + embeds
            </span>
            <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              First-class in every runtime you ship to.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Typed clients with retries, backoff, pagination, and streaming responses built in.
              Player components for the framework you already use.
            </p>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SDKS.map((sdk) => (
              <div
                key={sdk.label}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 shadow-sm transition hover:border-foreground/20"
              >
                <div>
                  <div className="text-base font-semibold tracking-tight">{sdk.label}</div>
                  <div className="text-sm text-muted-foreground">{sdk.desc}</div>
                </div>
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground"
                >
                  →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
            Pricing
          </span>
          <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Free to prototype. Pay when you ship.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Every account ships with sandbox keys. Promote to production when you're ready — no seat
            licenses, no upfront commits, no per-developer fees.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`flex flex-col rounded-3xl border p-8 shadow-sm transition ${
                tier.highlight
                  ? "border-foreground bg-foreground text-background shadow-xl"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <div
                className={`text-xs font-medium tracking-[0.2em] uppercase ${
                  tier.highlight ? "text-background/60" : "text-muted-foreground"
                }`}
              >
                {tier.name}
              </div>
              <div className="mt-4 font-serif text-4xl font-semibold tracking-tight">
                {tier.price}
              </div>
              <p
                className={`mt-3 text-base leading-relaxed ${
                  tier.highlight ? "text-background/75" : "text-muted-foreground"
                }`}
              >
                {tier.summary}
              </p>
              <ul
                className={`mt-6 flex-1 space-y-3 text-sm ${
                  tier.highlight ? "text-background/85" : "text-foreground"
                }`}
              >
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={`mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        tier.highlight
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/40 text-foreground"
                      }`}
                    >
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition ${
                  tier.highlight
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-4xl border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium tracking-[0.2em] text-background/60 uppercase">
                Infrastructure as a service
              </span>
              <h2 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
                Your product. Our pipes.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Storefronts, creator tools, dashboards, niche marketplaces — wire them to Qatoto's
                catalog, video pipeline, and analytics. Keep your brand on the glass.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Create API key
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
