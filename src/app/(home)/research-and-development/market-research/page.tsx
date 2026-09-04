import type { Metadata } from "next";
import MarketResearchPage from "@/components/home/research-and-development/market-research-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Market Research · R&D",
  description:
    "Where demand is highest and what the country imports — reported problems and import substitution, ranked separately",
  // INDEXED, unlike the knowledge hub this replaced. That route carried
  // `robots: { index: false }` with the comment "signed-in only", which had stopped being
  // true: every read on this surface is public (`attachOptionalUser`), so a crawler gets the
  // real page rather than a sign-in wall.
};

// `searchParams` carries the tab, the country and the two commodity-kind filters, all applied
// by the backend in SQL. Reading it makes this route dynamic under `cacheComponents`; the
// sibling `loading.tsx` is the boundary.
export default function MarketResearch({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MarketResearchPage searchParams={searchParams} />;
}
