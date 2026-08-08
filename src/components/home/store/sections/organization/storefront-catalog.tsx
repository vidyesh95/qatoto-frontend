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

import Image from "next/image";
import Link from "next/link";

import type { StoreProductCard } from "@/lib/store/organizations.schemas";
import {
  formatCentsLabel,
  SAMPLE_POLICY_LABELS,
  STOCK_STATE_LABELS,
} from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

const FEATURED_PRODUCT_COUNT = 4;

function formatLeadTimeLabel(product: StoreProductCard): string | null {
  if (product.leadTimeMinDays === null && product.leadTimeMaxDays === null) return null;
  if (product.leadTimeMinDays !== null && product.leadTimeMaxDays !== null) {
    return `Ships in ${product.leadTimeMinDays}–${product.leadTimeMaxDays} days`;
  }
  const knownLeadTime = product.leadTimeMinDays ?? product.leadTimeMaxDays;
  return `Ships in about ${knownLeadTime} days`;
}

function CatalogProductCard({ product }: { product: StoreProductCard }) {
  const leadTimeLabel = formatLeadTimeLabel(product);

  return (
    <Link
      href={`/store/product/${product.publicSlug}`}
      className="group flex flex-col rounded-xl outline -outline-offset-1 outline-[#E0E3E3] transition-colors hover:outline-[#2A76FD]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-[#F5F5F5]">
        {product.mainImageUrl && (
          <Image
            src={product.mainImageUrl}
            fill
            sizes="(min-width: 1024px) 264px, 45vw"
            alt={product.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {product.stockState !== "in_stock" && (
          <span className="absolute top-2 left-2 rounded bg-white/90 px-2 py-0.5 text-[11px] leading-4 font-medium tracking-[0.5px] text-[#4A6364]">
            {STOCK_STATE_LABELS[product.stockState]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        <p className="line-clamp-2 text-sm leading-5 font-medium text-[#191C1C]">{product.title}</p>

        <div className="flex flex-wrap items-baseline gap-x-1.5">
          {product.hasVariants && (
            <span className="text-[11px] leading-4 text-[#6F7979]">From</span>
          )}
          <span className="text-sm leading-5 font-medium text-[#191C1C]">
            {formatCentsLabel(product.priceInCents, product.currency)}
          </span>
          {product.compareAtPriceInCents !== null && (
            <span className="text-[11px] leading-4 text-[#6F7979] line-through">
              {formatCentsLabel(product.compareAtPriceInCents, product.currency)}
            </span>
          )}
        </div>

        {product.minimumOrderQuantity !== null && (
          <p className="text-[11px] leading-4 text-[#6F7979]">
            Minimum order {product.minimumOrderQuantity.toLocaleString("en-US")} units
          </p>
        )}

        {leadTimeLabel && <p className="text-[11px] leading-4 text-[#6F7979]">{leadTimeLabel}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {product.reviewMetrics.averageRating !== null && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-[#4A6364] px-1 py-0.5 text-[11px] leading-4 font-medium text-white">
              {product.reviewMetrics.averageRating.toFixed(1)}
              <span aria-hidden>★</span>
            </span>
          )}
          {product.samplePolicy !== "unavailable" && (
            <span className="rounded bg-[#F2F4F4] px-1.5 py-0.5 text-[11px] leading-4 font-medium tracking-[0.4px] text-[#00696E]">
              {SAMPLE_POLICY_LABELS[product.samplePolicy]}
            </span>
          )}
          {product.variantCount > 0 && (
            <span className="text-[11px] leading-4 text-[#6F7979]">
              {product.variantCount} options
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

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
