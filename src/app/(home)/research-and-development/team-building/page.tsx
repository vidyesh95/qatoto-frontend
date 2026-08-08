import type { Metadata } from "next";
import TeamBuildingPage from "@/components/home/research-and-development/team-building-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Team Building · R&D",
  description: "Every open role across Qatoto R&D projects — trade your skills for a stake",
};

// `searchParams` carries the commitment / skill filter state, which the page body
// forwards to the backend as query params — filtering happens in SQL, not over a fetched
// page. Reading it makes this route dynamic under `cacheComponents`; the sibling
// `loading.tsx` is the Suspense boundary that covers it.
export default function TeamBuilding({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TeamBuildingPage searchParams={searchParams} />;
}
