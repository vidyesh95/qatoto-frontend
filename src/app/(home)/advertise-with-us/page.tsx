import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Advertise With Us",
  description: "Advertise With Us page for Qatoto",
  // NOINDEX WHILE THIS IS A STUB. The body is a bare `<h1>` — `kind: "planned"` in
  // `src/lib/roadmap/site-roadmap.ts`, listed in `docs/REMAINING_WORK.md` §2. An empty page in
  // the index outranks nothing and teaches the crawler the site is thin. REMOVE THIS LINE when
  // the page gets content; it is not a policy about the route, only about its current state.
  robots: { index: false, follow: false },
};

export default function AdvertiseWithUs() {
  return <h1>Advertise with us</h1>;
}
