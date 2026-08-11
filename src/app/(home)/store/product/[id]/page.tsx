import type { Metadata } from "next";

import ProductDetail from "@/components/home/store/product-detail";
import { prettifySlugForDisplay } from "@/lib/store";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreProduct } from "@/lib/store/products.api";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// NOTHING IS PRERENDERED. This used to return the one mock slug `lv-folding-chair`, which was the
// only product the page could render. The catalogue's slug universe is not enumerable at build time
// and there is no durable endpoint that lists it, so `withSentinelValues([])` yields the single
// sentinel `cacheComponents` needs to accept a dynamic segment at all — and that sentinel takes the
// same `notFound()` path a typo does.
export function generateStaticParams() {
  return withSentinelValues([]).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getStoreProduct(id);
  // A failed metadata read must not take the page down — the page renders its own error or 404.
  if (!result.success) {
    return { title: `${prettifySlugForDisplay(id)} · Store` };
  }
  return {
    title: `${result.data.title} · Store`,
    ...(result.data.description === null ? {} : { description: result.data.description }),
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail slug={id} />;
}
