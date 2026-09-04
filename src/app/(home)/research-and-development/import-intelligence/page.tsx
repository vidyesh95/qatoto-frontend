import type { Metadata } from "next";
import ImportIntelligencePage from "@/components/home/research-and-development/import-intelligence-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Import Intelligence · R&D",
  description:
    "Country-level import volumes by HS code, domestic substitutes, and a feasibility score for making it here instead",
};

// `searchParams` carries the commodity-kind and country filters, forwarded to the backend
// as query params and applied there in SQL. Reading it makes this route dynamic under
// `cacheComponents`; the sibling `loading.tsx` is the boundary.
export default function ImportIntelligence({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ImportIntelligencePage searchParams={searchParams} />;
}
