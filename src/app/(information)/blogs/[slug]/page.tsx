import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogDetail from "@/components/information/blog-detail";
import { getBlog, getBlogs } from "@/lib/cms";
import { SITE_URL } from "@/lib/site";
import { StructuredData, buildArticleStructuredData } from "@/lib/structured-data";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const posts = await getBlogs();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlog(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    // Relative, resolved against `metadataBase` in the root layout. One canonical URL per post, so
    // a link carrying a tracking query does not become a second indexed copy of the same article.
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getBlog(slug), getBlogs()]);
  if (!post) notFound();

  const related = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <StructuredData
        data={buildArticleStructuredData({
          headline: post.title,
          description: post.excerpt,
          canonicalUrl: `${SITE_URL}/blogs/${post.slug}`,
          publishedAt: post.publishedAt,
          imageUrl: post.coverImage,
          authorName: post.author.name,
        })}
      />
      <BlogDetail post={post} related={related} />
    </>
  );
}
