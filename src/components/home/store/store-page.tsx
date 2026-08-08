// TRANSPORT: server-fetch

import { fetchStoreHome } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import HeroCarousel from "@/components/home/store/rails/hero-carousel";
import CategoryRail from "@/components/home/store/rails/category-rail";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import B2BRail from "@/components/home/store/rails/b2b-rail";
import ProviderShortcutRail from "@/components/home/store/rails/provider-shortcut-rail";
import MerchandisingRail from "@/components/home/store/rails/merchandising-rail";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";

export default async function StorePage() {
  const homeResult = await fetchStoreHome();
  const viewState = toStoreDetailViewState(homeResult);

  switch (viewState.status) {
    case "not_found":
      return (
        <StoreStatusPanel
          status="empty"
          title="Store not ready"
          message="The public catalog endpoint is not available yet."
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
      const { heroSlides, categories, pathways, providerShortcuts, rails } = viewState.data;
      return (
        <div className="space-y-8 pb-8">
          <HeroCarousel slides={heroSlides} />
          <CategoryRail categories={categories} />
          <PathwaysRail pathways={pathways} />
          {/*
            Two different things, both rails. `B2BRail` is navigation chrome — RFQ, logistics,
            factories. `ProviderShortcutRail` is the backend's real connector directory.
          */}
          <B2BRail />
          <ProviderShortcutRail providers={providerShortcuts} />
          {/* Rails are keyed by slug — a home rail carries no `id`. */}
          {rails.map((rail) => (
            <MerchandisingRail key={rail.slug} rail={rail} />
          ))}
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
