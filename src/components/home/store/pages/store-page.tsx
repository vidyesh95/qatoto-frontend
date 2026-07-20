import { getStoreHome } from "@/lib/store";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import CategoryRail from "@/components/home/store/rails/category-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import B2BRail from "@/components/home/store/rails/b2b-rail";
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
      <B2BRail links={b2bLinks} />
      {rails.map((rail) => (
        <ProductRail key={rail.id} rail={rail} />
      ))}
    </div>
  );
}
