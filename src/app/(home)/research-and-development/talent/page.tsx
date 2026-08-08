import type { Metadata } from "next";
import TalentPage from "@/components/home/research-and-development/talent-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Talent · R&D",
  description: "Browse people trading skills for equity on Qatoto R&D projects",
};

// `searchParams` carries the filter state (commitment / availability / skill), which the
// page body forwards to the backend as query params — filtering happens in SQL, not over
// a fetched page. Reading it makes this route dynamic under `cacheComponents`; the
// sibling `loading.tsx` is the Suspense boundary that covers it.
export default function Talent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TalentPage searchParams={searchParams} />;
}
