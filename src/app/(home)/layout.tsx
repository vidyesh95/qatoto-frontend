// NOT `"use client"`, DELIBERATELY. This composes providers and mounts client components, none of
// which needs it — and dropping it is what lets the layout construct the SERVER element below. A
// client layout cannot create one.
//
// IT ALSO STAYS SYNCHRONOUS. Awaiting `hasCallerSession()` here would read cookies above every route
// in the group and make all of them dynamic; `(admin)/layout.tsx` states the same rule about
// `AdminStaffGate`. The read lives inside `NavbarAccountSlot`, under its own `<Suspense>`.

import React, { Suspense } from "react";
import Navbar from "@/components/home/layout/navbar";
import NavbarAccountCluster from "@/components/home/layout/navbar-account-cluster";
import NavbarAccountSlot from "@/components/home/layout/navbar-account-slot";
import Sidebar from "@/components/home/layout/sidebar";
import SidebarSlot from "@/components/home/layout/sidebar-slot";
import MobileBottomNav from "@/components/home/layout/mobile-bottom-nav";
import QueryProvider from "@/components/providers/query-provider";
import { QueueProvider } from "@/state/queue-context";
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
      {/* Inside SidebarProvider only for reading order; the two are unrelated. A client
          provider here does NOT force `{children}` client — `app/layout.tsx` records that
          rule for `BrowserPreferencesProvider`, which wraps the whole app for the same
          reason. The queue holds no server state and never suspends. */}
      <SidebarProvider>
        <QueueProvider>
          <Navbar
            accountSlot={
              // The fallback is the SIGNED-OUT cluster, not a spinner or a blank. On a prerendered
              // route it is what ships in the static HTML, and for an anonymous visitor it is already
              // the right answer — so they never see a swap, and a signed-in visitor gets their avatar
              // streamed in rather than a hydration error.
              <Suspense fallback={<NavbarAccountCluster isViewerSignedIn={false} />}>
                <NavbarAccountSlot />
              </Suspense>
            }
          />
          <div className="flex">
            {/* Same shape and same reasoning as the navbar slot above: the fallback is the
              SIGNED-OUT sidebar, not a skeleton. On a prerendered route it is what ships in the
              static HTML and it is already right for an anonymous visitor, so nobody sees rows
              disappear — a signed-in visitor gets their own rows streamed in instead. */}
            <Suspense fallback={<Sidebar isViewerSignedIn={false} />}>
              <SidebarSlot />
            </Suspense>
            <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
          </div>
          <MobileBottomNav />
        </QueueProvider>
      </SidebarProvider>
    </QueryProvider>
  );
};

export default Layout;
