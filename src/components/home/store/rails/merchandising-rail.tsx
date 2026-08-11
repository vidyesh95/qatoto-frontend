// TRANSPORT: props-only — renders the rail it is handed, no network.
//
// One home-page rail. Replaces the legacy `ProductRail` on this surface, and the difference is not
// cosmetic: a rail's items are a FOUR-ARM UNION — product, provider offering, category,
// organization — and the old component could only render the first. `store_merchandising_entity_kind`
// has admitted all four since Phase 1, so a merchandiser placing a category in a rail saw nothing
// rendered and got no error anywhere. `MerchandisingItemCard` switches over the union exhaustively,
// which is what keeps that class of bug from coming back.
//
// The "see all" goes to `/store/rails/<slug>`, which is the read that carries a cursor — the home
// payload returns each rail's first twelve items and no page envelope at all.

import MerchandisingItemCard from "@/components/home/store/cards/merchandising-item-card";
import SectionHeader from "@/components/home/store/sections/section-header";
import type { StoreHomeRail } from "@/lib/store/merchandising.schemas";

export default function MerchandisingRail({ rail }: { rail: StoreHomeRail }) {
  // AN EMPTY RAIL IS NOT A FAILED READ. `trending_placeholder` returns an empty list
  // unconditionally and always will — it is kept forever so that backing the ranking engine out is
  // a per-rail data edit rather than a deploy. Render nothing; never an error.
  if (rail.items.length === 0) return null;

  return (
    <section className="space-y-1">
      <SectionHeader title={rail.title} href={`/store/rails/${rail.slug}`} />
      <ul className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {rail.items.map((item) => (
          // `entityKind` plus `entityId` is the identity: two arms could carry the same id.
          //
          // The width lives HERE, not on the card. `MerchandisingItemCard` is written `h-full` and
          // width-less so the same tile works in this scroller and in `/store/rails/:slug`'s grid;
          // a fixed width baked into the card would break the grid it was designed for.
          <li key={`${item.entityKind}-${item.entityId}`} className="w-44 shrink-0 sm:w-52">
            <MerchandisingItemCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
