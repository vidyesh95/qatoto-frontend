import type { Metadata } from "next";
import ProductDetail from "@/components/home/store/product-detail";
import { withSentinelValues } from "@/lib/static-params";
import { prettifySlugForDisplay } from "@/lib/store/shared.schemas";

export function generateStaticParams() {
  return withSentinelValues([]).map((productSlug) => ({ productSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;
  return { title: `${prettifySlugForDisplay(productSlug)} · Store` };
}

export default async function Page({ params }: { params: Promise<{ productSlug: string }> }) {
  const { productSlug } = await params;
  return <ProductDetail productSlug={productSlug} />;
}
