import SectionHeader from "@/components/home/store/sections/section-header";
import PathwayCard from "@/components/home/store/cards/pathway-card";
import type { Pathway } from "@/lib/store";

// "Pathways for you" — horizontally scrolling rail of guided looks/sets.
export default function PathwaysRail({ pathways }: { pathways: Pathway[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="Pathways for you" href="/store/pathways" />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {pathways.map((pathway) => (
          <PathwayCard key={pathway.slug} pathway={pathway} />
        ))}
      </div>
    </section>
  );
}
