import Image from "next/image";
import Link from "next/link";
import type { StoreCategory } from "@/types/store";

// A single category tile: square image + name. Tapping drills into the
// catch-all category route, which decides whether to show sub-categories or
// products based on the node's children.
export default function CategoryCard({ category }: { category: StoreCategory }) {
  return (
    <Link
      href={`/store/${category.slug}`}
      className="group relative flex flex-col items-center gap-1"
    >
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${category.hoverBg ?? "group-hover:bg-gray-100"}`}
      />
      <Image
        src={category.imageSrc}
        width={159}
        height={159}
        alt={category.name}
        className="aspect-square w-full rounded-xl object-cover"
      />
      <p className="text-center text-xs font-medium xl:text-sm">{category.name}</p>
    </Link>
  );
}
