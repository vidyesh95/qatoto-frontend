import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogDetail from "@/components/information/blog-detail";
import { getBlog, getBlogs } from "@/lib/cms";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlog(slug);
  if (!post) return { title: "Post not found | Qatoto" };
  return {
    title: `${post.title} | Qatoto Blog`,
    description: post.excerpt,
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
  const post = await getBlog(slug);
  if (!post) notFound();

  const all = await getBlogs();
  const related = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return <BlogDetail post={post} related={related} />;
}
