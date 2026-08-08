// TRANSPORT: mock

import SectionHeader from "@/components/home/store/sections/section-header";
import B2BTile from "@/components/home/store/cards/b2b-tile";
import { MOCK_BUSINESS_LINKS } from "@/mocks/store-mocks";

/**
 * "For your Business" — shortcuts into the B2B essentials surfaces.
 *
 * Distinct from `ProviderShortcutRail`, which renders real connector organizations from
 * `/store/home`'s `providerShortcuts`. This rail is navigation chrome; that one is directory data.
 * Both render on the store home.
 */
export default function B2BRail() {
  return (
    <section className="space-y-3">
      <SectionHeader title="For your Business" href="/store/categories" />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {MOCK_BUSINESS_LINKS.map((link) => (
          <B2BTile key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}
