// TRANSPORT: props-only

import Image from "next/image";
import Link from "next/link";
import type { StoreProductTile } from "@/lib/store/tiles";
import { hoverTintForIndex } from "@/lib/store/tiles";

/**
 * Product tile for horizontal rails and catalog grids.
 *
 * Takes a `StoreProductTile` rather than a parsed `StoreProductCard` so one component serves both
 * the real catalog and the rails the backend cannot feed yet — without a mock rail having to
 * fabricate a seller or review metrics to satisfy the schema type.
 *
 * A tile with `href: null` renders unlinked. That is how mock tiles behave: their destination would
 * be a 404 the visitor could not tell apart from a withdrawn listing.
 */
export default function ProductCard({
  tile,
  layout = "rail",
}: {
  tile: StoreProductTile;
  layout?: "rail" | "grid";
}) {
  const layoutClass =
    layout === "grid"
      ? "group relative flex w-full flex-col"
      : "group relative flex w-40 shrink-0 flex-col sm:w-48";

  const body = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${hoverTintForIndex(tile.accentIndex)}`}
      />
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted">
        {tile.imageUrl ? (
          <Image
            src={tile.imageUrl}
            fill
            sizes="(min-width: 640px) 192px, 160px"
            alt={tile.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-sm font-semibold">{tile.title}</p>
        {tile.secondaryLabel ? (
          <p className="truncate text-xs text-foreground/60">{tile.secondaryLabel}</p>
        ) : null}
        <p className="mt-0.5 text-sm font-medium">{tile.priceLabel}</p>
        {/* A null MOQ is a product the seller set no minimum on — not a minimum of zero. */}
        {tile.minimumOrderQuantity !== null ? (
          <p className="text-[11px] text-foreground/55">MOQ {tile.minimumOrderQuantity}</p>
        ) : null}
      </div>
    </>
  );

  if (tile.href === null) {
    return <div className={layoutClass}>{body}</div>;
  }

  return (
    <Link href={tile.href} className={layoutClass}>
      {body}
    </Link>
  );
}
