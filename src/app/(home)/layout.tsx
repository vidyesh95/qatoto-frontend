// NOT `"use client"`, DELIBERATELY. This composes providers and mounts client components, none of
// which needs it — and dropping it is what lets the layout construct the SERVER element below. A
// client layout cannot create one.
//
// IT ALSO STAYS SYNCHRONOUS. Awaiting `hasCallerSession()` here would read cookies above every route
// in the group and make all of them dynamic; `(admin)/layout.tsx` states the same rule about
// `AdminStaffGate`. The read lives inside `NavbarAccountSlot`, under its own `<Suspense>`.

import React, { Suspense } from "react";
import AlphaBanner from "@/components/home/layout/alpha-banner";
import Navbar from "@/components/home/layout/navbar";
import NavbarAccountCluster from "@/components/home/layout/navbar-account-cluster";
import NavbarAccountSlot from "@/components/home/layout/navbar-account-slot";
import Sidebar from "@/components/home/layout/sidebar";
import SidebarSlot from "@/components/home/layout/sidebar-slot";
import MainScrollReset, {
  HOME_SCROLL_CONTAINER_ID,
} from "@/components/home/layout/main-scroll-reset";
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
        {/* ⚠️ **THE SHELL IS A FIXED-HEIGHT FLEX COLUMN, AND `<main>` IS THE SCROLL CONTAINER.**
            It used to be ordinary document flow, which meant every full-height thing in the group
            had to compute what was above it. That arithmetic cannot be made correct: the navbar is
            56px, but `AlphaBanner` is 36px at 1440 and 56px at phone width because its copy wraps,
            and the component requires it to wrap rather than truncate. So `h-[calc(100dvh-56px)]`
            on the sidebar left the page scrolling by exactly the banner's height — measured
            `scrollHeight` 767 against a 731 viewport — and any constant chosen for a non-scrolling
            page would have been wrong at some width.

            Sized by the browser instead of by us: the navbar and the banner take their natural
            heights, and the row below takes what is left. Nothing in the group needs to know the
            chrome height any more, and a route that wants the viewport asks for `h-full`.

            `min-h-0` on that row is the load-bearing half. A flex child's default `min-height:auto`
            refuses to shrink below its content, so without it a long page pushes the row taller
            than the column and the whole thing scrolls again — the exact bug being removed. */}
        <QueueProvider>
          <div className="flex h-dvh flex-col">
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
            {/* Between the navbar and the content row, NOT inside it — inside, it would become a
              third flex column beside the sidebar and `<main>`. It sits ABOVE the scroll container
              rather than inside it, which is what keeps it on screen without `sticky` and without
              any offset in the group changing; the reasoning is in the component. */}
            <AlphaBanner />
            <div className="flex min-h-0 flex-1">
              {/* Same shape and same reasoning as the navbar slot above: the fallback is the
              SIGNED-OUT sidebar, not a skeleton. On a prerendered route it is what ships in the
              static HTML and it is already right for an anonymous visitor, so nobody sees rows
              disappear — a signed-in visitor gets their own rows streamed in instead. */}
              <Suspense fallback={<Sidebar isViewerSignedIn={false} />}>
                <SidebarSlot />
              </Suspense>
              {/* The padding still reserves the mobile bottom nav's 80px, and it still works for a
                full-height route: `box-sizing: border-box` is global, so an `h-full` child resolves
                against this element's CONTENT box and the reservation is already subtracted. That
                is why the map page needs no breakpoint-specific height. */}
              <main
                id={HOME_SCROLL_CONTAINER_ID}
                className="min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
              >
                {children}
              </main>
            </div>
          </div>
          <MainScrollReset />
          <MobileBottomNav />
        </QueueProvider>
      </SidebarProvider>
    </QueryProvider>
  );
};

export default Layout;
