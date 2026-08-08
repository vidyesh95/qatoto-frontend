// TRANSPORT: server-fetch

import { fetchStoreCategories } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import CategoryCard from "@/components/home/store/cards/category-card";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";

export default async function CategoriesIndexPage() {
  const categoriesResult = await fetchStoreCategories();
  const viewState = toStoreDetailViewState(categoriesResult);

  switch (viewState.status) {
    case "not_found":
      return (
        <StoreStatusPanel
          status="empty"
          title="No categories"
          message="The category catalog endpoint is not available yet."
        />
      );
    case "error":
      return (
        <StoreStatusPanel
          status="error"
          message={viewState.message}
          isSignInRequired={viewState.isSignInRequired}
        />
      );
    case "ready": {
      // The route answers `{ items }`, not a bare array.
      const rootCategories = viewState.data.items;
      if (rootCategories.length === 0) {
        return (
          <StoreStatusPanel
            status="empty"
            title="No categories"
            message="No active root categories were returned."
          />
        );
      }
      return (
        <div className="space-y-6 px-4 py-6 pb-8 lg:px-6">
          <h1 className="text-xl font-medium tracking-wide">Categories</h1>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {rootCategories.map((category, categoryIndex) => (
              <CategoryCard
                key={category.id}
                category={category}
                accentIndex={categoryIndex}
                layout="grid"
              />
            ))}
          </div>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
