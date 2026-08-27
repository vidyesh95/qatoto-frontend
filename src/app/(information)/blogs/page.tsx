import Blogs from "@/components/information/blogs";
import { getBlogs } from "@/lib/cms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, how-tos, and field notes for founders, operators, and backers shipping with Qatoto.",
};

export default async function BlogsPage() {
  const posts = await getBlogs();
  const sorted = posts
    .map((post) => ({ post, t: new Date(post.publishedAt).getTime() }))
    .toSorted((a, b) => b.t - a.t)
    .map(({ post }) => post);
  return <Blogs posts={sorted} />;
}
