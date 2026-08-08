// TRANSPORT: props-only

import type { PublicProviderCard } from "@/lib/store/catalog.schemas";
import ProviderCard from "@/components/home/store/cards/provider-card";
import SectionHeader from "@/components/home/store/sections/section-header";

/**
 * The connector-provider shortcut rail on the store home.
 *
 * Renamed from `B2BRail` now that its contract is concrete: the backend sends up to eight
 * full `PublicProviderCard`s from the provider directory, not a list of icon links.
 *
 * No "see all" chevron — `/store/providers` is backend-ready with no page yet (§3.1).
 */
export default function ProviderShortcutRail({ providers }: { providers: PublicProviderCard[] }) {
  if (providers.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Trade services" />
      <div className="flex items-stretch gap-2 overflow-x-auto px-4 pb-1 lg:px-6">
        {providers.map((provider) => (
          <ProviderCard key={provider.organizationId} provider={provider} />
        ))}
      </div>
    </section>
  );
}
