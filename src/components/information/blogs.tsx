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

export default function Blogs({ posts }: { posts: BlogPost[] }) {
  const [featured, ...rest] = posts;

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-primary)_0%,transparent_60%)] opacity-70"
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Qatoto Blog
          </span>
          <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Tips, how-tos, and field notes from the build floor.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Practical writing for founders, operators, and backers — pulled from real Qatoto teams
            shipping real products.
          </p>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">No posts yet.</h2>
            <p className="mt-3 text-muted-foreground">
              Check back soon — the writing wall is being filled.
            </p>
          </div>
        </section>
      ) : (
        <>
          {featured && (
            <section className="mx-auto max-w-6xl px-6 pb-16">
              <Link
                href={`/blogs/${featured.slug}`}
                className="group grid gap-8 rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-2 md:p-8"
              >
                <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-muted">
                  {featured.coverImage ? (
                    <Image
                      src={featured.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_30%,var(--color-secondary)_0%,transparent_60%),radial-gradient(40%_40%_at_80%_70%,var(--color-primary)_0%,transparent_60%)]" />
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="rounded-full bg-primary/40 px-3 py-1 text-foreground">
                      {CATEGORY_LABEL[featured.category]}
                    </span>
                    <span>{formatDate(featured.publishedAt)}</span>
                    <span>·</span>
                    <span>{featured.readingMinutes} min read</span>
                  </div>
                  <h2 className="mt-5 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-sm font-medium">{featured.author.name}</span>
                    {featured.author.role && (
                      <span className="text-sm text-muted-foreground">
                        · {featured.author.role}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </section>
          )}

          {rest.length > 0 && (
            <section className="mx-auto max-w-6xl px-6 pb-32">
              <div className="mb-10 flex items-end justify-between">
                <h2 className="font-serif text-3xl font-semibold tracking-tight">More writing</h2>
                <span className="text-sm text-muted-foreground">{posts.length} posts</span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <article
                    key={post.slug}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/blogs/${post.slug}`} className="flex h-full flex-col">
                      <div className="relative aspect-16/10 bg-muted">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_30%,var(--color-accent)_0%,transparent_60%),radial-gradient(40%_40%_at_80%_70%,var(--color-secondary)_0%,transparent_60%)]" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          <span className="rounded-full bg-primary/40 px-2.5 py-0.5 text-foreground">
                            {CATEGORY_LABEL[post.category]}
                          </span>
                          <span>{post.readingMinutes} min</span>
                        </div>
                        <h3 className="mt-4 font-serif text-xl font-semibold leading-snug tracking-tight">
                          {post.title}
                        </h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between pt-6 text-sm">
                          <span className="font-medium">{post.author.name}</span>
                          <span className="text-muted-foreground">
                            {formatDate(post.publishedAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
