import type { Metadata } from "next";

import CaseStudyAuthoringPage from "@/components/home/blueprints/case-studies/authoring/case-study-authoring-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  // `noindex`, like every route on this surface while the fixtures are invented, and like the other
  // two forms beside it: a writing form has nothing for a crawler.
  robots: { index: false, follow: false },
  title: "Write a case study · Blueprints",
  description:
    "Write up a lesson somebody learned the expensive way: what went wrong, what they did, and where the figures came from.",
  alternates: { canonical: "/blueprints/case-studies/new" },
};

export default function NewCaseStudyRoute() {
  return (
    <div className="px-4 pt-5 pb-12 lg:px-6">
      <CaseStudyAuthoringPage />
    </div>
  );
}
