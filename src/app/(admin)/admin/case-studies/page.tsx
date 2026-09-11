import type { Metadata } from "next";

import CaseStudyModerationPage from "@/components/admin/case-studies/case-study-moderation-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Case studies · Admin",
  description: "Case studies waiting for review",
};

export default function AdminCaseStudiesRoute() {
  return <CaseStudyModerationPage />;
}
