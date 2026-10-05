import type { Metadata } from "next";

import SuppressedSearchTermsPage from "@/components/admin/search-terms/suppressed-search-terms-page";

// Permanently dynamic: one capability-gated list, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Hidden search terms · Admin",
  description: "Search terms moderators have withheld from Everyone is searching for",
};

export default function AdminSearchTermsRoute() {
  return <SuppressedSearchTermsPage />;
}
