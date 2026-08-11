// TRANSPORT: server-fetch — reads the auth cookie so the admin bar's first paint is the viewer's own.
//
// Contained in a wrapper rather than awaited in `(admin)/layout.tsx`, which already states the rule
// itself for `AdminStaffGate`: "THE GATE IS A CHILD, NOT THIS COMPONENT" — a cookie read in the layout
// makes every route in the group dynamic. This is the same containment, applied to the chrome.

import AdminNavbarAccountCluster from "@/components/admin/admin-navbar-account-cluster";
import { hasCallerSession } from "@/lib/server-http";

export default async function AdminNavbarAccountSlot() {
  return <AdminNavbarAccountCluster isViewerSignedIn={await hasCallerSession()} />;
}
