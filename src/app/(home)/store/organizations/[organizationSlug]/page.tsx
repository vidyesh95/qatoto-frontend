import type { Metadata } from "next";
import { notFound } from "next/navigation";

import OrganizationStorefront from "@/components/home/store/organization-storefront";
import {
  getOrganizationSlugs,
  getOrganizationStorefront,
  prettifySlugForDisplay,
} from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// A literal `organizations/` segment is safe beside the `[...slug]` catch-all — static
// segments win over catch-alls in the App Router, and `product/` and `pathway/` already
// prove it in this exact directory.
export async function generateStaticParams() {
  const slugs = await getOrganizationSlugs();
  return slugs.map((organizationSlug) => ({ organizationSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  const storefront = await getOrganizationStorefront(organizationSlug);
  const title = storefront?.displayName ?? prettifySlugForDisplay(organizationSlug);
  return { title: `${title} · Store` };
}

export default async function Page({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  const storefront = await getOrganizationStorefront(organizationSlug);
  if (!storefront) notFound();

  return <OrganizationStorefront storefront={storefront} />;
}
