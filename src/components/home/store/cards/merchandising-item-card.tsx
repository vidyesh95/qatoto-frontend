// TRANSPORT: props-only

import type { MerchandisingItem } from "@/lib/store/catalog.schemas";
import { toProductTile } from "@/lib/store/tiles";
import OfferingCard from "@/components/home/store/cards/offering-card";
import PathwayItemCard from "@/components/home/store/cards/pathway-item-card";
import ProductCard from "@/components/home/store/cards/product-card";

/**
 * One item from a rail or a pathway.
 *
 * A merchandising item is a discriminated union, not a product — a curated rail can mix physical
 * listings with connector service offerings. The `never` default is what keeps a future third
 * variant from silently rendering nothing.
 *
 * `variant="pathway"` swaps the product tile for the badge-and-plus card the pathway page uses.
 */
export default function MerchandisingItemCard({
  item,
  accentIndex,
  variant = "rail",
}: {
  item: MerchandisingItem;
  accentIndex: number;
  variant?: "rail" | "pathway";
}) {
  switch (item.entityKind) {
    case "product": {
      const tile = toProductTile(item.product, accentIndex);
      if (variant === "pathway") {
        return <PathwayItemCard tile={tile} categoryLabel={item.product.category.name} />;
      }
      return <ProductCard tile={tile} />;
    }
    case "provider_offering":
      return <OfferingCard offering={item.offering} provider={item.provider} />;
    default: {
      const exhaustiveEntityKind: never = item;
      return exhaustiveEntityKind;
    }
  }
}
