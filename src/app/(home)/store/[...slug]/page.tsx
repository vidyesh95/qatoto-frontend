import type { Metadata } from "next";
import CategoryPage from "@/components/home/store/pages/category-page";
import { getCategorySlugs, getLastSlugSegment, prettifySlugForDisplay } from "@/lib/store";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug: [slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${prettifySlugForDisplay(getLastSlugSegment(slug))} · Store` };
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <CategoryPage slug={getLastSlugSegment(slug)} />;
}
