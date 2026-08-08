import type { Metadata } from "next";
import ReviewQueuePage from "@/components/admin/review/review-queue-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Content Review",
  description: "Qatoto staff content review queue",
};

export default function AdminReviewPage() {
  return <ReviewQueuePage />;
}
