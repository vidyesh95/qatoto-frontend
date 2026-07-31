// TRANSPORT: server-fetch — an async server component. Reads GET /admin/whoami with the
// caller's cookie forwarded by `callerRequestOptions()`.
import type { ReactNode } from "react";

import AdminAccessDenied from "@/components/admin/admin-access-denied";
import { getOwnStaffContext } from "@/lib/rnd/platform-roles.api";
import { callerRequestOptions } from "@/lib/server-http";

/**
 * The console door.
 *
 * A SEPARATE COMPONENT SO THE DYNAMIC READ IS CONTAINED. Reading `cookies()` in the layout
 * itself makes every route in the group dynamic, and under `cacheComponents` a prerendered
 * sibling with no Suspense boundary above it fails the build outright — which is exactly what
 * `/admin/audit` did. Keeping the read here lets the layout wrap only this in `<Suspense>`.
 *
 * IT ASKS THE BACKEND ON EVERY REQUEST, so a revoked role closes the console on the next
 * navigation with no re-login. `platformRole` is deliberately absent from the session for
 * that reason: a cached staff flag goes stale in the direction that keeps a revoked moderator
 * working.
 *
 * IT GATES ON HOLDING ANY ROLE, not on a capability. `moderator` and `auditor` hold disjoint
 * powers and each page enforces the one it needs; the door only decides whether this person
 * is staff at all.
 *
 * NOT A SECURITY BOUNDARY, and it must not be mistaken for one. Every staff action is refused
 * independently by the backend. This stops the console advertising itself to people who
 * cannot use it.
 */
export default async function AdminStaffGate({ children }: { children: ReactNode }) {
  const staffContextResult = await getOwnStaffContext(await callerRequestOptions());
  const isViewerStaff = staffContextResult.success && staffContextResult.data.platformRole !== null;

  return isViewerStaff ? children : <AdminAccessDenied />;
}
