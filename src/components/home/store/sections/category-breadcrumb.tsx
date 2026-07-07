import Link from "next/link";

// Breadcrumb category trail at the top of the product page. UI-only mock —
// the real trail comes from the backend with the product later.

const BREADCRUMB_TRAIL = [
  { name: "Furniture", href: "/store/furniture" },
  { name: "Chairs", href: "/store/chairs" },
  { name: "Stacking Chair", href: "/store/stacking-chair" },
];

export default function CategoryBreadcrumb() {
  const lastCrumbIndex = BREADCRUMB_TRAIL.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 lg:px-6">
      <ol className="flex items-center gap-1 overflow-x-auto text-xs font-medium tracking-wide whitespace-nowrap text-[#6F7979]">
        {BREADCRUMB_TRAIL.map((crumb, crumbIndex) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <Link
              href={crumb.href}
              aria-current={crumbIndex === lastCrumbIndex ? "page" : undefined}
              className={crumbIndex === lastCrumbIndex ? "text-[#191C1C]" : undefined}
            >
              {crumb.name}
            </Link>
            {crumbIndex < lastCrumbIndex && <span aria-hidden>›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
