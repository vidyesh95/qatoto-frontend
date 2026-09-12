// The flat blueprint URL, from before each category got its own segment.
//
// WHY THE REDIRECT LIVES HERE AND NOT IN `next.config.ts`, which is the load-bearing part: the
// destination depends on the row's CATEGORY, and a config rewrite cannot know it. `/anime` got its
// 308s in the config precisely because that mapping was static — `/anime/:path*` went to one
// place. This one needs a lookup, so it needs a route.
//
// WHAT IT COSTS, measured and written down at `src/app/(home)/store/[...slug]/page.tsx:25-30`:
// under `cacheComponents` a redirect from a page component does NOT produce a 308 response
// header. The static shell has already flushed by the time the dynamic part runs, so Next emits
// `<meta http-equiv="refresh">` alongside an RSC `NEXT_REDIRECT` — the browser lands on the right
// URL, after a visible pause. Middleware is the only mechanism that runs earlier, and standing up
// a global surface to serve a de-indexed mock URL space is not the trade.
//
// `permanentRedirect` RATHER THAN `redirect`, unlike the four redirects already in this repo. Each
// of those is temporary by intent — a route scheduled for deletion, where a 308 cached by
// browsers and CDNs would be a URL you cannot recall. This is the opposite: the flat shape is
// never coming back, and a permanent answer is the honest one.
//
// NO `generateStaticParams`, matching every other redirect here: there is no content to
// prerender, only a destination.
//
// IT DOES CARRY `noindex`, WHICH THE OTHER FOUR REDIRECTS DO NOT NEED. They answer a real 307 and
// have no document; this one, per the paragraph above, actually renders a meta-refresh page. On a
// surface where all seven other routes are deliberately de-indexed, leaving one indexable
// interstitial behind would be the one gap nobody thinks to look for. That is also why this is a
// static `metadata` object rather than a `generateMetadata` — the flag does not depend on which
// blueprint was asked for, and a title would name a page nobody reads.

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { listPublicCaseStudySlugs } from "@/lib/blueprints/case-study-public.api";
import { buildBlueprintHref, type BlueprintCategory } from "@/lib/blueprints/schemas";
import { listPublicShowcaseSlugs } from "@/lib/blueprints/showcase-public.api";
import { listPublicTeardownSlugs } from "@/lib/blueprints/teardown-public.api";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Which arm claims this slug, or `null`.
 *
 * ⚠️ THREE SLUG LISTS RATHER THAN THREE DETAIL READS, and it used to be one fixture lookup. The
 * three arms now live in three tables with one unique slug each and no cross-kind registry, so
 * "which category owns this address" is a question only the three lists can answer. They are the
 * cheapest form of the probe — one short string per row, the same payload the prerender step
 * already fetches — where three detail reads would pull three whole case studies to learn one word.
 *
 * A FAILED READ IS TREATED AS "NOT THIS ARM" rather than propagated. This route exists to bounce a
 * de-indexed legacy URL; answering 404 because one of three probes was unreachable is the same
 * answer a reader gets today from the old shape, and the alternative is a 500 on a URL nobody is
 * supposed to be using.
 */
async function findOwningCategory(slug: string): Promise<BlueprintCategory | null> {
  const [teardownSlugs, caseStudySlugs, showcaseSlugs] = await Promise.all([
    listPublicTeardownSlugs(),
    listPublicCaseStudySlugs(),
    listPublicShowcaseSlugs(),
  ]);

  if (teardownSlugs.success && teardownSlugs.data.includes(slug)) return "teardown";
  if (caseStudySlugs.success && caseStudySlugs.data.includes(slug)) return "case_study";
  if (showcaseSlugs.success && showcaseSlugs.data.includes(slug)) return "showcase";
  return null;
}

export default async function LegacyBlueprintRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await findOwningCategory(slug);

  // A hand-edited or long-dead slug ends at a 404 rather than at the hub. Bouncing an unknown URL
  // to a working page hides the fact that the thing asked for does not exist.
  if (category === null) notFound();

  permanentRedirect(buildBlueprintHref({ category, slug }));
}
