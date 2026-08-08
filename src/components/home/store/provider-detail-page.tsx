// TRANSPORT: server-fetch — awaits `getStoreProvider` and branches on the result.
//
// `/store/providers/[organizationSlug]`.
//
// IT REUSES THE STOREFRONT'S SECTIONS, and that is not laziness — it is the same invariant. The
// provider read returns `declaredProfile` and `measuredMetrics` as two separate objects, exactly as
// the seller storefront does, because an organization may be both and because "founded 2009, per
// the seller" and "96.2% on time across 214 orders" are different kinds of claim. Rendering them
// through one code path is what A13 exists to prevent, so they go through the same two components
// that already enforce it, `attribution="measured"` and `attribution="declared"`.
//
// THE KINDS THIS PROVIDER OPERATES ARE DERIVED FROM ITS OFFERINGS, and labelled as that. No read
// projects `commerce_provider_kind_link`, so "kinds it lists services under" is the strongest true
// statement available — it is NOT "kinds it is verified for", and a provider verified as a customs
// broker with no published customs offering would not appear here at all.

import { notFound } from "next/navigation";

import StorefrontDeclaredProfile from "@/components/home/store/sections/organization/storefront-declared-profile";
import StorefrontMeasuredMetrics from "@/components/home/store/sections/organization/storefront-measured-metrics";
import StorefrontSection, {
  StorefrontDivider,
} from "@/components/home/store/sections/organization/storefront-section";
import ProviderOfferingList from "@/components/home/store/sections/provider-offering-list";
import ProviderProfileHeader from "@/components/home/store/sections/provider-profile-header";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { getStoreProvider } from "@/lib/store/providers.api";
import type { PublicProviderDetail } from "@/lib/store/providers.schemas";
import type { ProviderKind } from "@/lib/store/shared.schemas";

type ProviderDetailViewState =
  | { status: "error"; message: string }
  | { status: "ready"; detail: PublicProviderDetail };

export default async function ProviderDetailPage({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const result = await getStoreProvider(organizationSlug);

  // 404 is "no such provider" AND "not publicly eligible" with one code, on purpose. Render the
  // scoped store 404 for both; a distinction here would tell a stranger which slugs exist.
  if (!result.success && result.error.code === "404") notFound();

  const viewState: ProviderDetailViewState = result.success
    ? { status: "ready", detail: result.data }
    : { status: "error", message: result.error.message };

  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 py-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { provider, declaredProfile, measuredMetrics, offerings } = viewState.detail;

      // Distinct kinds, in the order the provider's own offerings list them. A `Set` rather than
      // a filter over `PROVIDER_KINDS`, so the order reflects the provider rather than the enum.
      const operatedKinds: ProviderKind[] = [
        ...new Set(offerings.map((offering) => offering.providerKind)),
      ];

      return (
        <div className="pb-10">
          <ProviderProfileHeader provider={provider} operatedKinds={operatedKinds} />

          <StorefrontDivider />

          {/* Measured first, then declared. The order is deliberate on the storefront and is
              deliberate here: what the platform observed outranks what the organization says
              about itself, and putting the assertions first would frame the measurements as
              supporting evidence for them. */}
          <StorefrontMeasuredMetrics metrics={measuredMetrics} />

          <StorefrontDivider />

          {declaredProfile === null ? (
            <StorefrontSection
              title="Company profile"
              attribution="declared"
              description="What this provider says about itself."
            >
              <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
                This provider has not published a company profile yet.
              </p>
            </StorefrontSection>
          ) : (
            // `frontendOnlyProfile={null}`: registered capital, registration number, the per-site
            // table and the visit terms have no backend column for a SELLER either, and a provider
            // read has no more of them. Null is the honest value and the section degrades to the
            // subset that exists.
            <StorefrontDeclaredProfile profile={declaredProfile} frontendOnlyProfile={null} />
          )}

          <StorefrontDivider />

          <ProviderOfferingList offerings={offerings} providerDisplayName={provider.displayName} />
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
