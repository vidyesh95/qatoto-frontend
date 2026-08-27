import type { Metadata } from "next";

import PitchDetailPage from "@/components/home/research-and-development/pitch-detail-page";
import { getPitch, listPublishedPitchSlugs } from "@/lib/rnd/pitches.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 *
 * `withSentinelValues` because an EMPTY array throws `EmptyGenerateStaticParamsError`, and a
 * database with no published pitch yet is an ordinary state rather than a build failure. A
 * failed read returns `[]` for the same reason: an unreachable backend must not fail the
 * build, and the sentinel then renders as `notFound()` exactly as a typo would.
 */
export async function generateStaticParams() {
  const slugsResult = await listPublishedPitchSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((pitchSlug) => ({
    pitchSlug,
  }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ pitchSlug: string }>;
}): Promise<Metadata> {
  const { pitchSlug } = await params;
  const pitchResult = await getPitch(pitchSlug);
  if (!pitchResult.success) return { title: "Pitch · R&D" };
  return {
    title: `${pitchResult.data.pitch.title} · R&D`,
    description: pitchResult.data.pitch.summary.slice(0, 160),
    alternates: { canonical: `/research-and-development/pitches/${pitchSlug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ pitchSlug: string }> }) {
  const { pitchSlug } = await params;
  return <PitchDetailPage pitchSlug={pitchSlug} />;
}
