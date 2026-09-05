import type { Metadata } from "next";

import BlueprintsPage from "@/components/home/blueprints/blueprints-page";

export const metadata: Metadata = {
  // `noindex` WHILE THE FIXTURES ARE INVENTED. Not a permanent property of this route — the hub
  // is public and linked from the sidebar, which is exactly why dropping it from `sitemap.ts`
  // was not enough on its own. Remove this flag and restore the two sitemap entries together,
  // the day real blueprints exist.
  robots: { index: false, follow: false },
  title: "Blueprints",
  description:
    "Engineering teardowns, working prototypes and manufacturing case studies — schematics, tolerances and bills of materials, published in the open.",
  alternates: { canonical: "/blueprints" },
};

export default function BlueprintsRoute() {
  return <BlueprintsPage />;
}
