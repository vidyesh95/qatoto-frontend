// TRANSPORT: server-fetch — the category rail awaits `listStoreCategories` (WIRED, real
// backend). The rest of the page still awaits the legacy `getStoreHome`, which reads an
// unset `QATOTO_STORE_API_URL` and silently falls back to mocks.
import { getStoreHome } from "@/lib/store";
import { listStoreCategories } from "@/lib/store/catalog.api";
import type { StoreCategory } from "@/lib/store/catalog.schemas";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import CategoryRail from "@/components/home/store/rails/category-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import BusinessToolsRail from "@/components/home/store/rails/business-tools-rail";
import ProductRail from "@/components/home/store/rails/product-rail";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";

/**
 * How many root categories the home rail shows.
 *
 * The grid is eight across at `xl`, so this fills exactly one row. It is sent to the server
 * as `?limit=`, which is what makes the admin's arrangement decide WHICH eight — see
 * `CategoryRail`.
 */
const HOME_RAIL_CATEGORY_LIMIT = 8;

/**
 * What the category strip can be showing. No `loading` variant: a server component has
 * already awaited its data by the time it renders, and the pending state is `loading.tsx`.
 */
type CategoryRailViewState =
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; categories: StoreCategory[] };

// Store landing page body. Server component.
export default async function StorePage() {
  const { hero, pathways, b2bLinks, rails } = await getStoreHome();
  const categoriesResult = await listStoreCategories({ limit: HOME_RAIL_CATEGORY_LIMIT });

  // A failed read renders AS a failure. Falling through to an empty rail would present "the
  // backend is down" as "this store sells nothing in any category", which is the one
  // outcome worse than showing an error (Pattern 3).
  const categoryRailState: CategoryRailViewState = !categoriesResult.success
    ? { status: "error", message: categoriesResult.error.message }
    : categoriesResult.data.items.length === 0
      ? { status: "empty" }
      : { status: "ready", categories: categoriesResult.data.items };

  return (
    <div className="space-y-8 pb-8">
      <HeroCarousel slides={hero} />
      {renderCategoryRail(categoryRailState)}
      <PathwaysRail pathways={pathways} />
      {/* `b2bLinks` keeps its wire name — it is a field on the legacy `StoreHome` getter. The
          component that renders it does not have to. */}
      <BusinessToolsRail links={b2bLinks} />
      {rails.map((rail) => (
        <ProductRail key={rail.id} rail={rail} />
      ))}
    </div>
  );
}

function renderCategoryRail(viewState: CategoryRailViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    // Rendered as NOTHING rather than as an empty-state panel. A store with no published
    // categories is a setup state, not a message a shopper needs — and the rest of the
    // page still has products to show.
    case "empty":
      return null;
    case "ready":
      return <CategoryRail categories={viewState.categories} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
