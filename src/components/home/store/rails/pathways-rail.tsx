// TRANSPORT: props-only — renders the pathways it is handed, no network.
import PathwayCard from "@/components/home/store/cards/pathway-card";
import SectionHeader from "@/components/home/store/sections/section-header";
import type { StoreHomePathwayCard } from "@/lib/store/merchandising.schemas";

// "Pathways for you" — horizontally scrolling rail of guided sets.
export default function PathwaysRail({ pathways }: { pathways: readonly StoreHomePathwayCard[] }) {
  // A store with no active pathways is a setup state, not a message a buyer needs. Rendering the
  // header over an empty scroller would present it as one.
  if (pathways.length === 0) return null;

  return (
    <section className="space-y-1">
      <SectionHeader title="Pathways for you" href="/store/pathways" />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {pathways.map((pathway) => (
          <PathwayCard key={pathway.id} pathway={pathway} />
        ))}
      </div>
    </section>
  );
}
