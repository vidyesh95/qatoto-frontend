import type { Metadata } from "next";

import SellerQuestionsPage from "@/components/studio/commerce/questions/seller-questions-page";

// Permanently dynamic: session-scoped and behind a seller organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Questions about your listings",
  description: "Questions buyers asked about the products you sell on Qatoto",
};

export default function SellerQuestionsRoute() {
  return (
    <div className="p-6">
      <SellerQuestionsPage />
    </div>
  );
}
