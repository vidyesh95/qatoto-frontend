"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Bottom tab bar shown only on mobile (md:hidden). Mirrors the (home)
// MobileBottomNav shell with the three admin surfaces. Active item gets a
// filled icon inside a teal pill, matching the collapsed-sidebar style.
const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    activeIcon: "/icons/dashboard_customize_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactiveIcon: "/icons/dashboard_customize_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
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

// /admin is the index — match it exactly; the others stay active for sub-paths.
function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around gap-2 bg-background px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = isRouteActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 pt-3 pb-4 text-xs tracking-[0.5px]"
          >
            <span
              className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-primary" : ""
              }`}
            >
              <Image
                src={isActive ? item.activeIcon : item.inactiveIcon}
                width={24}
                height={24}
                alt=""
              />
            </span>
            <span
              className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
