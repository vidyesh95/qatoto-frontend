import type { Metadata } from "next";
import Link from "next/link";

import FactoryProfileEditor from "@/components/home/store/factories/factory-profile-editor";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { getStoreFactory } from "@/lib/store/factories.api";

// Permanently dynamic: the editor reads the seller's own live profile and writes to it, so there
// is nothing here to prerender.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Factory profile",
  description: "Production lines, sites, sample policy and order minimums for your factory",
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

  if (factorySlug === undefined || factorySlug.length === 0) {
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

  const result = await getStoreFactory(factorySlug);

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
    />
  );
}
