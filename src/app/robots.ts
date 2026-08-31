import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// THE SITE HAD NO `robots.txt` AT ALL, so there were no crawl directives and nowhere to point a
// sitemap. This is the whole crawl policy in one file.
//
// `Disallow` IS NOT `noindex`, AND THIS FILE IS THE WEAKER OF THE TWO. A `Disallow` stops the
// crawl, which means the crawler never READS the page's `noindex` — anything already in the index
// stays there, listed without a snippet. So the meta tag is what removes a URL from search
// results, and every prefix below is `noindex` at the page or layout level first:
// `(studio)/layout.tsx` and `(admin)/layout.tsx` cover their groups, `(auth)/layout.tsx` covers
// the four sign-in routes, and the rest carry it per page. What this file adds is crawl budget —
// telling Googlebot not to spend it on 70-odd URLs that will only ever answer with a sign-in wall.
//
// EVERYTHING NOT LISTED IS ALLOWED, deliberately. A denylist of private prefixes stays correct
// when a public route is added; an allowlist would silently hide every new page until someone
// remembered to amend it.

/**
 * Private prefixes. Each is auth-gated AND `noindex`; this list is the crawl-budget half.
 *
 * Prefix matching is what `robots.txt` does — `/disputes` also covers `/disputes/<id>`, so the
 * detail routes need no entry of their own.
 */
const PRIVATE_PATH_PREFIXES = [
  // Whole route groups: one creator's workspace, and the staff console.
  "/studio/",
  "/admin/",

  // Auth flows. No search intent, and they can only outrank the page somebody wanted.
  "/sign-in",
  "/sign-up",
  "/sign-in-with-password",
  "/forgot-password",

  // The viewer's own commerce and library surfaces.
  "/cart",
  "/checkout",
  "/wishlist",
  "/library",
  "/history",
  "/orders-and-returns",

  // Conversations and cases — other people's data by definition.
  "/messages",
  "/disputes",
  "/service-engagements",

  // Buyer/seller negotiation. `/store/rfqs` and `/store/quotes` cover their `/compare` children.
  "/store/rfqs",
  "/store/quotes",
  "/store/factory-inquiries",

  // The authored-by-me halves of two otherwise public surfaces. The public halves —
  // `/store/forum/<thread>` and `/store/find-cofounder/<profile>` — stay crawlable.
  "/store/forum/mine",
  "/store/forum/new",
  "/store/find-cofounder/mine",
  "/store/find-cofounder/new",

  // Not a page at all: `next.config.ts` rewrites this to the Express backend.
  "/api/",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_PATH_PREFIXES],
    },
    // `src/app/sitemap.ts` EXISTS NOW, which is the only condition under which this line may be
    // here: a `robots.txt` advertising a sitemap that 404s is a Search Console error rather than a
    // harmless placeholder. If that file is ever removed, remove this line in the same change.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
