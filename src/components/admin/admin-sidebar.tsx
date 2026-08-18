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
    href: "/admin/categories",
    label: "Categories",
    activeIcon: "/icons/category_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // A DIFFERENT TAXONOMY FROM "Categories" ABOVE, which is R&D's `research_category` and
    // `research_paper_category` under `moderate_taxonomy`. This one is the store's browse
    // tree under `moderate_commerce` — separate tables, separate capability, separate job.
    //
    // Desktop only, same tradeoff as Promotions below: the mobile bar would go from six tabs
    // to seven, and arranging a category grid means picking image files.
    href: "/admin/store-categories",
    label: "Store categories",
    // `local_mall`, not `storefront`: only a teal FILL0 storefront is committed, and the nav
    // needs a black FILL0/FILL1 pair like every other item here.
    activeIcon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // COMMUNITY, NOT COMMERCE (§1.1). Forum threads, their replies, community reports and
    // cofounder profiles are one shift under `moderate_content` — the same moderator works
    // the off-topic thread, the report that named it and the profile that arrived after.
    // Separate from "Store categories" above, which is `moderate_commerce`: §17.4 refuses to
    // merge the two queues because a counterfeit-listing shift and an off-topic-thread shift
    // are not the same job, and merging creates the coupling capabilities exist to prevent.
    //
    // Desktop only, same tradeoff as Store categories and Promotions.
    href: "/admin/community",
    label: "Community",
    activeIcon: "/icons/forum_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // The record behind a factory's `site_audited` state, under `moderate_commerce`. It is a
    // commerce fact about a seller, which is why it does not sit under Community above.
    //
    // `fact_check`, not `verified`: only a teal FILL1 verified icon is committed, and the nav
    // needs a black FILL0/FILL1 pair like every other item here.
    href: "/admin/site-audits",
    label: "Site audits",
    activeIcon: "/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // Desktop only, deliberately not added to admin-mobile-bottom-nav: that bar would go
    // from six tabs to seven, and managing a carousel means picking image files.
    href: "/admin/promotions",
    label: "Promotions",
    activeIcon: "/icons/slideshow_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/slideshow_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // Desktop only, same tradeoff as Promotions — video search + three slots is a desk job.
    href: "/admin/spotlight",
    label: "Spotlight",
    activeIcon: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    // ADMIN ONLY, and the page says so rather than this list: `view_platform_metrics` is held by
    // `admin` alone, but the sidebar is rendered for every staff role and has no capability read of
    // its own. Hiding the row for a moderator would mean fetching `/admin/whoami` from the chrome
    // on every admin page load to hide one link.
    //
    // Desktop only, same tradeoff as Promotions and Spotlight — the mobile bar would go from six
    // tabs to seven, and a dashboard of charts is a desk job.
    href: "/admin/metrics",
    label: "Metrics",
    activeIcon: "/icons/analytics_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    activeIcon: "/icons/group_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
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
