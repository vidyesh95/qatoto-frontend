// TRANSPORT: props-only

import Link from "next/link";

/**
 * The minimum a crumb needs. Kept structural rather than importing a schema type so both
 * callers fit: the PDP passes the server's `categoryTrail` (full `StoreCategory` rows), and
 * the category page passes a trail derived from the URL, because `/store/categories/:slug`
 * returns no canonical trail (STORE_STRUCTURE §5.6 item 2).
 */
export interface CategoryBreadcrumbNode {
  readonly slug: string;
  readonly name: string;
}

export default function CategoryBreadcrumb({
  trail,
}: {
  trail: readonly CategoryBreadcrumbNode[];
}) {
  if (trail.length === 0) return null;
  const lastCrumbIndex = trail.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 lg:px-6">
      <ol className="flex items-center gap-1 overflow-x-auto text-xs font-medium tracking-wide whitespace-nowrap text-[#6F7979]">
        <li className="flex items-center gap-1">
          <Link href="/store">Store</Link>
          <span aria-hidden>›</span>
        </li>
        {trail.map((crumb, crumbIndex) => {
          const href = `/store/category/${trail
            .slice(0, crumbIndex + 1)
            .map((node) => node.slug)
            .join("/")}`;
          return (
            <li key={crumb.slug} className="flex items-center gap-1">
              <Link
                href={href}
                aria-current={crumbIndex === lastCrumbIndex ? "page" : undefined}
                className={crumbIndex === lastCrumbIndex ? "text-[#191C1C]" : undefined}
              >
                {crumb.name}
              </Link>
              {crumbIndex < lastCrumbIndex ? <span aria-hidden>›</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
