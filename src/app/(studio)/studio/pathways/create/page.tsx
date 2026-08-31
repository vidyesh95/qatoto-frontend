import type { Metadata } from "next";

import PathwayComposer from "@/components/studio/pathways/pathway-composer";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit a set",
  description: "Create or edit a curated product set",
};

/**
 * `?pathwayId=` RATHER THAN `/[pathwayId]`, matching `/studio/products` and `/studio/pitches` — a
 * dynamic segment here would need `generateStaticParams` under `cacheComponents`, and there is
 * nothing to prerender for a route that only ever serves the signed-in author of one private draft.
 *
 * `searchParams` is awaited server-side, so this needs no `<Suspense>` wrapper. The array guard is
 * for a repeated `?pathwayId=` — the newest of the two precedents does the same.
 */
export default async function StudioPathwayComposerRoute({
  searchParams,
}: {
  searchParams: Promise<{ pathwayId?: string | string[] }>;
}) {
  const { pathwayId } = await searchParams;
  const firstPathwayId = Array.isArray(pathwayId) ? pathwayId[0] : pathwayId;

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <PathwayComposer pathwayId={firstPathwayId} />
    </div>
  );
}
