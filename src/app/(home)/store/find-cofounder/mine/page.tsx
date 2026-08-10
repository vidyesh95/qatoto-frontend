import type { Metadata } from "next";

import OwnCofounderProfilePage from "@/components/home/store/cofounders/own-cofounder-profile-page";

// Permanently dynamic: the viewer's own profile is a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your cofounder profile",
  description: "The cofounder profile you wrote about yourself on Qatoto",
};

/**
 * NO `generateStaticParams` — this route has no dynamic segment.
 *
 * It sits beside `[profileSlug]`, and routing precedence within a directory puts a static segment
 * above `[param]`, so `mine` reaches this file and is never captured as a profile slug. The same
 * relationship `find-cofounder/new` already has.
 */
export default function OwnCofounderProfileRoute() {
  return <OwnCofounderProfilePage />;
}
