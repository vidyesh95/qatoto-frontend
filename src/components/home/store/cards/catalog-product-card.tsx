// TRANSPORT: props-only — receives a parsed card, fetches nothing.
//
// The B2B product tile. EXTRACTED from `sections/organization/storefront-catalog.tsx`,
// where it was a private function, because search results and the category grid render the
// same `StoreProductCard` and a second copy would drift on the two things that carry
// meaning here rather than styling:
//
// 1. `hasVariants` decides whether the price reads as a "FROM" price. A buyer cannot infer
//    that from the number, and guessing wrong produces a 422 at add-to-cart — which is the
//    whole reason the backend ships the flag next to the price.
// 2. `averageRating: null` means NOT ENOUGH DATA and renders nothing. A copy that printed
//    `0.0 ★` would invent a bad review out of an absent one.
//
// It links to `/store/product/<publicSlug>` — the immutable public slug, never a
// seller-internal id.

import Image from "next/image";
import Link from "next/link";

import { formatCentsLabel, formatCountLabel, formatLeadTimeRangeLabel } from "@/lib/store/format";
import type { StoreProductCard } from "@/lib/store/organizations.schemas";
import { SAMPLE_POLICY_LABELS, STOCK_STATE_LABELS } from "@/lib/store/organizations.schemas";

export default function CatalogProductCard({ product }: { product: StoreProductCard }) {
  const leadTimeLabel = formatLeadTimeRangeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);

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
        {/* Only an unusual stock state is worth a badge — "In stock" on every tile is noise. */}
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
            Minimum order {formatCountLabel(product.minimumOrderQuantity)} units
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
