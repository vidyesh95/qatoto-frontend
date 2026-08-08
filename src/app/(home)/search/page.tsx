import type { Metadata } from "next";

import SearchPage from "@/components/home/search/search-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Search",
  description: "Search videos on Qatoto",
};

/**
 * `?query=` is the navbar form's own field name, so this route's contract is fixed by the
 * markup that submits to it.
 *
 * THE PROMISE IS PASSED DOWN UNAWAITED, DELIBERATELY — the same rule the homepage states.
 * Awaiting here would make the whole route dynamic under `cacheComponents`; the shell awaits
 * it from inside its own <Suspense>, so only the results region is dynamic.
 */
export default function SearchRoute({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <SearchPage searchParams={searchParams} />;
}
