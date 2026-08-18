import type { Metadata } from "next";

import AccountRouteGuard from "@/components/home/account/pages/account-route-guard";
import YourAccountIndex from "@/components/home/account/pages/your-account-index";
import { hasCallerSession } from "@/lib/server-http";

// Permanently dynamic: session-scoped. Every panel behind this route reads the signed-in
// user, so it never reaches a server render and there is no Cache Components refactor to do —
// the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your account",
  description: "Your name, handle, sign-in methods and linked providers on Qatoto",
};

/**
 * WAS AN `<h1>` STUB, AND THE REASON WAS THAT THE FEATURE HAD NO HOST.
 *
 * All eight identity panels have been wired to the backend since the account dropdown was built —
 * `PATCH /users/me`, `/users/me/handle`, `/users/me/photo`, `GET /users/me/linked-accounts` and the
 * Better Auth passkey, phone and multi-session SDKs. They were reachable only inside a 360px
 * dropdown, which meant no link to any of them existed. `docs/REMAINING_WORK.md` §2 called this
 * route "a host, not a feature", and that is exactly what this file is.
 */
export default async function YourAccountRoute() {
  const isViewerSignedIn = await hasCallerSession();
  return (
    <AccountRouteGuard isViewerSignedIn={isViewerSignedIn}>
      <YourAccountIndex />
    </AccountRouteGuard>
  );
}
