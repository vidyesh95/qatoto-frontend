import type { Metadata } from "next";

import TeardownDetailPage from "@/components/home/blueprints/teardowns/teardown-detail-page";
import { getPublicTeardown, listPublicTeardownSlugs } from "@/lib/blueprints/teardown-public.api";
import { withSentinelValues } from "@/lib/static-params";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
//
// IT ARRIVED WITH THE DENSITY SWITCH. `?view=business|engineering|factory` is read server-side, and
// reading `searchParams` makes the route dynamic under `cacheComponents` — the same opt-out the two
// filtered index routes on this surface already carry, for the same reason.
export const instant = false;

/**
 * Prerender every readable teardown slug — a dynamic route needs this under `cacheComponents`.
 *
 * THE SENTINEL IS HERE NOW, and this file's previous comment said to add it at exactly this moment:
 * the list comes from the backend, so it can be empty — a database with nothing seeded yet, or a
 * server that is down. An empty array makes Next treat the route as having no paths at all, which
 * is not the same as having none today.
 *
 * ⚠️ THE SERVER USES THE READABLE GATE HERE, NOT THE LISTABLE ONE, so a quarantined teardown IS
 * prerendered even though it appears in no index — eleven slugs where the index shows ten. Its URL
 * still has to answer with the notice; dropping it would give an existing link a 404 and lose the
 * one thing the reader who followed it needs.
 */
export async function generateStaticParams() {
  const slugsResponse = await listPublicTeardownSlugs();
  // `?? []` is right here and nowhere else on this surface: Next's contract is an array, and a
  // failed prerender list must not take the build down.
  const slugs = slugsResponse.success ? slugsResponse.data : [];
  return withSentinelValues(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teardownResponse = await getPublicTeardown(slug);

  // `noindex` ON BOTH RETURN PATHS. The miss path needs it too: returning it only for a resolved
  // teardown would leave every unknown slug indexable, which is the easiest half to forget.
  const robots = { index: false, follow: false } as const;

  if (!teardownResponse.success) return { robots, title: "Teardowns · Blueprints" };
  const teardown = teardownResponse.data;

  return {
    robots,
    title: `${teardown.title} · Teardowns`,
    description: teardown.summary,
    alternates: { canonical: `/blueprints/teardowns/${slug}` },
  };
}

export default async function TeardownRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  // `searchParams` IS PASSED UNAWAITED. The page awaits it after its own read, so the two do not
  // serialize — and `readEnumParam` drops anything that is not one of the three views.
  return <TeardownDetailPage slug={slug} searchParams={searchParams} />;
}
