import type { Metadata } from "next";
import { notFound } from "next/navigation";

import RightsClaimComposer from "@/components/home/blueprints/teardowns/rights-claim/rights-claim-composer";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * ⚠️ THE SENTINEL ONLY, AND NOT THE REAL SLUGS. This route is a WRITE SURFACE, NOT A DOCUMENT —
 * the same call `/store/factories/[factorySlug]/inquire` makes in its own words. Prerendering a
 * claim form per teardown would bake 12 copies of an empty form into the build for a page almost
 * nobody opens, and every one of them would be a page a crawler could find.
 *
 * An EMPTY array is not an option: `cacheComponents` throws `EmptyGenerateStaticParamsError` on one,
 * which is exactly what `withSentinelValues` exists for.
 */
export async function generateStaticParams() {
  return withSentinelValues([]).map((slug) => ({ slug }));
}

export const metadata: Metadata = {
  // `noindex`, and here for a stronger reason than the rest of the surface carries it: a form for
  // making legal claims has nothing for a crawler and every reason not to be a search result.
  robots: { index: false, follow: false },
  title: "Report an IP concern · Teardowns",
  description: "Prepare an intellectual property notice about a teardown published on Qatoto.",
};

export default async function TeardownRightsClaimRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teardown = await getBlueprintByCategory("teardown", slug);

  /**
   * ⚠️ A QUARANTINED TEARDOWN STILL ACCEPTS A CLAIM, and `getBlueprint`'s readable gate is what
   * makes that work — it hands back `published`, `flagged` and `quarantined` alike. A second rights
   * holder may have an entirely different objection from the first, and refusing them because
   * somebody else got there first would be this surface deciding that one claim settles a row.
   *
   * `draft`, `pending_review`, `rejected` and `removed` return `null` and 404 here, as everywhere:
   * there is nothing public to object to.
   */
  if (teardown === null) notFound();

  return (
    <div className="px-4 pt-5 pb-12 lg:px-6">
      <RightsClaimComposer teardown={teardown} />
    </div>
  );
}
