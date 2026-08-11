// TRANSPORT: server-fetch — awaits `getOrganizationStorefront` and branches on the result.
// Nothing below re-fetches.
//
// The seller storefront: who this company is, what the platform has measured about it,
// what it says about itself, and what it sells.
//
// The ordering is the argument. Track record (measured) comes first because it is the
// only block the seller cannot write; the company profile it authored follows; the
// catalog closes. A page that opened with the seller's own prose would be a brochure.

import Link from "next/link";
import { notFound } from "next/navigation";

import { hasCallerSession } from "@/lib/server-http";
import { getOrganizationStorefront } from "@/lib/store/organizations.api";
import type { OrganizationStorefrontView } from "@/lib/store/organizations.schemas";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import StorefrontCapabilities from "@/components/home/store/sections/organization/storefront-capabilities";
import StorefrontCatalog from "@/components/home/store/sections/organization/storefront-catalog";
import StorefrontCertifications from "@/components/home/store/sections/organization/storefront-certifications";
import StorefrontContactActions from "@/components/home/store/sections/organization/storefront-contact-actions";
import StorefrontDeclaredProfile from "@/components/home/store/sections/organization/storefront-declared-profile";
import StorefrontFactoryGallery from "@/components/home/store/sections/organization/storefront-factory-gallery";
import StorefrontFactorySites from "@/components/home/store/sections/organization/storefront-factory-sites";
import StorefrontFactoryTour from "@/components/home/store/sections/organization/storefront-factory-tour";
import StorefrontHero from "@/components/home/store/sections/organization/storefront-hero";
import StorefrontMeasuredMetrics from "@/components/home/store/sections/organization/storefront-measured-metrics";
import StorefrontSiteAccess from "@/components/home/store/sections/organization/storefront-site-access";
import StorefrontStakeholders from "@/components/home/store/sections/organization/storefront-stakeholders";
import { StorefrontDivider } from "@/components/home/store/sections/organization/storefront-section";

type StorefrontViewState =
  | { status: "error"; message: string }
  | { status: "ready"; storefront: OrganizationStorefrontView };

export default async function OrganizationStorefront({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  // THIS READ IS ANONYMOUS AND STAYS ANONYMOUS — the storefront projection is the same for everyone,
  // so no session is threaded into it. The cookie is read only to seed the contact control's first
  // render, which is what stops it painting a "Chat now" button at a visitor who has no session and
  // then swapping it for a sign-in link. That swap crosses element types, which React cannot patch.
  const [result, isViewerSignedIn] = await Promise.all([
    getOrganizationStorefront(organizationSlug),
    hasCallerSession(),
  ]);

  // A 404 is the route's answer, not the page's. The backend answers 404 for "no such storefront"
  // AND for "not visible to you" with one code — never render a permission hint from one.
  if (!result.success && result.error.code === "404") notFound();

  const viewState: StorefrontViewState = result.success
    ? { status: "ready", storefront: result.data }
    : { status: "error", message: result.error.message };

  switch (viewState.status) {
    case "error":
      return (
        <div className="mx-auto w-full max-w-md px-4 pt-6 pb-24 md:max-w-2xl lg:max-w-6xl lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready":
      return (
        <StorefrontBody storefront={viewState.storefront} isViewerSignedIn={isViewerSignedIn} />
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function StorefrontBody({
  storefront,
  isViewerSignedIn,
}: {
  storefront: OrganizationStorefrontView;
  // A fact about the READER, kept beside the storefront payload rather than folded into it.
  isViewerSignedIn: boolean;
}) {
  const declaredProfile = storefront.declaredProfile;
  const frontendOnlyProfile = storefront.frontendOnlyProfile;

  // Nothing here reads the clock. This page prerenders, and Cache Components rejects
  // `new Date()` during prerender for the right reason — a build-time "today" baked into
  // a static page goes stale silently. The one value that genuinely depends on now,
  // whether a certificate has lapsed, resolves client-side in
  // `certification-validity-pill.tsx`.
  return (
    <div className="mx-auto w-full max-w-md pb-24 md:max-w-2xl md:pb-12 lg:max-w-6xl">
      <StorefrontHero storefront={storefront} />

      <StorefrontContactActions
        sellerDisplayName={storefront.displayName}
        isViewerSignedIn={isViewerSignedIn}
      />

      <StorefrontDivider />

      <StorefrontMeasuredMetrics metrics={storefront.measuredMetrics} />

      <StorefrontDivider />

      {declaredProfile ? (
        <>
          <StorefrontDeclaredProfile
            profile={declaredProfile}
            frontendOnlyProfile={frontendOnlyProfile}
          />

          <StorefrontDivider />

          <StorefrontCapabilities capabilities={declaredProfile.capabilities} />

          <StorefrontCertifications certifications={declaredProfile.certifications} />

          <StorefrontDivider />

          <StorefrontFactoryGallery media={declaredProfile.media} />

          {frontendOnlyProfile && (
            <StorefrontFactorySites sites={frontendOnlyProfile.factorySites} />
          )}

          <StorefrontFactoryTour
            visitPolicy={declaredProfile.visitPolicy}
            tour={frontendOnlyProfile?.factoryTour ?? null}
          />

          <StorefrontSiteAccess siteAccess={declaredProfile.siteAccess} />

          <StorefrontDivider />

          <StorefrontStakeholders stakeholders={declaredProfile.stakeholders} />

          <StorefrontDivider />
        </>
      ) : (
        // Null profile means this seller has never described itself — a different fact
        // from describing itself and leaving the form blank, and only this one deserves
        // an empty state rather than a row of dashes.
        <section className="px-4 py-4 lg:px-6">
          <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
            This seller has not published a company profile yet.
          </p>
        </section>
      )}

      <StorefrontCatalog
        products={storefront.products.items}
        page={storefront.products.page}
        organizationSlug={storefront.slug}
      />

      <div className="flex justify-center px-4 py-4 lg:px-6">
        <Link
          href={`/store/organizations/${storefront.slug}/reviews`}
          className="text-xs font-medium tracking-wide text-[#2A76FD]"
        >
          Read buyer reviews of this seller
        </Link>
      </div>
    </div>
  );
}
