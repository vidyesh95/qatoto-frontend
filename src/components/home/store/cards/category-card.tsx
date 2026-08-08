// TRANSPORT: props-only — renders one category tile it is handed, no network.
import Image from "next/image";
import Link from "next/link";

import type { StoreCategory } from "@/lib/store/catalog.schemas";

/**
 * The tile a category with no art renders.
 *
 * `imageUrl` is nullable on the wire and `misc` genuinely has none, so this is the honest
 * stand-in rather than a claim that art exists. It is a committed asset in `public/`, not a
 * remote URL, so it needs no `remotePatterns` entry and cannot 404 in production.
 */
const CATEGORY_PLACEHOLDER_IMAGE_SRC = "/images/store/category-placeholder.svg";

/**
 * A single category tile: square image + name.
 *
 * THE LINK GOES STRAIGHT TO `/store/categories/<slug>`. It used to point at `/store/<slug>`
 * and let the legacy catch-all redirect — which under `cacheComponents` is not a 307 header
 * but a `<meta http-equiv="refresh">`, so every category click cost a visible ~1s hop. The
 * indirection bought one edit when the catch-all is finally deleted; it cost a second of
 * every visitor's time.
 */
export default function CategoryCard({ category }: { category: StoreCategory }) {
  return (
    <Link
      href={`/store/categories/${category.slug}`}
      className="group relative flex flex-col items-center gap-1"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors group-hover:bg-gray-100" />
      <Image
        src={category.imageUrl ?? CATEGORY_PLACEHOLDER_IMAGE_SRC}
        width={159}
        height={159}
        alt={category.name}
        className="aspect-square w-full rounded-xl object-cover"
      />
      <p className="text-center text-xs font-medium xl:text-sm">{category.name}</p>
    </Link>
  );
}
