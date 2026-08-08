import type { Metadata } from "next";
import SearchPage from "@/components/home/store/search-page";
import type { RawSearchParams } from "@/lib/filter-href";

export const metadata: Metadata = {
  title: "Search · Store",
};

// `searchParams` makes this dynamic under `cacheComponents`; store `loading.tsx` is the boundary.
export default function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <SearchPage searchParams={searchParams} />;
}
