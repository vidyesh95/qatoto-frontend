import React from "react";
import StudioNavbar from "@/components/studio/studio-navbar";
import StudioSidebar from "@/components/studio/studio-sidebar";

interface Props {
  children: React.ReactNode;
}

// Standalone chrome for the Creator Studio hub — its own top bar and left nav,
// deliberately outside the (home) shell so it does not inherit the main
// Navbar/Sidebar.
const StudioLayout = ({ children }: Props) => {
  return (
    <>
      <StudioNavbar />
      <div className="flex">
        <StudioSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
};

export default StudioLayout;
