import type { Metadata } from "next";

import ChannelPage from "@/components/home/channel/channel-page";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Channel",
  description: "A creator's published videos on Qatoto",
};

/**
 * NOTHING REAL TO PRERENDER, and unlike `/talent/[handle]` that is a gap rather than a policy.
 *
 * This page IS public — it is what every feed card links to, and a crawler should index it. But
 * there is no public handle-enumeration read anywhere on the backend to build a list from:
 * `/handles/availability` answers about the CALLER's own handle and is `requireAuth`. So the
 * route declares the sentinel `cacheComponents` requires (an empty `generateStaticParams` fails
 * the build) and renders every real handle on demand.
 *
 * IT IS ALSO WHY THE CHANNEL PAGE IS NOT IN `sitemap.ts`. That file refuses invented entries as
 * firmly as it refuses invented dates, and a list of handles is exactly what it does not have.
 * Recorded in todo.md rather than papered over.
 *
 * NO `generateMetadata` READING THE CHANNEL. It would be a second fetch of a route the page
 * itself already reads, on a page whose title is the creator's name — worth doing when the
 * duplicate read is cheap enough to justify, and not yet measured.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((handle) => ({ handle }));
}

export default async function Channel({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ChannelPage handle={handle} />;
}
