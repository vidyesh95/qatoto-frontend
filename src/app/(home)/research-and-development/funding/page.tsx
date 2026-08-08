import type { Metadata } from "next";
import FundingPage from "@/components/home/research-and-development/funding-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Funding · R&D",
  description: "Investor deal flow — Qatoto R&D projects raising right now",
};

// `searchParams` carries the round-type / stage filters, forwarded to the backend as query
// params. Reading it makes this route dynamic under `cacheComponents`; the sibling
// `loading.tsx` is the Suspense boundary that covers it.
export default function Funding({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FundingPage searchParams={searchParams} />;
}
