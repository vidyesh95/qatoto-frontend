// TRANSPORT: server-fetch — awaits `getStoreHome` and branches on the result.
//
// ONE READ, NOT TWO. This page used to await the legacy `getStoreHome` from `src/lib/store.ts`
// (mock-backed, second env var) for the hero, pathways and rails, AND a separate
// `listStoreCategories` for the category strip. `GET /store/home` already returns the root
// categories, so the second call was a second answer to "what are the categories" — and the one
// nobody was looking at would have been the one that drifted.

import CategoryRail from "@/components/home/store/rails/category-rail";
import BusinessToolsRail from "@/components/home/store/rails/business-tools-rail";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import MerchandisingRail from "@/components/home/store/rails/merchandising-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { getStoreHome } from "@/lib/store/merchandising.api";
import type { StoreHome } from "@/lib/store/merchandising.schemas";

/**
 * How many root categories the home strip shows.
 *
 * Applied on THIS side, not as a `?limit=`: `GET /store/home` takes no query parameters and its
 * category list is already the admin-arranged root level. Slicing a rendered strip is not the
 * client filtering a fetched page — the ordering is the server's, and the strip is one row wide.
 */
const HOME_RAIL_CATEGORY_LIMIT = 8;

/**
 * What the page can be showing. No `loading` variant: a server component has already awaited its
 * data by the time it renders, and the pending state is `loading.tsx`.
 */
type StoreHomeViewState =
  | { status: "error"; message: string }
  | { status: "ready"; home: StoreHome };

// Store landing page body. Server component.
export default async function StorePage() {
  const result = await getStoreHome();

  // A failed read renders AS a failure. Falling through to empty rails would present "the backend
  // is down" as "this store sells nothing", which is the one outcome worse than showing an error.
  // The 503 arm matters here specifically: the home read fans out to the provider directory, and
  // the backend answers 503 rather than serving a home page with a silently empty shortcut rail.
  const viewState: StoreHomeViewState = result.success
    ? { status: "ready", home: result.data }
    : { status: "error", message: result.error.message };

  return <div className="space-y-8 pb-8">{renderStoreHome(viewState)}</div>;
}

function renderStoreHome(viewState: StoreHomeViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { heroSlides, categories, pathways, rails } = viewState.home;
      return (
        <>
          <HeroCarousel slides={heroSlides} />
          {/* Rendered as NOTHING rather than an empty-state panel. A store with no published
              categories is a setup state, not a message a shopper needs — and the rest of the page
              still has products to show. */}
          {categories.length > 0 && (
            <CategoryRail categories={categories.slice(0, HOME_RAIL_CATEGORY_LIMIT)} />
          )}
          <PathwaysRail pathways={pathways} />
          <BusinessToolsRail />
          {rails.map((rail) => (
            <MerchandisingRail key={rail.slug} rail={rail} />
          ))}
        </>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
