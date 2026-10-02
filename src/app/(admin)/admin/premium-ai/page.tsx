import type { Metadata } from "next";

import PremiumAiPage from "@/components/admin/premium-ai/premium-ai-page";

// Permanently dynamic: one capability-gated list, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Premium AI · Admin",
  description: "Which accounts may ask the AI assistant through Google Gemini",
};

export default function AdminPremiumAiRoute() {
  return <PremiumAiPage />;
}
