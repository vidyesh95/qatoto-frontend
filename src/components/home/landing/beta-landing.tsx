// TRANSPORT: props-only — composes the beta home page. The one fetching child sits behind its own
// <Suspense> boundary, so the pitch prints in the static shell and never waits on the backend.

import Link from "next/link";
import { Suspense } from "react";

import LandingOpenTeams from "@/components/home/landing/landing-open-teams";

/**
 * The home page for the beta: what Qatoto is, two ways in, and whatever is really open today.
 *
 * It replaced the video feed as the first thing a visitor sees. `feed/home.tsx` is untouched and
 * `app/(home)/page.tsx` carries the commented import that puts it back.
 *
 * THE FALLBACK IS `null`, NOT A SKELETON. On a new database there may be no open team at all, and a
 * skeleton would promise a section that then disappears.
 */
export default function BetaLanding() {
  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <section className="mx-4 rounded-2xl bg-linear-to-r from-band-ink via-band-deep to-band-imprint p-6 text-white md:p-10 lg:mx-6">
        <h1 className="max-w-2xl text-3xl font-medium tracking-tight text-balance lg:text-4xl">
          Find people to build a real product with.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-pretty text-white/80 md:text-base">
          Post an idea, or join a team that needs your skills. Daily logs keep a verified record of
          who did what. For engineers, makers and first-time founders building physical products.
        </p>
        {/* A WHITE FOCUS RING, set here rather than left to the browser, whose default is drawn
            for a light page and is hard to see on this permanently dark band. `outline`, not
            `ring`: a box-shadow ring disappears in forced-colors mode and an outline does not. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/research-and-development/new"
            className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-primary-imprint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            I have an idea
          </Link>
          <Link
            href="/research-and-development/team-building"
            className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Find a team
          </Link>
        </div>
      </section>
      <Suspense fallback={null}>
        <LandingOpenTeams />
      </Suspense>
    </div>
  );
}
