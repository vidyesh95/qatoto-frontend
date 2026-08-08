// TRANSPORT: props-only

import type { StorePathway } from "@/lib/store/catalog.schemas";
import PathwayCard from "@/components/home/store/cards/pathway-card";
import SectionHeader from "@/components/home/store/sections/section-header";

export default function PathwaysRail({ pathways }: { pathways: StorePathway[] }) {
  if (pathways.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* No "see all" — /store/pathways is backend-ready with no page yet (§3.1). */}
      <SectionHeader title="Pathways for you" />
      <div className="flex items-stretch gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {pathways.map((pathway, pathwayIndex) => (
          <PathwayCard key={pathway.id} pathway={pathway} accentIndex={pathwayIndex} />
        ))}
      </div>
    </section>
  );
}
