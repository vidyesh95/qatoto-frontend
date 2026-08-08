// TRANSPORT: server-fetch

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchOrganizationStorefront } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import type { RawSearchParams } from "@/lib/filter-href";
import { readSingleParam } from "@/lib/filter-href";
import { buildStoreSearchHref } from "@/lib/store/search-params";
import { toProductTiles } from "@/lib/store/tiles";
import ProductCard from "@/components/home/store/cards/product-card";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";

export default async function OrganizationStorefrontPage({
  organizationSlug,
  searchParams,
}: {
  organizationSlug: string;
  searchParams: Promise<RawSearchParams>;
}) {
  if (organizationSlug === "__none__") notFound();
  const resolvedSearchParams = await searchParams;
  const storefrontResult = await fetchOrganizationStorefront(organizationSlug, {
    cursor: readSingleParam(resolvedSearchParams, "cursor"),
  });
  const viewState = toStoreDetailViewState(storefrontResult);

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
      // The storefront payload is FLAT — there is no nested `organization` object.
      const storefront = viewState.data;
      const pathname = `/store/organizations/${organizationSlug}`;
      const nextCursor = storefront.products.page.nextCursor;

      return (
        <div className="space-y-8 pb-8">
          <header className="flex items-start gap-4 px-4 pt-4 lg:px-6">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
              {storefront.logoUrl ? (
                <Image src={storefront.logoUrl} fill sizes="64px" alt="" className="object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-medium tracking-wide">{storefront.displayName}</h1>
              {/* `countryCode` is not nullable on this projection. */}
              <p className="text-xs text-foreground/60">{storefront.countryCode}</p>
              {storefront.summary ? (
                <p className="text-sm text-foreground/75">{storefront.summary}</p>
              ) : null}
              {storefront.websiteUrl ? (
                <a
                  href={storefront.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-medium text-[#00696E]"
                >
                  Website
                </a>
              ) : null}
            </div>
          </header>

          {storefront.products.items.length === 0 ? (
            <StoreStatusPanel
              status="empty"
              title="No public listings"
              message="This organization has no active store products yet."
            />
          ) : (
            <section className="space-y-4 px-4 lg:px-6">
              <h2 className="text-lg font-medium tracking-wide">Products</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {toProductTiles(storefront.products.items).map((tile) => (
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
