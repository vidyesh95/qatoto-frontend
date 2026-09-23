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

import {
  formatCentsLabel,
  formatCountLabel,
  formatLeadTimeRangeLabel,
  formatPercentageLabel,
} from "@/lib/store/format";
import type { StoreProductCard } from "@/lib/store/organizations.schemas";
import {
  SAMPLE_POLICY_LABELS,
  SELLING_STATE_LABELS,
  STOCK_STATE_LABELS,
} from "@/lib/store/organizations.schemas";

export default function CatalogProductCard({ product }: { product: StoreProductCard }) {
  const leadTimeLabel = formatLeadTimeRangeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);
  const onTimeRate = product.fulfillmentMetrics.onTimeShipmentRate;

  return (
    <Link
      href={`/store/product/${product.publicSlug}`}
      className="group flex flex-col rounded-xl outline -outline-offset-1 outline-border transition-colors hover:outline-blue-600"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted">
        {product.mainImageUrl && (
          <Image
            src={product.mainImageUrl}
            fill
            sizes="(min-width: 1024px) 264px, 45vw"
            alt={product.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {/*
          §21.2. SELLING STATE OUTRANKS STOCK STATE, and only one badge shows. "Low stock" on a
          discontinued listing is true and useless — it describes the last few units of something
          nobody can order. The stronger fact wins the corner rather than stacking two badges the
          buyer has to reconcile.

          `selling` renders nothing, like `in_stock`: the ordinary case on every tile is noise.
        */}
        {product.sellingState !== "selling" ? (
          <span className="absolute top-2 left-2 rounded bg-destructive px-2 py-0.5 text-xs leading-4 font-medium tracking-wider text-white">
            {SELLING_STATE_LABELS[product.sellingState]}
          </span>
        ) : (
          product.stockState !== "in_stock" && (
            <span className="absolute top-2 left-2 rounded bg-white/90 px-2 py-0.5 text-xs leading-4 font-medium tracking-wider text-muted-foreground">
              {STOCK_STATE_LABELS[product.stockState]}
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        <p className="line-clamp-2 text-sm leading-5 font-medium text-foreground">
          {product.title}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-1.5">
          {product.hasVariants && (
            <span className="text-xs leading-4 text-outline-strong">From</span>
          )}
          <span className="text-sm leading-5 font-medium text-foreground">
            {formatCentsLabel(product.priceInCents, product.currency)}
          </span>
          {product.compareAtPriceInCents !== null && (
            <span className="text-xs leading-4 text-outline-strong line-through">
              {formatCentsLabel(product.compareAtPriceInCents, product.currency)}
            </span>
          )}
        </div>

        {product.minimumOrderQuantity !== null && (
          <p className="text-xs leading-4 text-outline-strong">
            Minimum order {formatCountLabel(product.minimumOrderQuantity)} units
          </p>
        )}

        {leadTimeLabel && <p className="text-xs leading-4 text-outline-strong">{leadTimeLabel}</p>}

        {/* A13. ON-TIME DELIVERY — the same null rule as the rating above, for the same reason.
            `onTimeShipmentRate: null` means not enough scored orders, or a seller who declared no
            lead time so their orders carry no promise to score. Printing 0% would publish a failure
            they never earned; printing nothing at all would hide that they have delivered. The
            completed count is what covers the second case. This was computed on every read and
            discarded by the card schema until now. */}
        {onTimeRate === null ? (
          product.fulfillmentMetrics.completedOrderCount > 0 && (
            <p className="text-xs leading-4 text-outline-strong">
              {formatCountLabel(product.fulfillmentMetrics.completedOrderCount)} completed
            </p>
          )
        ) : (
          <p className="text-xs leading-4 text-outline-strong">
            {formatPercentageLabel(onTimeRate)} on time across{" "}
            {formatCountLabel(product.fulfillmentMetrics.onTimeSampleSize)} orders
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {product.reviewMetrics.averageRating !== null && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-muted-foreground px-1 py-0.5 text-xs leading-4 font-medium text-white">
              {product.reviewMetrics.averageRating.toFixed(1)}
              <span aria-hidden>★</span>
            </span>
          )}
          {product.samplePolicy !== "unavailable" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs leading-4 font-medium tracking-wider text-primary-imprint">
              {SAMPLE_POLICY_LABELS[product.samplePolicy]}
            </span>
          )}
          {product.variantCount > 0 && (
            <span className="text-xs leading-4 text-outline-strong">
              {product.variantCount} options
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
