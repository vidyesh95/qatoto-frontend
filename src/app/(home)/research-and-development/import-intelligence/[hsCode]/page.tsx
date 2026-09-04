import type { Metadata } from "next";

import CommodityDetailPage from "@/components/home/research-and-development/commodity-detail-page";
import { getImportCommodity, listImportCommodities } from "@/lib/rnd/import-intelligence.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Bounded deliberately. India alone has 5,668 commodities and the catalogue grows with
 * every country ingested — prerendering all of them would trade a very long build for pages
 * nobody opens. The first page of the directory covers what the surface links to.
 */
const PRERENDERED_COMMODITY_LIMIT = 50;

/**
 * A dynamic route needs this under `cacheComponents`.
 *
 * A FAILED OR EMPTY READ YIELDS THE SENTINEL PARAM rather than an empty list:
 * `cacheComponents` fails the build on an empty one, and an unreachable backend must not
 * fail the build (`@/lib/static-params`). Anything past the bound renders on demand.
 */
export async function generateStaticParams() {
  const commoditiesResult = await listImportCommodities({ limit: PRERENDERED_COMMODITY_LIMIT });
  const hsCodes = commoditiesResult.success
    ? commoditiesResult.data.rows.map((commodity) => commodity.hsCode)
    : [];
  return withSentinelValues(hsCodes).map((hsCode) => ({ hsCode }));
}

// No session is forwarded here on purpose: metadata is shared by every visitor.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ hsCode: string }>;
}): Promise<Metadata> {
  const { hsCode } = await params;
  const detailResult = await getImportCommodity(hsCode);
  if (!detailResult.success) return { title: "Commodity · Import intelligence" };
  const { commodity } = detailResult.data;
  return {
    title: `${commodity.displayLabel} · Import intelligence`,
    description: commodity.descriptionText ?? undefined,
    alternates: {
      canonical: `/research-and-development/import-intelligence/${hsCode}`,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ hsCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { hsCode } = await params;
  const { reporterCountryCode } = await searchParams;
  return (
    <CommodityDetailPage
      hsCode={hsCode}
      reporterCountryCode={
        typeof reporterCountryCode === "string" ? reporterCountryCode : undefined
      }
    />
  );
}
