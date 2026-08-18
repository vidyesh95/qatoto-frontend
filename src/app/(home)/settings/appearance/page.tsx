import type { Metadata } from "next";

import SettingsPreference from "@/components/home/account/pages/settings-preference";

// Permanently dynamic: the preference is read from `localStorage` after hydration, so the
// server render is always the default. No session is read — see the note on the index route
// for why this tree is not sign-in gated.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Appearance · Settings",
  description: "Choose the light or dark theme for this browser",
};

export default function SettingsAppearanceRoute() {
  return <SettingsPreference preference="appearance" />;
}
