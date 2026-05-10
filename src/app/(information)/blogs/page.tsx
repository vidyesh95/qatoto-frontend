import Blogs from "@/components/information/blogs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blogs | Qatoto",
  description: "Blogs page for Qatoto",
};

export default function BlogsPage() {
  return <Blogs />;
}
