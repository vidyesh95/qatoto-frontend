import type { Metadata } from "next";

import TalentDetailPage from "@/components/home/research-and-development/talent-detail-page";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Profile · Talent · R&D",
  description: "A contributor's published Qatoto profile",
};

/**
 * NOTHING REAL TO PRERENDER, and that is the right answer here.
 *
 * `GET /discovery/talent/:handle` is `requireAuth` — the only §6 read that returns other
 * people's personal data — so there is no anonymous read to enumerate profiles from, and
 * prerendering a page of somebody's personal data would be caching it for every visitor.
 * `cacheComponents` still refuses an empty list, so the route declares the sentinel and
 * renders every real handle on demand.
 *
 * No metadata read either: titling the page from a viewer-scoped read would leak one
 * caller's view into another's.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((handle) => ({ handle }));
}
export default async function Talent({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <TalentDetailPage handleOrUserId={handle} />;
}
