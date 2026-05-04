"use client";

import React from "react";
import Navbar from "@/components/home/navbar";
import Sidebar from "@/components/home/sidebar";
import { SidebarProvider } from "@/state/sidebar-context";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <>
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </>
    </SidebarProvider>
  );
};

export default Layout;
