import type { Metadata } from "next";

import ChannelPage from "@/components/home/channel/channel-page";
import { loadChannelProfileOnce } from "@/lib/channels/server";
import { SITE_SHARE_IMAGE } from "@/lib/site";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
 * THE `generateMetadata` OBJECTION IS NOW REMOVED RATHER THAN ACCEPTED. It used to read: a second
 * fetch of a route the page already reads is not worth a title. That was true while the read went
 * out `cache: "no-store"` — which it does, because the profile carries the viewer's own
 * subscription state — since Next does not memoize those. `loadChannelProfileOnce` wraps it in
 * React's `cache()`, so the metadata and the page now share ONE round trip and the title is free.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const result = await loadChannelProfileOnce(handle);

  // THE OLD STATIC TITLE IS THE FAILURE PATH, NOT THE DEFAULT. A metadata read that fails must not
  // take the page down — the page runs `notFound()` on its own read, and a 404 with a generic title
  // is correct. It also must not leak: "Channel" is returned for a handle that does not exist AND
  // for one nobody has claimed, exactly as the 404 refuses to distinguish them.
  if (!result.success) {
    return { title: "Channel", description: "A creator's published videos on Qatoto" };
  }
  const profile = result.data;

  // THE BIO IS ALREADY MODERATION-GATED ON THE SERVER — `bio` arrives null when a moderator has
  // hidden the profile text — so no check is needed here, and adding a local one would imply the
  // gate is this page's job. What is NOT safe is falling back to the bio's absence silently: the
  // generic sentence is a description of the PAGE, not a claim about the creator.
  const description =
    profile.bio ?? `${profile.name}'s published videos on Qatoto. @${profile.handle}`;

  return {
    title: profile.name,
    description,
    alternates: { canonical: `/channel/${profile.handle}` },
    openGraph: {
      title: profile.name,
      description,
      // `profile`, not `website`. This page is one person's identity, and the OG type is what tells
      // a card renderer to treat the image as an avatar rather than a hero.
      type: "profile",
      username: profile.handle,
      url: `/channel/${profile.handle}`,
      // ⚠️ THE FALLBACK IS NAMED, NOT INHERITED. Next REPLACES `openGraph` rather than merging it,
      // so omitting `images` for a creator with no avatar emits NO `og:image` at all rather than
      // falling back to the branded card. Verified in the served HTML, not assumed.
      images:
        profile.imageUrl === null
          ? [SITE_SHARE_IMAGE]
          : [{ url: profile.imageUrl, alt: profile.name }],
    },
    // A SEPARATE KEY THAT DOES NOT READ `openGraph` — without it X shows the site title on every
    // creator's page. `summary`, not `summary_large_image`: an avatar is a small square, and
    // stretching one into a 1200×630 hero crops it into abstraction. The branded fallback IS a
    // 1200×630 card, so it gets the large variant.
    twitter: {
      card: profile.imageUrl === null ? "summary_large_image" : "summary",
      title: profile.name,
      description,
      images: [profile.imageUrl ?? SITE_SHARE_IMAGE.url],
    },
  };
}

export default async function Channel({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ChannelPage handle={handle} />;
}
