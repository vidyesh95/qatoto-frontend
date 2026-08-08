// TRANSPORT: props-only

import type { StoreCategory } from "@/lib/store/catalog.schemas";
import CategoryCard from "@/components/home/store/cards/category-card";
import SectionHeader from "@/components/home/store/sections/section-header";

/**
 * A strip of category tiles.
 *
 * `layout="grid"` is the store home's fixed 4/6/8-column row; `layout="rail"` is the horizontally
 * scrolling variant used for a deep subcategory list, where a fixed grid would wrap into a wall.
 */
export default function CategoryRail({
  categories,
  title = "Categories",
  seeAllHref = "/store/categories",
  trailPrefix = [],
  layout = "grid",
}: {
  categories: StoreCategory[];
  title?: string;
  seeAllHref?: string;
  trailPrefix?: readonly string[];
  layout?: "rail" | "grid";
}) {
  if (categories.length === 0) return null;

  const containerClass =
    layout === "grid"
      ? "grid grid-cols-4 gap-3 px-4 lg:grid-cols-6 lg:px-6 xl:grid-cols-8"
      : "flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6";

  return (
    <section className="space-y-3">
      <SectionHeader title={title} href={seeAllHref} />
      <div className={containerClass}>
        {categories.map((category, categoryIndex) => (
          <CategoryCard
            key={category.id}
            category={category}
            accentIndex={categoryIndex}
            trailPrefix={trailPrefix}
            layout={layout}
          />
        ))}
      </div>
    </section>
  );
}
