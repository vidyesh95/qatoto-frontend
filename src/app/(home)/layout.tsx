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
      <div>
        <Navbar />
        <div className="flex">
          <Sidebar />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
