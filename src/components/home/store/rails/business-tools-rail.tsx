// TRANSPORT: props-only — renders the store's own navigation manifest, no network.
//
// "For your Business" — the store's six business tools, as a scrolling row of tiles.
//
// IT TAKES NO PROPS, AND THAT IS THE FIX. The links used to arrive as `b2bLinks` on the legacy
// `getStoreHome` payload, which made them look like merchandising data a backend served. They are
// not: `GET /store/home` has no such member and never had one. They are the store's own information
// architecture, they live in `src/lib/store/business-tools.ts`, and threading them through a fetch
// meant an unreachable backend could empty the store's own navigation.
//
// One manifest feeds BOTH this rail and the `/store/business` index, so a tile and its index card
// cannot disagree about where a tool lives.

import BusinessToolTile from "@/components/home/store/cards/business-tool-tile";
import SectionHeader from "@/components/home/store/sections/section-header";
import { BUSINESS_TOOLS } from "@/lib/store/business-tools";

export default function BusinessToolsRail() {
  return (
    <section className="space-y-3">
      <SectionHeader title="For your Business" href="/store/business" />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {BUSINESS_TOOLS.map((tool) => (
          <BusinessToolTile key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
