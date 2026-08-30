import type { Metadata } from "next";
import Link from "next/link";

import FactoryProfileEditor from "@/components/home/store/factories/factory-profile-editor";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { getStoreFactory } from "@/lib/store/factories.api";
import {
  getOrganizationStorefront,
  listMyCommerceOrganizations,
} from "@/lib/store/organizations.api";
import { callerRequestOptions } from "@/lib/server-http";

// Permanently dynamic: the editor reads the seller's own live profile and writes to it, so there
// is nothing here to prerender.
export const instant = false;

/**
 * The viewer's own organization slug, when the URL did not name one.
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
 */
async function resolveOwnOrganizationSlug(): Promise<string | undefined> {
  const requestOptions = await callerRequestOptions();
  const result = await listMyCommerceOrganizations(requestOptions);
  if (!result.success) return undefined;
  return result.data.find((entry) => entry.membership.state === "active")?.organization.slug;
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
 * The editor PREFILLS FROM THE PUBLIC DETAIL READ, because §6.6 ships three PUTs and no GETs: a
 * factory's lines, sites and terms are already projected by `GET /store/factories/:factorySlug`,
 * and a second read of the same rows would be a second place for them to disagree (§16.1).
 */
export default async function StudioFactoryProfileRoute({
  searchParams,
}: {
  searchParams: Promise<{ factorySlug?: string }>;
}) {
  const { factorySlug } = await searchParams;
  const resolvedSlug = factorySlug ?? (await resolveOwnOrganizationSlug());

  if (resolvedSlug === undefined || resolvedSlug.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 lg:px-6">
        <StoreErrorPanel message="Open this page from your factory's directory listing so it knows which profile to edit." />
        <p className="mt-3 text-center text-xs leading-4 text-[#6F7979]">
          <Link href="/store/factories" className="hover:underline">
            Browse the manufacturer directory
          </Link>
        </p>
      </div>
    );
  }

  /**
   * TWO READS, BECAUSE THE PROFILE IS ONE ROW PROJECTED BY TWO ROUTES.
   *
   * `GET /store/factories/:slug` carries the lines, sites and terms this page already edited. It
   * does NOT carry stakeholders, site access, capabilities or the media gallery, and it reshapes
   * certifications into a closed-enum form that the write side cannot round-trip. The storefront
   * read projects all four in exactly the shape the writes take.
   *
   * ⚠️ THE FACTORY SLUG **IS** THE ORGANIZATION SLUG — projected as
   * `slug: storeSearchDocument.organizationSlug`, so this is one identifier rather than a
   * coincidence of the seed. Do not derive one from the other.
   *
   * §16.1's objection is to DUPLICATING a read, not to reading a superset once: nothing below reads
   * the same rows twice, and the two projections are disjoint in what this page edits.
   */
  const [result, storefrontResult] = await Promise.all([
    getStoreFactory(resolvedSlug),
    getOrganizationStorefront(resolvedSlug),
  ]);

  if (!result.success) {
    // NOT `notFound()`. A seller who mistyped their own slug is better served by the backend's own
    // message than by the store's 404 page, which is written for a buyer who followed a dead link.
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 lg:px-6">
        <StoreErrorPanel message={result.error.message} />
      </div>
    );
  }

  return (
    <FactoryProfileEditor
      organizationId={result.data.factory.organizationId}
      detail={result.data}
      // NULL rather than an empty object when the storefront read failed: an organization with no
      // profile row and one this page could not read are different facts, and the sections below
      // say so instead of rendering empty forms over an unknown.
      declaredProfile={storefrontResult.success ? storefrontResult.data.declaredProfile : null}
    />
  );
}
