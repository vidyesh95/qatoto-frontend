import type { Metadata } from "next";

import ProviderQuotesPage from "@/components/studio/commerce/quotes/provider-quotes-page";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your quotes",
  description: "Every quote your organization has authored on Qatoto",
};

export default function ProviderQuotesRoute() {
  return (
    <div className="p-6">
      <ProviderQuotesPage />
    </div>
  );
}
