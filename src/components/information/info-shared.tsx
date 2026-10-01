import Image from "next/image";

export interface InfoFeatureItem {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

export interface InfoFeatureGridSectionProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly items: readonly InfoFeatureItem[];
}

export function InfoFeatureGridSection({
  eyebrow,
  title,
  description,
  items,
}: InfoFeatureGridSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="rounded-full bg-primary/40 px-3 py-1 text-xs font-medium tracking-eyebrow text-foreground uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">{description}</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.title}
            className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/40">
              <Image src={item.icon} alt="" width={28} height={28} />
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export interface InfoPillarItem {
  readonly icon: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

export interface InfoPillarsSectionProps {
  readonly items: readonly InfoPillarItem[];
}

export function InfoPillarsSection({ items }: InfoPillarsSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.title}
            className="group relative overflow-hidden rounded-4xl border border-border bg-card p-10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/30 blur-3xl transition group-hover:bg-primary/50"
            />
            <div className="relative">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary/60">
                <Image src={item.icon} alt="" width={28} height={28} />
              </div>
              <span className="mt-7 block text-xs font-medium tracking-eyebrow text-muted-foreground uppercase">
                {item.eyebrow}
              </span>
              <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {item.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export interface InfoLinkCardItem {
  readonly label: string;
  readonly desc: string;
}

export interface InfoLinkCardGridProps {
  readonly items: readonly InfoLinkCardItem[];
}

export function InfoLinkCardGrid({ items }: InfoLinkCardGridProps) {
  return (
    <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 shadow-sm transition hover:border-foreground/20"
        >
          <div>
            <div className="text-base font-semibold tracking-tight">{item.label}</div>
            <div className="text-sm text-muted-foreground">{item.desc}</div>
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
  );
}
