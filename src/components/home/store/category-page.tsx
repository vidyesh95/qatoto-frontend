// TRANSPORT: server-fetch

import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchStoreCategory, fetchStoreHome, fetchStorePathways } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import type { RawSearchParams } from "@/lib/filter-href";
import { readSingleParam } from "@/lib/filter-href";
import { STORE_FACET_GROUP_LABELS, storeFacetValueLabel } from "@/lib/store/labels";
import { buildStoreSearchHref } from "@/lib/store/search-params";
import { prettifySlugForDisplay } from "@/lib/store/shared.schemas";
import { toProductTiles } from "@/lib/store/tiles";
import CategoryRail from "@/components/home/store/rails/category-rail";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import ProductRail from "@/components/home/store/rails/product-rail";
import ProductCard from "@/components/home/store/cards/product-card";
import CategoryBreadcrumb from "@/components/home/store/sections/category-breadcrumb";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";
import { MOCK_CATEGORY_RAILS } from "@/mocks/store-mocks";

export default async function CategoryPage({
  slugSegments,
  searchParams,
}: {
  slugSegments: string[];
  searchParams: Promise<RawSearchParams>;
}) {
  const categorySlug = slugSegments[slugSegments.length - 1];
  if (!categorySlug || categorySlug === "__none__") notFound();

  const resolvedSearchParams = await searchParams;
  // `limit` and `cursor` are the ONLY query keys this route accepts — its schema is
  // `.strict()`, and the `sort` this page used to send was a 422.
  //
  // The hero and pathways rails carry over from the store home, as they did before this surface
  // was wired. They are fetched alongside rather than after, and each lifts its OWN failure: a
  // dead merchandising read hides its rail, it never blanks the category.
  const [categoryResult, homeResult, pathwayListResult] = await Promise.all([
    fetchStoreCategory(categorySlug, {
      cursor: readSingleParam(resolvedSearchParams, "cursor"),
    }),
    fetchStoreHome(),
    fetchStorePathways(),
  ]);
  const viewState = toStoreDetailViewState(categoryResult);

  switch (viewState.status) {
    case "not_found":
      notFound();
    case "error":
      return (
        <StoreStatusPanel
          status="error"
          message={viewState.message}
          isSignInRequired={viewState.isSignInRequired}
        />
      );
    case "ready": {
      const { category, children, products, facets } = viewState.data;
      const pathname = `/store/category/${slugSegments.join("/")}`;
      const nextCursor = products.page.nextCursor;

      // The backend returns no canonical trail (STORE_STRUCTURE §5.6 item 2), so ancestors
      // come from the URL. Their slugs ARE real data — only their display names are derived,
      // and the leaf uses the name the server actually sent.
      const breadcrumbTrail = slugSegments.map((segment, segmentIndex) => ({
        slug: segment,
        name:
          segmentIndex === slugSegments.length - 1
            ? category.name
            : prettifySlugForDisplay(segment),
      }));

      // `children.length === 0` is the only leaf signal on the wire; there is no `isLeaf`.
      const hasChildCategories = children.length > 0;
      const heroSlides = homeResult.success ? homeResult.data.heroSlides : [];
      const pathways = pathwayListResult.success ? pathwayListResult.data.items : [];

      return (
        <div className="space-y-8 pb-8">
          <HeroCarousel slides={heroSlides} />
          <CategoryBreadcrumb trail={breadcrumbTrail} />
          <div className="px-4 lg:px-6">
            <h1 className="text-xl font-medium tracking-wide">{category.name}</h1>
          </div>

          {hasChildCategories ? (
            <CategoryRail
              categories={children}
              title="Subcategories"
              seeAllHref="/store/categories"
              trailPrefix={slugSegments}
              layout="rail"
            />
          ) : null}

          <PathwaysRail pathways={[...pathways]} />

          {/*
            The three named rails this page carried before it was wired. The backend returns ONE
            product list per category and has no "new in" / "popular in" / "top rated" signal —
            ranking is deferred — so these tiles are fixed content and unlinked. The real,
            server-ordered, paginated grid is below them.
          */}
          {MOCK_CATEGORY_RAILS.map((mockRail) => (
            <ProductRail
              key={mockRail.id}
              title={`${mockRail.titleSuffix} ${category.name}`}
              tiles={mockRail.tiles}
            />
          ))}

          {/*
            Seller country is the one facet group that is also a search filter, so those
            buckets are links into `/store/search` scoped to this category. Stock state and
            sample policy have NO corresponding query param on any route (§5.6 item 3), so
            they render as read-only counts rather than as controls that would do nothing.
          */}
          {facets.sellerCountryCodes.length > 0 ? (
            <div className="space-y-2 px-4 lg:px-6">
              <h2 className="text-xs font-medium tracking-wide text-foreground/60">
                {STORE_FACET_GROUP_LABELS.sellerCountryCodes}
              </h2>
              <div className="flex flex-wrap gap-2">
                {facets.sellerCountryCodes.map((bucket) => (
                  <Link
                    key={bucket.value}
                    href={buildStoreSearchHref(
                      "/store/search",
                      {},
                      {
                        category: category.slug,
                        sellerCountryCode: bucket.value,
                      },
                    )}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {bucket.value} ({bucket.count})
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {facets.stockStates.length > 0 || facets.samplePolicies.length > 0 ? (
            <div className="space-y-2 px-4 lg:px-6">
              <h2 className="text-xs font-medium tracking-wide text-foreground/60">
                In this category
              </h2>
              <div className="flex flex-wrap gap-2">
                {facets.stockStates.map((bucket) => (
                  <span
                    key={`stock-${bucket.value}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70"
                  >
                    {storeFacetValueLabel("stockStates", bucket.value)} ({bucket.count})
                  </span>
                ))}
                {facets.samplePolicies.map((bucket) => (
                  <span
                    key={`sample-${bucket.value}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70"
                  >
                    {storeFacetValueLabel("samplePolicies", bucket.value)} ({bucket.count})
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {products.items.length === 0 ? (
            <StoreStatusPanel
              status="empty"
              title="No products in this category"
              message={
                hasChildCategories
                  ? "Pick a subcategory to see listings."
                  : "No active listings here yet."
              }
            />
          ) : (
            <section className="space-y-4 px-4 lg:px-6">
              <h2 className="text-lg font-medium tracking-wide">All in {category.name}</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {toProductTiles(products.items).map((tile) => (
                  <ProductCard key={tile.id} tile={tile} layout="grid" />
                ))}
              </div>
              {nextCursor ? (
                <Link
                  href={buildStoreSearchHref(pathname, resolvedSearchParams, {
                    cursor: nextCursor,
                  })}
                  className="inline-flex text-sm font-medium text-[#00696E]"
                >
                  Load more
                </Link>
              ) : null}
            </section>
          )}
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
