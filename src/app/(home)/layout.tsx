"use client";

import React from "react";
import Navbar from "@/components/home/navbar";
import Sidebar from "@/components/home/sidebar";
import MobileBottomNav from "@/components/home/mobile-bottom-nav";
import { SidebarProvider } from "@/state/sidebar-context";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default Layout;
