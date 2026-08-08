import type { Metadata } from "next";
import GoToMarketPage from "@/components/home/research-and-development/go-to-market-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Go-to-Market · R&D",
  description:
    "Manufacturing and ODM partners, launch readiness, and the handoff from a verified build to a store listing",
};

// `searchParams` carries the capability / region / verification filters, forwarded to the
// backend as query params — the repeated `?capability=` is ANDed in SQL. Reading it makes
// this route dynamic under `cacheComponents`; the sibling `loading.tsx` is the boundary.
export default function GoToMarket({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <GoToMarketPage searchParams={searchParams} />;
}
