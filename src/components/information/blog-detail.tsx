import Link from "next/link";
import Image from "next/image";
import { type BlogPost, formatDate } from "@/lib/cms";

const CATEGORY_LABEL: Record<BlogPost["category"], string> = {
  tips: "Tips",
  "how-to": "How-to",
  guide: "Guide",
  "deep-dive": "Deep dive",
  story: "Story",
};

export default function BlogDetail({ post, related }: { post: BlogPost; related: BlogPost[] }) {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← All posts
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="rounded-full bg-primary/40 px-3 py-1 text-foreground">
              {CATEGORY_LABEL[post.category]}
            </span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h1 className="mt-6 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p>
          <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
            {post.author.avatar ? (
              <Image
                src={post.author.avatar}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/40 text-sm font-semibold">
                {post.author.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">{post.author.name}</div>
              {post.author.role && (
                <div className="text-xs text-muted-foreground">{post.author.role}</div>
              )}
            </div>
          </div>
        </header>

        {post.coverImage && (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl bg-muted">
            <Image
              src={post.coverImage}
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
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {post.tags.length > 0 && (
          <div className="mt-14 flex flex-wrap gap-2 border-t border-border pt-8">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <h2 className="mb-8 font-serif text-3xl font-semibold tracking-tight">Keep reading</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((post) => (
              <Link
                key={post.slug}
                href={`/blogs/${post.slug}`}
                className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {CATEGORY_LABEL[post.category]} · {post.readingMinutes} min
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold leading-snug tracking-tight">
                  {post.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
