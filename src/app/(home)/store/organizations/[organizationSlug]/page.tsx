import type { Metadata } from "next";
import OrganizationStorefrontPage from "@/components/home/store/organization-storefront-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { prettifySlugForDisplay } from "@/lib/store/shared.schemas";

export function generateStaticParams() {
  return withSentinelValues([]).map((organizationSlug) => ({ organizationSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  return { title: `${prettifySlugForDisplay(organizationSlug)} · Store` };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { organizationSlug } = await params;
  return (
    <OrganizationStorefrontPage organizationSlug={organizationSlug} searchParams={searchParams} />
  );
}
