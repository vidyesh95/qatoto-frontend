import SectionHeader from "@/components/home/store/section-header";
import StoreCategoryCard from "@/components/home/store/store-category-card";
import type { StoreCategory } from "@/lib/store";

// Root "Categories" strip: a fixed 4-column row of top-level category tiles.
export default function CategoryRail({ categories }: { categories: StoreCategory[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Categories" href="/store/categories" />
      <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 px-4 lg:px-6">
        {categories.map((category) => (
          <StoreCategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
