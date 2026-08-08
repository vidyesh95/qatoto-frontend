import type { Metadata } from "next";
import CategoryPage from "@/components/home/store/category-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getLastSlugSegment, prettifySlugForDisplay } from "@/lib/store/shared.schemas";

/**
 * `cacheComponents` requires at least one static param. Until the category tree API
 * can seed featured slugs, prerender the sentinel; real paths render on demand.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((slug) => ({ slug: [slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${prettifySlugForDisplay(getLastSlugSegment(slug))} · Store` };
}

// `searchParams` / dynamic slug: store `loading.tsx` is the Suspense boundary.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  return <CategoryPage slugSegments={slug} searchParams={searchParams} />;
}
