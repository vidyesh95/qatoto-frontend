// TRANSPORT: server-fetch — awaits `getStoreCategory` and branches on the result.
//
// `/store/categories/[...slug]`. Replaces the mock catch-all, which rendered three rails of
// four products per category from a local pool.
//
// THE SHAPE CHANGED, AND THE CHANGE IS THE POINT. A rail is a curated strip somebody chose;
// a category is a filtered result set the server paged. The mock used the first control for
// the second job, which is why it could not sort, could not filter, and could not show more
// than twelve of a category's sixty-six listings. This page is a keyset-paginated grid with
// the facets the backend actually computes.
//
// A branch node renders BOTH its children and its own listings, because real catalogs have
// products at every level and a page that showed only one of the two would hide the other.

import { notFound } from "next/navigation";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import CategoryCard from "@/components/home/store/cards/category-card";
import CatalogFacetSummary from "@/components/home/store/filters/catalog-facet-summary";
import CatalogBreadcrumb from "@/components/home/store/sections/catalog-breadcrumb";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { formatCountLabel } from "@/lib/store/format";
import { getStoreCategory } from "@/lib/store/catalog.api";
import type { StoreCategory, StoreCategoryDetail } from "@/lib/store/catalog.schemas";

type CategoryViewState =
  | { status: "error"; message: string }
  | { status: "ready"; detail: StoreCategoryDetail };

export default async function CatalogCategoryPage({
  urlSegments,
  searchParams,
}: {
  urlSegments: string[];
  searchParams: RawSearchParams;
}) {
  const addressedSlug = urlSegments.at(-1);
  if (addressedSlug === undefined) notFound();

  // The cursor is an opaque server token: read it, echo it, never parse it.
  const requestedCursor = readSingleParam(searchParams, "cursor");
  const result = await getStoreCategory(addressedSlug, { cursor: requestedCursor });

  // A 404 is "no such category" AND "not visible to you", with one code on purpose. Render
  // the scoped store 404 for both and never a permission hint — telling a stranger which of
  // the two it was is how they learn which slugs exist.
  if (!result.success && result.error.code === "404") notFound();

  // The addressed segment must be the category the backend resolved. This is a cheap
  // sanity check on the route, NOT a defence of the breadcrumb — see
  // `catalog-breadcrumb.tsx` for why no guard can validate the segments to its left, and
  // why the trail therefore renders only server-confirmed crumbs.
  if (result.success && result.data.category.slug !== addressedSlug) notFound();

  const viewState: CategoryViewState = result.success
    ? { status: "ready", detail: result.data }
    : { status: "error", message: result.error.message };

  return renderCategory(viewState, searchParams);
}

function renderCategory(viewState: CategoryViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 py-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { category, children, facets, products } = viewState.detail;
      return (
        <div className="pb-8">
          <CatalogBreadcrumb resolvedCategoryName={category.name} />

          <header className="px-4 pt-2 lg:px-6">
            <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
              {category.name}
            </h1>
          </header>

          <CatalogFacetSummary facets={facets} />

          {children.length > 0 && (
            <ChildCategoryGrid categoryName={category.name} childCategories={children} />
          )}

          <ProductGrid
            categoryName={category.name}
            products={products.items}
            hasChildren={children.length > 0}
          />

          <CursorPageControl
            nextCursor={products.page.nextCursor}
            hasMore={products.page.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more listings"
          />
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function ChildCategoryGrid({
  categoryName,
  childCategories,
}: {
  categoryName: string;
  childCategories: StoreCategory[];
}) {
  return (
    <section aria-label={`Subcategories of ${categoryName}`} className="pt-6">
      <h2 className="px-4 pb-3 text-base font-medium text-[#191C1C] lg:px-6">
        Browse within {categoryName}
      </h2>
      <div className="grid grid-cols-3 gap-3 px-4 sm:grid-cols-4 lg:grid-cols-6 lg:px-6">
        {/* The card takes the wire shape directly. The adapter object built here used to
            pick a placeholder path that did not exist in `public/`; both concerns now live
            in the card, which is the one place a tile is rendered. */}
        {childCategories.map((childCategory) => (
          <CategoryCard key={childCategory.id} category={childCategory} />
        ))}
      </div>
    </section>
  );
}

function ProductGrid({
  categoryName,
  products,
  hasChildren,
}: {
  categoryName: string;
  products: StoreCategoryDetail["products"]["items"];
  hasChildren: boolean;
}) {
  if (products.length === 0) {
    return (
      <section className="px-4 pt-6 lg:px-6">
        {/* Not the FILTERED empty panel: this route accepts no filters, so there is nothing
            for the visitor to clear. Offering a "clear filters" link here would point at a
            state they are already in. */}
        <StoreEmptyPanel
          message={
            hasChildren
              ? `Nothing is listed directly under ${categoryName} — try one of the subcategories above.`
              : `Nothing is listed under ${categoryName} yet.`
          }
        />
      </section>
    );
  }

  return (
    <section aria-label={`Listings in ${categoryName}`} className="pt-6">
      <h2 className="px-4 pb-3 text-base font-medium text-[#191C1C] lg:px-6">
        {formatCountLabel(products.length)} listings on this page
      </h2>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:px-6">
        {products.map((product) => (
          <CatalogProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
