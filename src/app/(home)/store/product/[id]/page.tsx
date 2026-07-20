import type { Metadata } from "next";
import ProductDetail from "@/components/home/store/pages/product-detail";
import { prettifySlugForDisplay } from "@/lib/store";

// Single mock product for the UI-building phase. Prerender the one id so the
// dynamic route is valid under cacheComponents.
export function generateStaticParams() {
  return [{ id: "lv-folding-chair" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${prettifySlugForDisplay(id)} · Store` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail slug={id} />;
}
