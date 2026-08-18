import type { Metadata } from "next";

import SettingsPreference from "@/components/home/account/pages/settings-preference";

// Permanently dynamic: the preference is read from `localStorage` after hydration, so the
// server render is always the default. No session is read — see the note on the index route
// for why this tree is not sign-in gated.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "AI assist mode · Settings",
  description: "Turn AI assist mode on or off in this browser",
};

export default function SettingsAiAssistModeRoute() {
  return <SettingsPreference preference="ai-assist-mode" />;
}
