// TRANSPORT: props-only — renders server-confirmed values, no network.
//
// THE BREADCRUMB RENDERS ONLY WHAT THE SERVER CONFIRMED, WHICH TODAY IS ONE CRUMB.
//
// `GET /store/categories/:slug` returns `{ category, children, facets, products }` and
// NOTHING ABOVE THE CURRENT NODE. There is no `ancestors[]` on the wire.
//
// An earlier version of this component inferred the intermediate crumbs from the URL and
// tried to fence the risk with a guard: the last URL segment must equal the resolved
// category's slug. THAT GUARD DOES NOT WORK, and finding out why is worth recording.
// `/store/categories/nonsense/chairs` addresses `chairs`, the backend resolves `chairs`, the
// last segment agrees — and the page printed "Nonsense › Chairs" as though that were the
// catalog's own hierarchy. The guard can only ever corroborate the segment the backend was
// asked about, which is precisely the one segment that was never in doubt. Everything to its
// left is unverifiable by construction.
//
// So the inference is gone rather than fenced. A visitor-controlled string is not evidence
// about the catalog, and there is no amount of validation that turns it into some. One crumb
// that is true beats four crumbs where three are guesses.
//
// TODO(backend): `ancestors[]` on the category read, and then this component grows the trail
// it wants. `getCategoryBySlug` already contains a recursive CTE
// (`listActiveCategorySubtreeSlugs`) that walks DOWN the tree; inverting it to walk up is
// about fifteen lines. It is the cheapest correctness win on the store surface, and until it
// lands a buyer three levels deep has no way back up but the browser's own back button.

import Link from "next/link";

export default function CatalogBreadcrumb({
  resolvedCategoryName,
}: {
  /** The server's name for the category this page resolved. The only confirmed crumb. */
  resolvedCategoryName: string;
}) {
  return (
    <nav aria-label="Category trail" className="px-4 pt-3 lg:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs leading-4 text-[#6F7979]">
        <li className="flex items-center gap-1">
          <Link href="/store" className="hover:text-[#00696E] hover:underline">
            Store
          </Link>
          <span aria-hidden>›</span>
        </li>
        <li className="flex items-center gap-1">
          <Link href="/store/categories" className="hover:text-[#00696E] hover:underline">
            Categories
          </Link>
          <span aria-hidden>›</span>
        </li>
        <li aria-current="page" className="font-medium text-[#191C1C]">
          {resolvedCategoryName}
        </li>
      </ol>
    </nav>
  );
}
