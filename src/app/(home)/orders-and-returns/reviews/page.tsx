import type { Metadata } from "next";

import ReviewableCompletionsPage from "@/components/home/store/sections/reviewable-completions-page";

// Permanently dynamic: session-scoped and behind a buyer organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Reviews you can leave",
  description: "Review the orders and engagements you have completed on Qatoto",
};

export default function ReviewableCompletionsRoute() {
  return (
    <div className="p-4 lg:p-6">
      <ReviewableCompletionsPage />
    </div>
  );
}
