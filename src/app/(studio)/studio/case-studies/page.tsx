import type { Metadata } from "next";

import StudioCaseStudiesPage from "@/components/studio/case-studies/studio-case-studies-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "My Case Studies",
  description: "My Case Studies page for Qatoto Creator Studio",
};

export default function StudioMyCaseStudies() {
  return <StudioCaseStudiesPage />;
}
