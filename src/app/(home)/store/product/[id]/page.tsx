import type { Metadata } from "next";

import ProductDetail from "@/components/home/store/product-detail";
import { prettifySlugForDisplay } from "@/lib/store";
import { SITE_URL } from "@/lib/site";
import { withSentinelValues } from "@/lib/static-params";
import { StructuredData, buildProductStructuredData } from "@/lib/structured-data";
import { getStoreProduct } from "@/lib/store/products.api";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// NOTHING IS PRERENDERED. This used to return the one mock slug `lv-folding-chair`, which was the
// only product the page could render. The catalogue's slug universe is not enumerable at build time
// and there is no durable endpoint that lists it, so `withSentinelValues([])` yields the single
// sentinel `cacheComponents` needs to accept a dynamic segment at all — and that sentinel takes the
// same `notFound()` path a typo does.
//
// "NOT ENUMERABLE" IS ABOUT THIS FUNCTION, NOT ABOUT THE SURFACE. `src/app/sitemap.ts` DOES
// enumerate every product, through `GET /store/search` with `documentKind: "product"` — public,
// cursor-paged, and `hit.publicSlug` is exactly this segment. The economics differ: prerendering
// the whole catalogue at build time is not worth it, while announcing it to a crawler is.
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
    // The segment holds the product's public slug, so the canonical is the URL as addressed. It
    // matters most here: a product is reachable from rails, categories, pathways and search, and
    // every one of those can append its own query string.
    alternates: { canonical: `/store/product/${id}` },
  };
}

/**
 * schema.org stock states, for the ones the wire can be mapped to honestly.
 *
 * `made_to_order` IS DELIBERATELY ABSENT. schema.org's nearest neighbours are `PreOrder` and
 * `BackOrder`, and both mean "ordered now, shipped later from a batch that exists" — made-to-order
 * means nothing exists until the order does. There is no correct value, so the field is omitted and
 * a crawler is told nothing rather than something close.
 */
const SCHEMA_AVAILABILITY_BY_STOCK_STATE: Partial<Record<string, string>> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  unavailable: "https://schema.org/OutOfStock",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A SECOND READ, AND IT IS FREE: `getStoreProduct` is the same call `generateMetadata` just made,
  // and both are deduped inside one render pass. A failed read renders the page without structured
  // data rather than blocking it — the page has its own error state and it is the one a human sees.
  const productResult = await getStoreProduct(id);

  return (
    <>
      {productResult.success && (
        <StructuredData
          data={buildProductStructuredData({
            name: productResult.data.title,
            description: productResult.data.description,
            canonicalUrl: `${SITE_URL}/store/product/${id}`,
            imageUrl: productResult.data.mainImageUrl,
            sellerName: productResult.data.seller.displayName,
            // A "FROM" PRICE IS NOT A PRICE. `hasVariants` means `priceInCents` is the cheapest
            // variant and a buyer must choose one before anything can be added to a cart, so
            // publishing it as THE offer price advertises a number no order can be placed at.
            // Such a product publishes its identity and no offer at all.
            priceInCents: productResult.data.hasVariants ? null : productResult.data.priceInCents,
            currency: productResult.data.hasVariants ? null : productResult.data.currency,
            availability: SCHEMA_AVAILABILITY_BY_STOCK_STATE[productResult.data.stockState],
          })}
        />
      )}
      <ProductDetail slug={id} />
    </>
  );
}
