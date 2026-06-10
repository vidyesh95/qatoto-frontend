import Image from "next/image";
import Link from "next/link";

const EMAIL = "vidyesh95@gmail.com";
const PHONE_DISPLAY = "+91 99704 50462";
const PHONE_E164 = "+919970450462";
const ADDRESS_LINES = [
  "602, A Wing, 66 Avenue",
  "Carter Road No. 1, Asara Colony",
  "Borivali, Mumbai",
  "Maharashtra 400066, India",
];
const MAP_SHORTLINK = "https://maps.app.goo.gl/cwJEWvvYBd4GuTiN7";
const MAP_LAT = 19.2258515;
const MAP_LNG = 72.8570855;
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${MAP_LAT},${MAP_LNG}&z=17&output=embed`;

const CARDS = [
  {
    icon: "/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Email",
    title: "Write to us.",
    body: "General questions, founder pitches, investor enquiries, and partnerships all land in the same inbox. A human replies — usually within two business days.",
    cta: { label: EMAIL, href: `mailto:${EMAIL}` },
  },
  {
    icon: "/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    eyebrow: "Phone",
    title: "Call or message.",
    body: "Reach us during Mumbai business hours (Mon–Fri, 10:00–19:00 IST). For investors and time-sensitive matters, phone is the fastest channel.",
    cta: { label: PHONE_DISPLAY, href: `tel:${PHONE_E164}` },
  },
  {
    icon: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    eyebrow: "Office",
    title: "Visit us.",
    body: "Head office in Borivali, Mumbai. Drop by appointment — email or call ahead so the right person is on site to meet you.",
    cta: {
      label: "Open in Maps →",
      href: MAP_SHORTLINK,
    },
  },
];

export default function ContactUs() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-primary)_0%,transparent_60%),radial-gradient(50%_50%_at_85%_30%,var(--color-secondary)_0%,transparent_55%)] opacity-70"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Contact Qatoto
          </span>
          <h1 className="mt-8 font-serif text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl md:text-8xl">
            Talk to a human.
            <br />
            <span className="bg-linear-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Not a contact form.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Founders, investors, partners, and curious users — all reach the same team. Email,
            phone, or visit us in Mumbai.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
            >
              Email {EMAIL}
            </a>
            <a
              href={`tel:${PHONE_E164}`}
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Call {PHONE_DISPLAY} →
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => {
            const isInternal = c.cta.href.startsWith("/");
            const isExternal = c.cta.href.startsWith("http");
            return (
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
                  {isInternal ? (
                    <Link
                      href={c.cta.href}
                      className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90"
                    >
                      {c.cta.label}
                    </Link>
                  ) : (
                    <a
                      href={c.cta.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90"
                    >
                      {c.cta.label}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-secondary)_0%,transparent_70%)] opacity-60"
        />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 rounded-4xl border border-border bg-card p-10 shadow-xl md:grid-cols-[1.1fr_1fr] md:p-14">
            <div>
              <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
                Head office
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Borivali, Mumbai.
              </h2>
              <address className="mt-6 text-lg leading-relaxed text-muted-foreground not-italic">
                {ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background px-5 py-4">
                  <dt className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                    Email
                  </dt>
                  <dd className="mt-1 text-base font-semibold tracking-tight">
                    <a
                      href={`mailto:${EMAIL}`}
                      className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                    >
                      {EMAIL}
                    </a>
                  </dd>
                </div>
                <div className="rounded-2xl border border-border bg-background px-5 py-4">
                  <dt className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                    Phone
                  </dt>
                  <dd className="mt-1 text-base font-semibold tracking-tight">
                    <a
                      href={`tel:${PHONE_E164}`}
                      className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                    >
                      {PHONE_DISPLAY}
                    </a>
                  </dd>
                </div>
                <div className="rounded-2xl border border-border bg-background px-5 py-4 sm:col-span-2">
                  <dt className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                    Hours
                  </dt>
                  <dd className="mt-1 text-base font-semibold tracking-tight">
                    Mon–Fri · 10:00–19:00 IST
                  </dd>
                </div>
              </dl>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
              <iframe
                title="Qatoto head office on Google Maps"
                src={MAP_EMBED_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-popups"
                className="h-full min-h-80 w-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="overflow-hidden rounded-4xl border border-border bg-foreground p-12 text-background shadow-2xl sm:p-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr] md:items-end">
            <div>
              <span className="text-xs font-medium tracking-[0.2em] text-background/60 uppercase">
                Founders + investors
              </span>
              <h2 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
                One inbox. One phone line. Real people on both.
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70 sm:text-lg">
                Pitching an idea, evaluating a round, or reporting an issue — write or call directly
                and we'll route it inside the team.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {EMAIL}
              </a>
              <a
                href={`tel:${PHONE_E164}`}
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-7 text-sm font-medium text-background transition hover:bg-background/10"
              >
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
