import SectionHeader from "@/components/home/store/sections/section-header";
import B2BTile from "@/components/home/store/cards/b2b-tile";
import type { B2BLink } from "@/types/store";

// "For your Business" — shortcuts into the B2B essentials surfaces (RFQ,
// logistics, factories, forum, find-cofounder).
export default function B2BRail({ links }: { links: B2BLink[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="For your Business" href="/store/categories" />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {links.map((link) => (
          <B2BTile key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}
