import type { Metadata } from "next";

import BlueprintsPage from "@/components/home/blueprints/blueprints-page";

export const metadata: Metadata = {
  // `noindex` WHILE THE SEEDED CONTENT IS INVENTED. Not a permanent property of this route — the
  // hub is public and linked from the sidebar, which is exactly why dropping it from `sitemap.ts`
  // was not enough on its own.
  //
  // ⚠️ THE TRIGGER IS REAL SUBMITTED BLUEPRINTS, NOT A REAL BACKEND. The backend has been real for
  // a while; what a seeded database holds is twelve fabricated teardowns and ten fabricated case
  // studies from `qatoto-backend/scripts/fixtures/blueprint-seed-corpus.ts`, several surveying real
  // named products under invented author names. Remove this flag and restore the sitemap entries
  // together — SEVEN routes, not two — the day rows exist that an author actually wrote.
  robots: { index: false, follow: false },
  title: "Blueprints",
  description:
    "Engineering teardowns, working prototypes and manufacturing case studies — schematics, tolerances and bills of materials, published in the open.",
  alternates: { canonical: "/blueprints" },
};

export default function BlueprintsRoute() {
  return <BlueprintsPage />;
}
