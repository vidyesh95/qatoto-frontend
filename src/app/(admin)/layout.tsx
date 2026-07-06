import React from "react";
import AdminNavbar from "@/components/admin/admin-navbar";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminMobileBottomNav from "@/components/admin/admin-mobile-bottom-nav";
import AdminAccessDenied from "@/components/admin/admin-access-denied";
import { hasStaffAccess, MOCK_CURRENT_STAFF_MEMBER } from "@/lib/admin-staff";
import { AdminAuditLogProvider } from "@/state/admin-audit-log-context";
import { StudioVideosProvider } from "@/state/studio-videos-context";
import { SidebarProvider } from "@/state/sidebar-context";

interface Props {
  children: React.ReactNode;
}

// Standalone chrome for the staff admin console — deliberately outside the
// (home) and (studio) shells. Mounts its own StudioVideosProvider instance,
// so state resets when crossing route groups; acceptable in the mock phase
// (the seeded store keeps every review tab populated). The role gate below is
// display-only UX — the real gate is server-side, added with real auth.
const AdminLayout = ({ children }: Props) => {
  const isCurrentStaffMemberAllowed = hasStaffAccess(MOCK_CURRENT_STAFF_MEMBER.role);

  return (
    <StudioVideosProvider>
      <AdminAuditLogProvider>
        <SidebarProvider>
          <AdminNavbar />
          <div className="flex">
            <AdminSidebar />
            <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
              <div className="mx-auto w-full max-w-6xl p-6">
                {isCurrentStaffMemberAllowed ? children : <AdminAccessDenied />}
              </div>
            </main>
          </div>
          <AdminMobileBottomNav />
        </SidebarProvider>
      </AdminAuditLogProvider>
    </StudioVideosProvider>
  );
};

export default AdminLayout;
