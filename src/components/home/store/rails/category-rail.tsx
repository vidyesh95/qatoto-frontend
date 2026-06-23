import SectionHeader from "@/components/home/store/sections/section-header";
import StoreCategoryCard from "@/components/home/store/cards/store-category-card";
import type { StoreCategory } from "@/types/store";

// Root "Categories" strip: a fixed 4-column row of top-level category tiles.
export default function CategoryRail({ categories }: { categories: StoreCategory[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Categories" href="/store/categories" />
      <div className="grid grid-cols-4 gap-3 px-4 lg:grid-cols-6 lg:px-6 xl:grid-cols-8">
        {categories.map((category) => (
          <StoreCategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
