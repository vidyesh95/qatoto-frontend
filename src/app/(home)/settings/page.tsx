import type { Metadata } from "next";

import SettingsIndex from "@/components/home/account/pages/settings-index";

// Permanently dynamic: the preferences are read from `localStorage` after hydration, so the
// server render is always the defaults. Nothing here reads a cookie, so there is no session to
// gate on either — a signed-out visitor may pick a theme.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Settings",
  description: "Appearance, language, browse location and modes for this browser",
};

/**
 * WAS AN `<h1>` STUB. The six preference panels behind it existed and were controlled components
 * already — what did not exist was anywhere to keep the value they were controlling.
 *
 * NO SIGN-IN GATE, DELIBERATELY, and it is the one route in this pair without one. These six are
 * device preferences with no server counterpart; requiring an account to choose a dark theme would
 * be a gate that protects nothing. `/your-account` is gated because every panel on it writes to a
 * session.
 */
export default function SettingsRoute() {
  return <SettingsIndex />;
}
