// TRANSPORT: props-only — renders the links it is handed, no network.
//
// "For your Business" — the store's six business tools, as a scrolling row of tiles.
//
// RENAMED FROM `B2BRail`, which STORE_STRUCTURE.md §7.1 asked for "when its contract is concrete".
// It is concrete now: the six destinations live in `src/lib/store/business-tools.ts`, four of them
// resolve to routes that were built alongside this rename, and the "see all" below has a page of
// its own for the first time.
//
// THE `href` HERE USED TO BE `/store/categories`, which is the PRODUCT category index. A see-all on
// a business-tools rail landing in the product catalogue is the kind of wrong that typechecks — the
// destination is a real page, just not this rail's.

import SectionHeader from "@/components/home/store/sections/section-header";
import BusinessToolTile from "@/components/home/store/cards/business-tool-tile";
import type { B2BLink } from "@/types/store";

export default function BusinessToolsRail({ links }: { links: B2BLink[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="For your Business" href="/store/business" />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {links.map((link) => (
          <BusinessToolTile key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}
