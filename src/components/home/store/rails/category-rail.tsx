// TRANSPORT: props-only — renders the categories it is handed, no network.
import SectionHeader from "@/components/home/store/sections/section-header";
import CategoryCard from "@/components/home/store/cards/category-card";
import type { StoreCategory } from "@/lib/store/catalog.schemas";

/**
 * Root "Categories" strip: a fixed row of top-level category tiles.
 *
 * WHAT ARRIVES HERE IS ALREADY THE RIGHT EIGHT, in the right order — the caller asks the
 * server for `limit: 8` and the server answers in `siblingOrder`. This component neither
 * sorts nor slices: doing either would let the rail disagree with the admin screen that set
 * the arrangement, with no way to say which was right.
 */
export default function CategoryRail({ categories }: { categories: readonly StoreCategory[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Categories" href="/store/categories" />
      <div className="grid grid-cols-4 gap-3 px-4 lg:grid-cols-6 lg:px-6 xl:grid-cols-8">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
