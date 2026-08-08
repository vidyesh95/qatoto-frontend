// TRANSPORT: server-fetch — the route fetches via `getOrganizationStorefront` and hands
// the parsed storefront down. Nothing below re-fetches.
//
// The seller storefront: who this company is, what the platform has measured about it,
// what it says about itself, and what it sells.
//
// The ordering is the argument. Track record (measured) comes first because it is the
// only block the seller cannot write; the company profile it authored follows; the
// catalog closes. A page that opened with the seller's own prose would be a brochure.

import Link from "next/link";

import type { OrganizationStorefrontView } from "@/lib/store/organizations.schemas";
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

export default function OrganizationStorefront({
  storefront,
}: {
  storefront: OrganizationStorefrontView;
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

      <StorefrontContactActions />

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
