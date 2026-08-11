import React, { Suspense } from "react";
import QueryProvider from "@/components/providers/query-provider";
import StudioNavbar from "@/components/studio/studio-navbar";
import StudioNavbarAccountCluster from "@/components/studio/studio-navbar-account-cluster";
import StudioNavbarAccountSlot from "@/components/studio/studio-navbar-account-slot";
import StudioSidebar from "@/components/studio/studio-sidebar";
import { SidebarProvider } from "@/state/sidebar-context";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface Props {
  children: React.ReactNode;
}

// Standalone chrome for the Creator Studio hub — its own top bar and left nav,
// deliberately outside the (home) shell so it does not inherit the main
// Navbar/Sidebar.
const StudioLayout = ({ children }: Props) => {
  return (
    <QueryProvider>
      <SidebarProvider>
        <StudioNavbar
          accountSlot={
            // Signed-out cluster as the fallback: it is what ships in the prerendered HTML and is
            // already correct for an anonymous viewer, so only a signed-in one sees it swap.
            <Suspense fallback={<StudioNavbarAccountCluster isViewerSignedIn={false} />}>
              <StudioNavbarAccountSlot />
            </Suspense>
          }
        />
        <div className="flex">
          <StudioSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
};

export default StudioLayout;
