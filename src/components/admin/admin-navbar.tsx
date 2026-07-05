"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MOCK_CURRENT_STAFF_MEMBER } from "@/lib/admin-staff";

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

// Top bar for the staff console. Mirrors the (home) Navbar shell — same
// sticky wrapper, padding, and brand type scale — so switching between
// surfaces causes no layout shift. Only the built surfaces get links (users,
// catalog, reports, store, settings stay in Drizzle Studio per
// ADMIN_STRUCTURE.md §0), so no dead nav entries.
export default function AdminNavbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5 lg:gap-4.5">
          {/* Invisible sidebar toggle — the admin surface has no sidebar, but
              keeping the button's box reserves the same horizontal space the
              (home) Navbar's toggle occupies, so the brand aligns identically
              and there is no layout shift switching surfaces. */}
          <span aria-hidden className="hidden p-2 md:invisible md:block">
            <Image
              src="/icons/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </span>
          <div className="flex min-w-0 items-baseline gap-2">
            <Link href="/" className="shrink-0 font-serif text-3xl font-medium text-[#00696E]">
              Qatoto
            </Link>
            <span className="shrink-0 font-serif text-2xl text-[#00696E]/40">|</span>
            <Link
              href="/admin"
              className="shrink-0 text-xl font-medium text-foreground hover:underline"
            >
              Admin
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <div className="hidden items-center gap-1 md:flex">
            {ADMIN_NAV_LINKS.map((navLink) => {
              // /admin is the index — match it exactly so it doesn't stay
              // highlighted on /admin/review and /admin/audit.
              const isActive =
                navLink.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(navLink.href);

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

          <div className="ml-2 flex items-center gap-2">
            <span className="hidden text-sm text-foreground sm:inline">
              {MOCK_CURRENT_STAFF_MEMBER.fullName}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground capitalize">
              {MOCK_CURRENT_STAFF_MEMBER.role}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
