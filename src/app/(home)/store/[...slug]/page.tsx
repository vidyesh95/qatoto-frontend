// LEGACY CATCH-ALL — REDIRECT ONLY. DELETE THIS DIRECTORY AFTER 2026-11-01.
//
// `/store/<slug>` used to BE the category page. Categories now live under an explicit
// literal segment, `/store/categories/<slug>`, so that an unknown store path stops looking
// like a category and every literal segment the store needs — `search`, `providers`,
// `services`, `pathways`, `rails`, `rfqs`, `quotes` — can exist without being shadowed.
//
// This file keeps its `generateStaticParams` so the 33 known legacy URLs prerender as
// redirects rather than paying a runtime miss each.
//
// WHY THE REDIRECT LIVES HERE AND NOT IN `next.config.ts`, which is the load-bearing part:
// a config redirect would need either the whole slug list duplicated in config or a wildcard
// `source: "/store/:path*"` — and that wildcard ALSO MATCHES `/store/search`. Config
// redirects run in the proxy layer BEFORE the App Router, so router precedence cannot save
// you: one would shadow every literal store segment above. A catch-all route is the only
// redirect mechanism whose precedence is the router's own, which is exactly why it is the
// right one. Within a directory the order is static > `[param]` > `[...param]`, so
// `categories/`, `search/` and the rest all beat this file — as `organizations/`,
// `product/` and `pathway/` already do.
//
// `redirect` (307) and NOT `permanentRedirect` (308): §3 asks for temporary redirects, this
// route is scheduled for deletion, and a 308 on a URL space you intend to reuse is cached by
// browsers and CDNs in a way you cannot recall.
//
// WHAT THIS COSTS, MEASURED RATHER THAN ASSUMED: under `cacheComponents` a `redirect()` from
// a page component does NOT produce a 307 response header. The static shell has already
// flushed by the time the dynamic part runs, so Next emits
// `<meta http-equiv="refresh" content="1;url=…">` alongside an RSC
// `NEXT_REDIRECT;replace;…;307` — the browser lands on the right URL, after a visible pause.
// Dropping `generateStaticParams` does not change that; it was measured both ways.
//
// It is accepted rather than worked around, for two reasons. It is the behaviour of the one
// redirect this repo already ships (`(home)/project-immortal/page.tsx`, same shape), so
// changing it here would make two redirects behave differently for no stated reason. And the
// only mechanism that runs before the router is middleware — a new global surface, whose one
// job would be to serve URLs that are scheduled for deletion. If legacy traffic turns out to
// matter, middleware is the fix, and it can enumerate the literal segments that `next.config`
// wildcards cannot.

import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `generateStaticParams`: there is no content to prerender, only a destination, and
// prerendering a redirect just spends build time to arrive at the same meta refresh.
//
// No `generateMetadata` either — a redirect renders no document, so any title it produced
// would be for a page nobody sees.

export default async function LegacyStoreCategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // The whole path is carried across, not just the last segment, so a deep legacy URL lands
  // on the same depth it left. The destination corroborates its own last segment and 404s if
  // the trail is nonsense, which is where a hand-edited legacy URL should end up.
  redirect(`/store/categories/${slug.join("/")}`);
}
