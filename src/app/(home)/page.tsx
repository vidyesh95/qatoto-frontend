import type { Metadata } from "next";

import BetaLanding from "@/components/home/landing/beta-landing";
// HIDDEN-FOR-BETA: the promo carousel and video feed. To restore, uncomment these two imports, the
// component at the bottom, and delete `BetaLanding`.
// import Home from "@/components/home/feed/home";
// import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: { absolute: "Qatoto" },
  description:
    "Find people to build a real product with, and keep a verified record of who did what.",
};

export default function HomePage() {
  return <BetaLanding />;
}

// HIDDEN-FOR-BETA: the pre-beta home page. `searchParams` carries the feed filter, and it is passed
// down unawaited so that only the feed region is dynamic (see the notes in `feed/home.tsx`).
//
// export default function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
//   return <Home searchParams={searchParams} />;
// }
