import type { Metadata } from "next";
import ProblemMapPage from "@/components/home/research-and-development/problem-map-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Problem Map · R&D",
  description: "Civic Pulse — reported infrastructure gaps mapped into opportunity on Qatoto",
};

// `searchParams` carries the category filter, forwarded to the backend as a query param
// so filtering happens in SQL rather than over a fetched page. Reading it makes this
// route dynamic under `cacheComponents`; the sibling `loading.tsx` is the boundary.
export default function ProblemMap({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProblemMapPage searchParams={searchParams} />;
}
