import type { Metadata } from "next";
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

/**
 * NOINDEX FOR THE WHOLE GROUP, in one place rather than 32 page files.
 *
 * Next merges metadata down the segment chain per-field, so every page under this layout
 * inherits `robots` unless it declares its own — which the 11 pages that already set it do.
 *
 * These are one creator's private workspace: videos, orders, earnings, analytics. A crawler
 * reaching one gets the studio chrome and no content, and that is exactly what Google files as
 * a thin or soft-404 result.
 *
 * THE META TAG AND THE `Disallow` ARE NOT INTERCHANGEABLE. This says "do not list it";
 * `src/app/robots.ts` says "do not spend crawl budget here". A `Disallow` alone would be worse
 * than nothing — it stops the crawl, so the noindex is never read, and any URL already in the
 * index stays listed without a snippet.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
