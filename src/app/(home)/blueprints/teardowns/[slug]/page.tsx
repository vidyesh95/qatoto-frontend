import type { Metadata } from "next";

import TeardownDetailPage from "@/components/home/blueprints/teardowns/teardown-detail-page";
import { getBlueprintByCategory, listBlueprintSlugsByCategory } from "@/lib/blueprints/api";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
//
// IT ARRIVED WITH THE DENSITY SWITCH. `?view=business|engineering|factory` is read server-side, and
// reading `searchParams` makes the route dynamic under `cacheComponents` — the same opt-out the two
// filtered index routes on this surface already carry, for the same reason.
export const instant = false;

/**
 * Prerender every published teardown slug — a dynamic route needs this under `cacheComponents`.
 *
 * NO `withSentinelValues` HERE, for the reason `src/lib/blueprints/api.ts` records: the getter
 * reads an in-repo fixture array, which cannot be empty and cannot fail. Add the sentinel at the
 * same moment it starts reading the backend, and filter the reserved slugs BEFORE wrapping.
 */
export async function generateStaticParams() {
  // ⚠️ `listBlueprintSlugsByCategory` USES THE PUBLICLY-READABLE GATE, NOT THE LISTABLE ONE, so a
  // quarantined teardown is prerendered here even though it appears in no index. Its URL still has
  // to answer with the notice; dropping it would give an existing link a 404 and lose the one thing
  // the reader who followed it needs.
  const slugs = await listBlueprintSlugsByCategory("teardown");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teardown = await getBlueprintByCategory("teardown", slug);

  // `noindex` ON BOTH RETURN PATHS. The miss path needs it too: returning it only for a resolved
  // teardown would leave every unknown slug indexable, which is the easiest half to forget.
  const robots = { index: false, follow: false } as const;

  if (teardown === null) return { robots, title: "Teardowns · Blueprints" };

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
