import Blogs from "@/components/information/blogs";
import { getBlogs } from "@/lib/cms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Qatoto",
  description:
    "Tips, how-tos, and field notes for founders, operators, and backers shipping with Qatoto.",
};

export default async function BlogsPage() {
  const posts = await getBlogs();
  const sorted = [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return <Blogs posts={sorted} />;
}
