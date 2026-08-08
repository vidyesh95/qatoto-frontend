import type { Metadata } from "next";

import CofounderProfilePage from "@/components/home/store/cofounder-profile-page";
import { withSentinelValues } from "@/lib/static-params";
import { getCofounderProfile } from "@/lib/store/cofounders.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_COFOUNDER_SLUGS } from "@/mocks/store/cofounders-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `withSentinelValues` because `cacheComponents` fails the build on an empty
 * `generateStaticParams`, and the sentinel slug takes the same `notFound()` path a typo does.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_COFOUNDER_SLUGS]).map((profileSlug) => ({
    profileSlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profileSlug: string }>;
}): Promise<Metadata> {
  const { profileSlug } = await params;
  const result = await getCofounderProfile(profileSlug);

  // A failed metadata read must not take the page down — the page renders its own error or 404.
  const displayName = result.success
    ? result.data.profile.displayName
    : prettifySlugForDisplay(profileSlug);

  return {
    title: `${displayName} · Find a cofounder`,
    // THE HEADLINE IS THEIR OWN SENTENCE, so it is the description rather than a generated summary.
    // It also keeps the capital figure out of the page metadata, which is where an unverified number
    // would travel furthest.
    description: result.success
      ? result.data.profile.headline
      : `${displayName} on the Qatoto cofounder directory`,
  };
}

export default async function StoreCofounderProfileRoute({
  params,
}: {
  params: Promise<{ profileSlug: string }>;
}) {
  const { profileSlug } = await params;
  return <CofounderProfilePage profileSlug={profileSlug} />;
}
