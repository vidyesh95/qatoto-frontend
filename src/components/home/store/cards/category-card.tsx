// TRANSPORT: props-only

import Image from "next/image";
import Link from "next/link";
import type { StoreCategory } from "@/lib/store/catalog.schemas";
import { hoverTintForIndex } from "@/lib/store/tiles";

export default function CategoryCard({
  category,
  accentIndex,
  trailPrefix = [],
  layout = "rail",
}: {
  category: StoreCategory;
  accentIndex: number;
  /** Parent slug segments for nested category URLs. */
  trailPrefix?: readonly string[];
  /** `grid` fills its cell; `rail` is a fixed-width tile for a horizontal strip. */
  layout?: "rail" | "grid";
}) {
  const hrefSegments = [...trailPrefix, category.slug];
  const href = `/store/category/${hrefSegments.join("/")}`;
  const layoutClass =
    layout === "grid"
      ? "group relative flex w-full flex-col items-center gap-1"
      : "group relative flex w-28 shrink-0 flex-col sm:w-32";

  return (
    <Link href={href} className={layoutClass}>
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${hoverTintForIndex(accentIndex)}`}
      />
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            fill
            sizes="(min-width: 1280px) 159px, 128px"
            alt={category.name}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <p className="mt-1.5 truncate px-0.5 text-center text-xs font-medium xl:text-sm">
        {category.name}
      </p>
    </Link>
  );
}
