"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/state/sidebar-context";

// Desktop-only sidebar for the staff console. Mirrors the (home) Sidebar's
// expanded/collapsed shells so switching surfaces feels identical, scoped to
// the three built admin surfaces (users, catalog, reports, store, settings
// stay in Drizzle Studio per ADMIN_STRUCTURE.md §0).
const ADMIN_NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    activeIcon: "/icons/dashboard_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/dashboard_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    href: "/admin/review",
    label: "Review",
    activeIcon: "/icons/reviews_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/reviews_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    activeIcon: "/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
] as const;

// /admin is the index — match it exactly so it doesn't stay highlighted on
// /admin/review and /admin/audit; the others stay active for sub-paths.
function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-20 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
        <nav className="px-3 pt-11 pb-14">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAVIGATION_ITEMS.map((item) => {
              const isActive = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="group flex flex-col items-center justify-center py-2 text-xs transition-colors"
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                      isActive ? "bg-primary" : "group-hover:bg-muted/50"
                    }`}
                  >
                    <Image
                      src={isActive ? item.activeIcon : item.inactiveIcon}
                      width={24}
                      height={24}
                      alt=""
                    />
                  </span>
                  <span className={`mt-1 text-xs text-foreground ${isActive ? "font-medium" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-80 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
      <nav className="px-4 py-6">
        <ul className="flex flex-col">
          {ADMIN_NAVIGATION_ITEMS.map((item) => {
            const isActive = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="shrink-0">
                  <Image
                    src={isActive ? item.activeIcon : item.inactiveIcon}
                    width={24}
                    height={24}
                    alt=""
                  />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
