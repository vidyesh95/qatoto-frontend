"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/state/sidebar-context";

// Desktop-only sidebar for the staff console. Mirrors the (home) Sidebar's
// expanded/collapsed shells — same wrapper, paddings, pill styles, and the
// emphasized Create entry in its own section — so switching surfaces feels
// identical. Scoped to Create plus the three built admin surfaces (users,
// catalog, reports, store, settings stay in Drizzle Studio per
// ADMIN_STRUCTURE.md §0).
type AdminNavItem = {
  href: string;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
  isEmphasized?: boolean;
};

const CREATE_ITEM: AdminNavItem = {
  href: "/studio",
  label: "Create",
  activeIcon: "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
  inactiveIcon: "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  isEmphasized: true,
};

const ADMIN_NAVIGATION_ITEMS: AdminNavItem[] = [
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
];

// Same pill styles as the (home) Sidebar's navigation items.
const BASE_ITEM_STYLE = "flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors";
const DEFAULT_ITEM_STYLE = "text-foreground hover:bg-muted/50 hover:text-foreground";
const ACTIVE_ITEM_STYLE = "bg-primary text-primary-foreground";
const EMPHASIZED_ITEM_STYLE = "rounded-xl bg-secondary text-secondary-foreground font-medium";
const EMPHASIZED_ACTIVE_ITEM_STYLE = "rounded-full bg-primary text-primary-foreground font-medium";

// /admin is the index — match it exactly so it doesn't stay highlighted on
// /admin/review and /admin/audit; the others stay active for sub-paths.
function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminSidebarIcon({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  return (
    <Image
      src={isActive ? item.activeIcon : item.inactiveIcon}
      width={24}
      height={24}
      alt={item.label}
    />
  );
}

function AdminSidebarNavigationItem({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  const stateStyle = item.isEmphasized
    ? isActive
      ? EMPHASIZED_ACTIVE_ITEM_STYLE
      : EMPHASIZED_ITEM_STYLE
    : isActive
      ? ACTIVE_ITEM_STYLE
      : DEFAULT_ITEM_STYLE;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`${BASE_ITEM_STYLE} ${stateStyle}`}
    >
      <span className="shrink-0 text-foreground">
        <AdminSidebarIcon item={item} isActive={isActive} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function AdminCollapsedNavItem({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  // Create button - emphasized style with light blue rounded square
  if (item.isEmphasized) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "bg-secondary"
        }`}
      >
        <span className="shrink-0">
          <AdminSidebarIcon item={item} isActive={isActive} />
        </span>
      </Link>
    );
  }

  // Regular nav items - icon with the label below (Material 3 style)
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className="group flex flex-col items-center justify-center py-2 text-xs transition-colors"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
          isActive ? "bg-primary" : "group-hover:bg-muted/50"
        }`}
      >
        <span className="shrink-0">
          <AdminSidebarIcon item={item} isActive={isActive} />
        </span>
      </span>
      <span className={`mt-1 text-xs text-foreground ${isActive ? "font-medium" : ""}`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-20 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
        <nav className="space-y-5 px-3 pt-11 pb-14">
          <AdminCollapsedNavItem
            item={CREATE_ITEM}
            isActive={isRouteActive(pathname, CREATE_ITEM.href)}
          />

          <ul className="flex flex-col gap-1">
            {ADMIN_NAVIGATION_ITEMS.map((item) => (
              <AdminCollapsedNavItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-80 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
      <div className="px-4 py-6">
        <section className="mt-6">
          <div className="flex flex-col gap-2">
            <AdminSidebarNavigationItem
              item={CREATE_ITEM}
              isActive={isRouteActive(pathname, CREATE_ITEM.href)}
            />
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-2">
            {ADMIN_NAVIGATION_ITEMS.map((item) => (
              <AdminSidebarNavigationItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </div>
          <hr className="my-5 border-border" />
        </section>
      </div>
    </aside>
  );
}
