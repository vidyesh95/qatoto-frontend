// TRANSPORT: server-fetch — awaits `getStoreHome`. NOTE the legacy getter: `src/lib/store.ts`
// reads an unset `QATOTO_STORE_API_URL` and silently falls back to mocks.
import { getStoreHome } from "@/lib/store";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import CategoryRail from "@/components/home/store/rails/category-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import BusinessToolsRail from "@/components/home/store/rails/business-tools-rail";
import ProductRail from "@/components/home/store/rails/product-rail";

// Store landing page body. Server component — data comes from the cached
// `getStoreHome` getter (mock fallback when no backend is configured).
export default async function StorePage() {
  const { hero, rootCategories, pathways, b2bLinks, rails } = await getStoreHome();

  return (
    <div className="space-y-8 pb-8">
      <HeroCarousel slides={hero} />
      <CategoryRail categories={rootCategories} />
      <PathwaysRail pathways={pathways} />
      {/* `b2bLinks` keeps its wire name — it is a field on the legacy `StoreHome` getter. The
          component that renders it does not have to. */}
      <BusinessToolsRail links={b2bLinks} />
      {rails.map((rail) => (
        <ProductRail key={rail.id} rail={rail} />
      ))}
    </div>
  );
}
