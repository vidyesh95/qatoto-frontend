import type { Metadata } from "next";
import ReviewQueuePage from "@/components/admin/review/review-queue-page";

export const metadata: Metadata = {
  title: "Content Review",
  description: "Qatoto staff content review queue",
};

export default function AdminReviewPage() {
  return <ReviewQueuePage />;
}
