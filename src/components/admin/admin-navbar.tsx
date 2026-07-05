"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOCK_CURRENT_STAFF_MEMBER } from "@/lib/admin-staff";

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

// Top bar for the staff console. Only the built surfaces get links — users,
// catalog, reports, store, and settings stay in Drizzle Studio per
// ADMIN_STRUCTURE.md §0, so no dead nav entries for them.
export default function AdminNavbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link href="/admin" className="font-serif text-lg font-semibold text-[#00696E]">
          Qatoto Admin
        </Link>

        <div className="flex items-center gap-1">
          {ADMIN_NAV_LINKS.map((navLink) => {
            // /admin is the index — match it exactly so it doesn't stay
            // highlighted on /admin/review and /admin/audit.
            const isActive =
              navLink.href === "/admin" ? pathname === "/admin" : pathname.startsWith(navLink.href);

            return (
              <Link
                key={navLink.href}
                href={navLink.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {navLink.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-foreground">{MOCK_CURRENT_STAFF_MEMBER.fullName}</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground capitalize">
            {MOCK_CURRENT_STAFF_MEMBER.role}
          </span>
        </div>
      </div>
    </nav>
  );
}
