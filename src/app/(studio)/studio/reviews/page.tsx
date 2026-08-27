import type { Metadata } from "next";

import SellerReviewsPage from "@/components/studio/commerce/reviews/seller-reviews-page";

// Permanently dynamic: session-scoped and behind a seller organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Reviews of your organization",
  description: "What buyers said about your organization on Qatoto",
};

export default function SellerReviewsRoute() {
  return (
    <div className="p-6">
      <SellerReviewsPage />
    </div>
  );
}
