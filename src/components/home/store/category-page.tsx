import { notFound } from "next/navigation";
import { getCategory, getStoreHome } from "@/lib/store";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import CategoryRail from "@/components/home/store/rails/category-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import ProductRail from "@/components/home/store/rails/product-rail";

// Category drill-down body, driven by the catch-all route's last slug segment.
// Branch nodes render a sub-category grid; leaf nodes render product feeds.
// Either way the hero + pathways rail carry over, matching the design mocks.
export default async function CategoryPage({ slug }: { slug: string }) {
  const [view, home] = await Promise.all([getCategory(slug), getStoreHome()]);
  if (!view) notFound();

  const { children, pathways, rails } = view;
  const isLeaf = children.length === 0;

  return (
    <div className="space-y-8 pb-8">
      <HeroCarousel slides={home.hero} />
      {!isLeaf && <CategoryRail categories={children} />}
      <PathwaysRail pathways={pathways} />
      {rails.map((rail) => (
        <ProductRail key={rail.id} rail={rail} />
      ))}
    </div>
  );
}
