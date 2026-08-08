// LEGACY SINGULAR ROUTE — REDIRECT ONLY. DELETE THIS DIRECTORY AFTER 2026-11-01.
//
// `/store/pathway/<slug>` becomes `/store/pathways/<slug>`, matching §3.1 and matching the plural
// index that now exists beside it. One segment per concept: `/store/pathways` lists them and
// `/store/pathways/<slug>` opens one, so there is no singular/plural pair to transpose.
//
// The destination is a different PAGE, not just a different URL. The old body rendered a flat
// `items[]` and a "Buy complete set" link straight to `/cart` with no bundle add; the new one renders
// slots, per-currency subtotals and honest degradation, and disables the whole-set CTA when the set
// cannot be completed.
//
// Same mechanics and the same measured cost as the category redirect: under `cacheComponents` a
// `redirect()` from a page component cannot set a 307 header, because the static shell has already
// flushed — Next emits a `<meta http-equiv="refresh">` plus an RSC redirect and the browser arrives
// after a visible pause. Accepted for a URL space scheduled for deletion, and consistent with the
// other two redirects this repo ships.

import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `generateStaticParams` and no `generateMetadata`: there is no content to prerender, only a
// destination, and a redirect renders no document to title.

export default async function LegacyPathwayRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/store/pathways/${id}`);
}
