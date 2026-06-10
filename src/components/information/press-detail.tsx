import Link from "next/link";
import Image from "next/image";
import { type PressItem, formatDate } from "@/lib/cms";

const KIND_LABEL: Record<PressItem["kind"], string> = {
  announcement: "Announcement",
  release: "Release",
  milestone: "Milestone",
  media: "In the media",
};

export default function PressDetail({ item, related }: { item: PressItem; related: PressItem[] }) {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <Link
          href="/press"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← All updates
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            <span className="rounded-full bg-secondary/60 px-3 py-1 text-foreground">
              {KIND_LABEL[item.kind]}
            </span>
            <span>{formatDate(item.publishedAt)}</span>
            {item.source && (
              <>
                <span>·</span>
                {item.source.url ? (
                  <a
                    href={item.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {item.source.name}
                  </a>
                ) : (
                  <span>{item.source.name}</span>
                )}
              </>
            )}
          </div>
          <h1 className="mt-6 font-serif text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            {item.title}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">{item.summary}</p>
        </header>

        {item.coverImage && (
          <div className="relative mt-10 aspect-video overflow-hidden rounded-3xl bg-muted">
            <Image
              src={item.coverImage}
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div
          className="prose prose-neutral mt-12 max-w-none font-serif text-lg leading-relaxed text-foreground [&_h2]:mt-12 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-10 [&_h3]:font-sans [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mt-2 [&_p]:mt-6 [&_ul]:mt-6 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />

        {item.tags.length > 0 && (
          <div className="mt-14 flex flex-wrap gap-2 border-t border-border pt-8">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">Press contact:</strong>{" "}
          <a className="underline" href="mailto:press@qatoto.com">
            press@qatoto.com
          </a>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <h2 className="mb-8 font-serif text-3xl font-semibold tracking-tight">More updates</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/press/${rel.slug}`}
                className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  {KIND_LABEL[rel.kind]} · {formatDate(rel.publishedAt)}
                </div>
                <h3 className="mt-4 font-serif text-xl leading-snug font-semibold tracking-tight">
                  {rel.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{rel.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
