import type { Metadata } from "next";

import AccountRouteGuard from "@/components/home/account/pages/account-route-guard";
import YourAccountPanel from "@/components/home/account/pages/your-account-panel";
import { hasCallerSession } from "@/lib/server-http";

// Permanently dynamic: session-scoped. Every panel behind this route reads the signed-in
// user, so it never reaches a server render and there is no Cache Components refactor to do —
// the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Full name · Your account",
  description: "Set the name shown on your Qatoto account",
};

export default async function YourAccountFullNameRoute() {
  const isViewerSignedIn = await hasCallerSession();
  return (
    <AccountRouteGuard isViewerSignedIn={isViewerSignedIn}>
      <YourAccountPanel panel="full-name" />
    </AccountRouteGuard>
  );
}
