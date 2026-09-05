import type { Metadata } from "next";

import CaseStudiesIndexPage from "@/components/home/blueprints/case-studies/case-studies-index-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Case studies · Blueprints",
  description:
    "Manufacturing case studies — volumes, unit economics and go-to-market, one numbered lesson at a time.",
  alternates: { canonical: "/blueprints/case-studies" },
};

export default function CaseStudiesRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <CaseStudiesIndexPage searchParams={searchParams} />;
}
