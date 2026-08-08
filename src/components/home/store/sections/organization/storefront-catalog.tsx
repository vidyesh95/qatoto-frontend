// TRANSPORT: props-only — receives the parsed product page, fetches nothing.
//
// The seller's catalog. Two things worth stating, because both are easy to get wrong on
// a page like this:
//
// 1. PAGING IS THE SERVER'S. The response carries `nextCursor` / `hasMore` and this
//    component renders exactly the page it was handed. It never slices, sorts, filters
//    or re-ranks a fetched page client-side — the backend pages 24 at a time and a
//    client-side "filter" over one page silently lies about the other pages.
// 2. `hasVariants` decides whether the price reads as a "from" price. A buyer cannot
//    infer that from the number alone, and guessing wrong produces a 422 at add time,
//    which is why the backend ships the flag.

import Link from "next/link";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";
import type { StoreProductCard } from "@/lib/store/organizations.schemas";

const FEATURED_PRODUCT_COUNT = 4;

export default function StorefrontCatalog({
  products,
  page,
  organizationSlug,
}: {
  products: StoreProductCard[];
  page: { nextCursor: string | null; hasMore: boolean };
  organizationSlug: string;
}) {
  if (products.length === 0) {
    return (
      <StorefrontSection
        title="Catalog"
        attribution="declared"
        description="Listings this seller has published."
      >
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
          This seller has no published listings yet.
        </p>
      </StorefrontSection>
    );
  }

  const featuredProducts = products.slice(0, FEATURED_PRODUCT_COUNT);

  return (
    <>
      <StorefrontSection
        title="Featured products"
        attribution="declared"
        description="The seller's lead listings."
      >
        {/* Horizontal on mobile, a row of four at lg — same rail idiom as the rest of
            the store, but the tiles carry the B2B facts a buyer sorts on. */}
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
          {featuredProducts.map((product) => (
            <div key={product.id} className="w-44 shrink-0 lg:w-auto">
              <CatalogProductCard product={product} />
            </div>
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection
        title="All products"
        attribution="declared"
        description={`${products.length} of this seller's listings.`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <CatalogProductCard key={product.id} product={product} />
          ))}
        </div>

        {page.hasMore && page.nextCursor !== null && (
          <div className="mt-4 flex justify-center">
            {/* A link, not a button: the next page is the server's to compute, and the
                cursor belongs in the URL so the position is shareable and back-navigable. */}
            <Link
              href={`/store/organizations/${organizationSlug}?cursor=${encodeURIComponent(page.nextCursor)}`}
              className="rounded-full px-6 py-2.5 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-[#F2F4F4]"
            >
              Show more products
            </Link>
          </div>
        )}
      </StorefrontSection>
    </>
  );
}
