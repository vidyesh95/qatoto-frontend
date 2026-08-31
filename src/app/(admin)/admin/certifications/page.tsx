import type { Metadata } from "next";

import CertificationReviewPage from "@/components/admin/certifications/certification-review-page";

// Permanently dynamic: capability-gated and a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Certifications · Admin",
  description: "The queue behind a factory's approved, filterable compliance certifications",
};

export default function AdminCertificationsRoute() {
  return <CertificationReviewPage />;
}
