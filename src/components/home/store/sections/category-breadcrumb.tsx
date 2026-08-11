// TRANSPORT: props-only — renders the server's own trail, no network.
//
// THE PRODUCT PAGE CAN RENDER A FULL TRAIL AND THE CATEGORY PAGE CANNOT, and the difference is
// evidence rather than effort. `GET /store/products/:productSlug` returns `categoryTrail[]` — the
// backend's own root-first walk up the taxonomy — so every crumb here is a fact the server stated.
// `catalog-breadcrumb.tsx` renders one crumb because it used to INFER the rest from URL segments,
// and a visitor-controlled string is not evidence about the catalog.
//
// A trail that stops short is honest: the backend halts at the first inactive ancestor, so a
// category whose parent was retired yields a shorter trail rather than a link into a dead node.

import Link from "next/link";

import type { StoreCategory } from "@/lib/store/catalog.schemas";

export default function CategoryBreadcrumb({
  categoryTrail,
}: {
  readonly categoryTrail: readonly StoreCategory[];
}) {
  return (
    <nav aria-label="Category trail" className="px-4 py-2 lg:px-6">
      <ol className="flex items-center gap-1 overflow-x-auto text-xs font-medium tracking-wide whitespace-nowrap text-[#6F7979]">
        <li className="flex items-center gap-1">
          <Link href="/store/categories" className="hover:text-[#00696E] hover:underline">
            Categories
          </Link>
          {categoryTrail.length > 0 && <span aria-hidden>›</span>}
        </li>
        {categoryTrail.map((category, categoryIndex) => {
          const isLastCrumb = categoryIndex === categoryTrail.length - 1;
          return (
            <li key={category.id} className="flex items-center gap-1">
              <Link
                href={`/store/categories/${category.slug}`}
                aria-current={isLastCrumb ? "page" : undefined}
                className={isLastCrumb ? "text-[#191C1C]" : "hover:text-[#00696E] hover:underline"}
              >
                {category.name}
              </Link>
              {!isLastCrumb && <span aria-hidden>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
