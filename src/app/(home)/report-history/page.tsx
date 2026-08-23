import type { Metadata } from "next";

import ReportHistoryPage from "@/components/home/report-history-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Report History",
  description: "Reports you have filed on Qatoto, and what came of them.",
  // NO `robots: { index: false }` ANY MORE. It was here while the body was a bare `<h1>`,
  // with its own note saying to remove it once the page got content — this is that. The page
  // is per-viewer and behind a session, so a crawler sees the signed-out state and nothing
  // else; there is no longer a thin page to keep out of the index.
};

export default function ReportHistory() {
  return <ReportHistoryPage />;
}
