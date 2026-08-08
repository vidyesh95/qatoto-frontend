// TRANSPORT: server-fetch — awaits `listStoreCategories` and branches on the result.
//
// The root category index, `/store/categories`. The store home rail's "see all" target,
// which until now pointed at a route that did not exist.
//
// Pattern 1: the read is lifted into a discriminated union and rendered by an exhaustive
// `switch` with a `never` default, so a new variant is a compile error until this page
// handles it. Pattern 3: the failure is a value, and it renders as a failure — never as an
// empty catalog. Those two are the same rule seen from both ends, and the bug they prevent
// is a broken endpoint that looks like a store with no products in it.

import Link from "next/link";

import CategoryCard from "@/components/home/store/cards/category-card";
import SectionHeader from "@/components/home/store/sections/section-header";
import {
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import { listStoreCategories } from "@/lib/store/catalog.api";
import type { StoreCategory } from "@/lib/store/catalog.schemas";

/**
 * What the page can be showing. No `loading` variant: a server component has already
 * awaited its data by the time it renders, and the pending state is `loading.tsx`.
 */
type CategoryIndexViewState =
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; categories: StoreCategory[] };

export default async function CategoriesIndexPage() {
  const result = await listStoreCategories();

  const viewState: CategoryIndexViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty" }
      : { status: "ready", categories: result.data.items };

  return (
    <div className="pb-8">
      <SectionHeader title="Categories" href="/store" />
      {renderCategoryIndex(viewState)}
    </div>
  );
}

function renderCategoryIndex(viewState: CategoryIndexViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 lg:px-6">
          <StoreEmptyPanel message="No categories are published yet." />
        </div>
      );
    case "ready":
      return (
        <>
          <p className="px-4 pb-4 text-sm leading-5 text-[#6F7979] lg:px-6">
            Every category on Qatoto. Drill in to filter by seller country, stock and sample policy.
          </p>
          {/* The card takes the wire shape directly now, and links straight to
              `/store/categories/<slug>`. The adapter object that used to be built here
              existed only to satisfy the legacy `StoreCategory` type, and it was also
              where the placeholder path was chosen — a file that did not exist. Both
              concerns moved into the card, which is the one place that renders a tile. */}
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:px-6">
            {viewState.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
          <p className="px-4 pt-6 text-xs leading-4 text-[#6F7979] lg:px-6">
            Looking for a service rather than a product?{" "}
            <Link href="/store/providers" className="text-[#00696E] underline">
              Browse freight, customs, inspection and warehousing providers
            </Link>
            .
          </p>
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
