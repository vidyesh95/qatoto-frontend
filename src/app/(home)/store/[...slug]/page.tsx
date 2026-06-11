import type { Metadata } from "next";
import CategoryPage from "@/components/home/store/category-page";

// Catch-all category route. Slugs are globally unique, so the last segment is
// the node to render — the URL still nests for breadcrumbs/shareability
// (/store/furniture/home-furniture/chairs).
function lastSlug(slug: string[]): string {
  return slug[slug.length - 1] ?? "";
}

function prettify(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${prettify(lastSlug(slug))} · Store` };
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <CategoryPage slug={lastSlug(slug)} />;
}
