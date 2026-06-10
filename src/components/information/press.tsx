import Link from "next/link";
import Image from "next/image";
import { type PressItem, formatDate } from "@/lib/cms";

const KIND_LABEL: Record<PressItem["kind"], string> = {
  announcement: "Announcement",
  release: "Release",
  milestone: "Milestone",
  media: "In the media",
};

export default function Press({ items }: { items: PressItem[] }) {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-secondary)_0%,transparent_60%)] opacity-70"
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
            <span className="size-1.5 rounded-full bg-secondary" />
            Newsroom
          </span>
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Updates from Qatoto.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Product launches, milestones, and announcements — straight from the team. For media
            enquiries, reach out at{" "}
            <a className="underline" href="mailto:press@qatoto.com">
              press@qatoto.com
            </a>
            .
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">No updates yet.</h2>
            <p className="mt-3 text-muted-foreground">
              Press releases will appear here as they ship.
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <ol className="grid gap-6">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/press/${item.slug}`}
                  className="group grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[260px_1fr] md:p-8"
                >
                  <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-muted md:aspect-auto">
                    {item.coverImage ? (
                      <Image
                        src={item.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 260px, 100vw"
                        className="object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_30%,var(--color-secondary)_0%,transparent_60%),radial-gradient(40%_40%_at_80%_70%,var(--color-primary)_0%,transparent_60%)]" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                      <span className="rounded-full bg-secondary/60 px-3 py-1 text-foreground">
                        {KIND_LABEL[item.kind]}
                      </span>
                      <span>{formatDate(item.publishedAt)}</span>
                    </div>
                    <h2 className="mt-4 font-serif text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground transition group-hover:gap-2">
                      Read full update →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
