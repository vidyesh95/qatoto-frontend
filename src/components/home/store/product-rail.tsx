import SectionHeader from "@/components/home/store/section-header";
import ProductCard from "@/components/home/store/product-card";
import type { ProductRail as ProductRailData } from "@/lib/store";

// Reusable horizontally scrolling product feed. One instance per feed
// (What's New, Popular, For You, Trending, Best Sellers, …).
export default function ProductRail({ rail }: { rail: ProductRailData }) {
  return (
    <section className="space-y-3">
      <SectionHeader title={rail.title} href={rail.href} />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 lg:px-6">
        {rail.products.map((product) => (
          <ProductCard key={`${rail.id}-${product.id}`} product={product} />
        ))}
      </div>
    </section>
  );
}
