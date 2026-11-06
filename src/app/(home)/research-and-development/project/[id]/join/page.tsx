import type { Metadata } from "next";
import { Suspense } from "react";

import JoinProjectPage from "@/components/home/research-and-development/join-project-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { listResearchProjectSlugs } from "@/lib/rnd/projects.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// The project page is the page search engines should find. This one is its doorway for somebody
// who was sent a link.
export const metadata: Metadata = {
  title: "Join a project · R&D",
  robots: { index: false, follow: false },
};

/** Same prerender rule as the project page beside it, for the same reason. */
export async function generateStaticParams() {
  const slugsResult = await listResearchProjectSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((id) => ({ id }));
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <Suspense fallback={null}>
      <JoinProjectPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
