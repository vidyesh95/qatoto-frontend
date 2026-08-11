import React, { Suspense } from "react";
import AdminNavbar from "@/components/admin/admin-navbar";
import AdminNavbarAccountCluster from "@/components/admin/admin-navbar-account-cluster";
import AdminNavbarAccountSlot from "@/components/admin/admin-navbar-account-slot";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminMobileBottomNav from "@/components/admin/admin-mobile-bottom-nav";
import AdminStaffGate from "@/components/admin/admin-staff-gate";
import QueryProvider from "@/components/providers/query-provider";
import { AdminAuditLogProvider } from "@/state/admin-audit-log-context";
import { SidebarProvider } from "@/state/sidebar-context";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface Props {
  children: React.ReactNode;
}

// Standalone chrome for the staff admin console — deliberately outside the
// (home) and (studio) shells. It no longer mounts a shared video store: the review
// queue reads `GET /videos/admin/review` through React Query, so crossing route
// groups costs a refetch rather than losing state.
//
// THE GATE IS A CHILD, NOT THIS COMPONENT. `AdminStaffGate` reads cookies, which makes its
// subtree dynamic; awaiting that here would make every route in the group dynamic and break
// the prerender of the ones with no Suspense boundary above them. The chrome therefore stays
// static and only the gated content suspends.
const AdminLayout = ({ children }: Props) => {
  return (
    // QueryProvider wraps the group because /admin/categories reads the two taxonomy
    // queues and the platform audit trail through React Query client islands. Without it
    // they throw "No QueryClient set" — a runtime failure no typecheck catches. The other
    // admin pages are still mock and never touch it.
    <QueryProvider>
      <AdminAuditLogProvider>
        <SidebarProvider>
          <AdminNavbar
            accountSlot={
              // Signed-out cluster as the fallback — correct as-is for an anonymous viewer, so only a
              // signed-in one sees it swap. Same containment as AdminStaffGate below.
              <Suspense fallback={<AdminNavbarAccountCluster isViewerSignedIn={false} />}>
                <AdminNavbarAccountSlot />
              </Suspense>
            }
          />
          <div className="flex">
            <AdminSidebar />
            <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
              <div className="mx-auto w-full max-w-6xl p-6">
                <Suspense
                  fallback={<p className="text-sm text-muted-foreground">Checking access…</p>}
                >
                  <AdminStaffGate>{children}</AdminStaffGate>
                </Suspense>
              </div>
            </main>
          </div>
          <AdminMobileBottomNav />
        </SidebarProvider>
      </AdminAuditLogProvider>
    </QueryProvider>
  );
};

export default AdminLayout;
