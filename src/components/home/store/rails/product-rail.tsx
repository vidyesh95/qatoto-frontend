// TRANSPORT: props-only

import SectionHeader from "@/components/home/store/sections/section-header";
import ProductCard from "@/components/home/store/cards/product-card";
import type { StoreProductTile } from "@/lib/store/tiles";

/**
 * A horizontally scrolling product feed.
 *
 * Takes tiles rather than a rail object so both real and mock callers can use it: the PDP's
 * recommendation rails and a category page's named rails are mock, while a caller with parsed
 * catalog data maps through `toProductTiles` first.
 *
 * `seeAllHref` is optional — omit it when the destination page does not exist.
 */
export default function ProductRail({
  title,
  tiles,
  seeAllHref,
}: {
  title: string;
  tiles: readonly StoreProductTile[];
  seeAllHref?: string;
}) {
  if (tiles.length === 0) return null;

  return (
    <section className="space-y-1">
      <SectionHeader title={title} href={seeAllHref} />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {tiles.map((tile) => (
          <ProductCard key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
