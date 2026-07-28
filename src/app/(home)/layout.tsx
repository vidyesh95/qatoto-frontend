"use client";

import React from "react";
import Navbar from "@/components/home/layout/navbar";
import Sidebar from "@/components/home/layout/sidebar";
import MobileBottomNav from "@/components/home/layout/mobile-bottom-nav";
import QueryProvider from "@/components/providers/query-provider";
import { SidebarProvider } from "@/state/sidebar-context";

interface Props {
  children: React.ReactNode;
}

// QueryProvider wraps the whole (home) group because the research-and-development
// surface reads member-scoped and paginated data through React Query client
// islands (see docs/R_AND_D_STRUCTURE.md §19). Without it those islands throw
// "No QueryClient set". Public reads stay server-side and never touch it.
const Layout = ({ children }: Props) => {
  return (
    <QueryProvider>
      <SidebarProvider>
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </SidebarProvider>
    </QueryProvider>
  );
};

export default Layout;
