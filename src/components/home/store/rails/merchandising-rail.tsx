// TRANSPORT: props-only

import type { StoreHomeRail } from "@/lib/store/catalog.schemas";
import MerchandisingItemCard from "@/components/home/store/cards/merchandising-item-card";
import SectionHeader from "@/components/home/store/sections/section-header";

/**
 * A home rail.
 *
 * An empty rail renders nothing rather than an empty strip. That is normal, not a failure:
 * the `trending_placeholder` strategy always returns zero items by design, and a curated
 * rail whose placements have all become ineligible legitimately empties out.
 *
 * The header links to `/store/rails/[railSlug]` — a shipped backend route whose page is not
 * built yet, so `seeAllHref` is omitted by the caller until it is.
 */
export default function MerchandisingRail({
  rail,
  seeAllHref,
}: {
  rail: StoreHomeRail;
  seeAllHref?: string;
}) {
  if (rail.items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title={rail.title} href={seeAllHref} />
      <div className="flex items-stretch gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {rail.items.map((item, itemIndex) => (
          <MerchandisingItemCard
            key={`${item.entityKind}-${item.entityId}`}
            item={item}
            accentIndex={itemIndex}
          />
        ))}
      </div>
    </section>
  );
}
