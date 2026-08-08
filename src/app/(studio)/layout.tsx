import React from "react";
import QueryProvider from "@/components/providers/query-provider";
import StudioNavbar from "@/components/studio/studio-navbar";
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
        <StudioNavbar />
        <div className="flex">
          <StudioSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
};

export default StudioLayout;
