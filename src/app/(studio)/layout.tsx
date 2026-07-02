import React from "react";
import StudioNavbar from "@/components/studio/studio-navbar";
import StudioSidebar from "@/components/studio/studio-sidebar";
import { SidebarProvider } from "@/state/sidebar-context";

interface Props {
  children: React.ReactNode;
}

// Standalone chrome for the Creator Studio hub — its own top bar and left nav,
// deliberately outside the (home) shell so it does not inherit the main
// Navbar/Sidebar.
const StudioLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <StudioNavbar />
      <div className="flex">
        <StudioSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default StudioLayout;
