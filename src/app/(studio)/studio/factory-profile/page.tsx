import type { Metadata } from "next";
import Link from "next/link";

import FactoryProfileEditor, {
  type FactoryProfileEditorSource,
} from "@/components/home/store/factories/factory-profile-editor";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { getOwnSellerProfile } from "@/lib/store/factory-profile.api";
import { listMyCommerceOrganizations } from "@/lib/store/organizations.api";
import type { MyCommerceOrganizationMembership } from "@/lib/store/organizations.schemas";
import { callerRequestOptions } from "@/lib/server-http";

// Permanently dynamic: the editor reads the seller's own live profile and writes to it, so there
// is nothing here to prerender.
export const instant = false;

/**
 * The organization this page edits.
 *
 * ⚠️ **THIS IS WHY THE PAGE CAN HAVE A SIDEBAR ENTRY AT ALL.** `factoryProfile` was deliberately
 * absent from `STUDIO_ROUTES` because the route needed a `?factorySlug=` only the directory listing
 * could supply — so the one page a seller edits their company on was reachable only by going through
 * the buyer-facing directory first. Resolving it here removes that requirement; the query parameter
 * still wins when present, so every existing link keeps working.
 *
 * THE FIRST ACTIVE MEMBERSHIP, not a picker. A seller with two organizations is a real case and this
 * does not serve it — but it is strictly better than the previous answer, which was no entry point.
 * A picker belongs here the moment a second membership is common; the `?factorySlug=` escape hatch
 * covers it until then.
 *
 * ⚠️ **THE SLUG IS MATCHED AGAINST THE CALLER'S OWN MEMBERSHIPS, never resolved through a public
 * read.** That is what makes a private organization openable: `GET /organizations/mine` is
 * session-scoped and carries the id, so nothing on this page depends on the company being
 * published. A `?factorySlug=` naming an organization the caller is not an active member of
 * resolves to nothing, which is the same answer the backend would give.
 */
async function resolveOwnOrganization(
  factorySlug: string | undefined,
): Promise<MyCommerceOrganizationMembership["organization"] | undefined> {
  const requestOptions = await callerRequestOptions();
  const result = await listMyCommerceOrganizations(requestOptions);
  if (!result.success) return undefined;
  const activeMemberships = result.data.filter((entry) => entry.membership.state === "active");
  if (factorySlug === undefined || factorySlug.length === 0) {
    return activeMemberships[0]?.organization;
  }
  return activeMemberships.find((entry) => entry.organization.slug === factorySlug)?.organization;
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Company profile",
  description:
    "Production lines, sites, terms, stakeholders, capabilities, certifications and photos",
};

/**
 * `?factorySlug=` RATHER THAN A `[factorySlug]` SEGMENT.
 *
 * The same call `/studio/products` edit made: a dynamic segment under a Cache Components layout
 * needs `generateStaticParams`, and there is no sensible static set for "the organizations a
 * signed-in seller belongs to" — the answer is session-scoped by definition.
 *
 * ONE READ, AND IT IS THE SELLER'S OWN. This page used to make two public ones —
 * `GET /store/factories/:slug` for the lines, sites and terms, and `GET /store/organizations/:slug`
 * for the rest — because §6.6 had shipped three PUTs and no GETs. Both sit behind
 * `tradeState = 'active' AND visibility = 'public'`, so a seller who was private, unlisted or not
 * yet approved to trade could write every field on this page and never read one back: the editor
 * opened on an error panel. `GET …/seller-profile` is the same backend projection read behind
 * membership instead, so §16.1's objection to a duplicate read does not apply — there is now one
 * read where there were two.
 */
export default async function StudioFactoryProfileRoute({
  searchParams,
}: {
  searchParams: Promise<{ factorySlug?: string }>;
}) {
  const { factorySlug } = await searchParams;
  const organization = await resolveOwnOrganization(factorySlug);

  if (organization === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 lg:px-6">
        <StoreErrorPanel message="This page edits a company you are an active member of. Sign in with that account, or open it from your factory's directory listing." />
        <p className="mt-3 text-center text-xs leading-4 text-[#6F7979]">
          <Link href="/store/factories" className="hover:underline">
            Browse the manufacturer directory
          </Link>
        </p>
      </div>
    );
  }

  const requestOptions = await callerRequestOptions();
  const profileResult = await getOwnSellerProfile(organization.id, requestOptions);

  if (!profileResult.success) {
    // NOT `notFound()`. A refusal here is a membership answer — `requireMembershipRole` returns
    // NOT_FOUND for a non-member and for a member below owner/administrator alike — and the
    // backend's own sentence serves the reader better than the store's 404 page, which is written
    // for a buyer who followed a dead link.
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 lg:px-6">
        <StoreErrorPanel message={profileResult.error.message} />
      </div>
    );
  }

  const { declaredProfile } = profileResult.data;

  /**
   * A SELLER WITH NO PROFILE ROW STILL GETS THE FORMS. `null` means nobody has described this
   * company yet, which is the one state where empty inputs are the truth rather than a lie — so
   * the three whole-object forms open on the server's own defaults (no lines, no sites, samples
   * not offered, USD) and the first save creates the row.
   */
  const source: FactoryProfileEditorSource = {
    displayName: organization.displayName,
    productionLines: declaredProfile?.productionLines ?? [],
    sites: declaredProfile?.sites ?? [],
    samplePolicy: declaredProfile?.samplePolicy ?? {
      offersSamples: false,
      sampleLeadTimeDays: null,
      sampleFeeInCents: null,
      currency: "USD",
    },
    orderBounds: declaredProfile?.orderBounds ?? {
      minimumOrderQuantity: null,
      minimumOrderQuantityUnitLabel: null,
      minimumLeadTimeDays: null,
      maximumLeadTimeDays: null,
    },
    acceptingInquiries: declaredProfile?.acceptingInquiries ?? false,
  };

  return (
    <FactoryProfileEditor
      organizationId={organization.id}
      source={source}
      declaredProfile={declaredProfile}
    />
  );
}
