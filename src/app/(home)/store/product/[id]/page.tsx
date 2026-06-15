import type { Metadata } from "next";
import ProductDetail from "@/components/home/store/pages/product-detail";

// Single mock product for the UI-building phase. Prerender the one id so the
// dynamic route is valid under cacheComponents.
export function generateStaticParams() {
  return [{ id: "lv-folding-chair" }];
}

function prettify(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${prettify(id)} · Store` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail slug={id} />;
}
