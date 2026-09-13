import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import RightsClaimComposer from "@/components/home/blueprints/teardowns/rights-claim/rights-claim-composer";
import { getPublicTeardown, getTeardownClaimTargets } from "@/lib/blueprints/teardown-public.api";
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

  /**
   * ⚠️ TWO READS, AND THE SECOND IS WHY THE WITHHOLDING DOES NOT BREAK THIS PAGE.
   *
   * A QUARANTINED TEARDOWN STILL ACCEPTS A CLAIM, and the server's READABLE gate is what makes that
   * work — it serves `published`, `flagged` and `quarantined` alike. A second rights holder may
   * have an entirely different objection from the first, and refusing them because somebody else
   * got there first would be this surface deciding that one claim settles a row.
   *
   * But the detail read WITHHOLDS a quarantined teardown's documents, fabrication files and model,
   * which are exactly the three lists the picker offers. `claim-targets` serves their ids and
   * titles — and no URLs — so the claimant can still name the specific file they mean while the
   * disputed bytes stay withheld.
   *
   * `draft`, `pending_review`, `rejected` and `removed` 404 here, as everywhere: there is nothing
   * public to object to.
   */
  const [teardownResponse, claimTargetsResponse] = await Promise.all([
    getPublicTeardown(slug),
    getTeardownClaimTargets(slug),
  ]);
  if (!teardownResponse.success || !claimTargetsResponse.success) notFound();

  return (
    <div className="px-4 pt-5 pb-12 lg:px-6">
      <RightsClaimComposer
        teardown={teardownResponse.data}
        claimTargets={claimTargetsResponse.data}
      />

      {/*
        ⚠️ THE SIGNPOST BACK TO THE ORDINARY REPORT CONTROL, AND IT EARNS ITS PLACE.
        This page is titled "report" and is the first thing a reader looking for one finds — but it
        is an IP NOTICE: three sworn clauses, a named right, a claimant with standing, and one
        specific file. Somebody who came here to say "the measurements look made up" would either
        abandon it or swear to something they did not mean. Neither is a good outcome, and a link is
        cheaper than either.
      */}
      <p className="mx-auto mt-8 max-w-2xl border-t border-[#CAC4D0]/60 pt-4 text-sm text-muted-foreground">
        Not a rights holder? If something about this write-up looks wrong — figures that look made
        up, a step that would injure someone, or a survey of a different product — use{" "}
        <Link
          href={`/blueprints/teardowns/${encodeURIComponent(slug)}`}
          className="font-medium text-[#00696E] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Report this
        </Link>{" "}
        at the foot of the teardown instead. It reaches a moderator rather than preparing a legal
        notice.
      </p>
    </div>
  );
}
