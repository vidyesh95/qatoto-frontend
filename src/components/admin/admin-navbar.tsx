"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useSidebar } from "@/state/sidebar-context";

// Top bar for the staff console. Mirrors the (home) Navbar shell — same
// sticky wrapper, padding, brand type scale, sidebar toggle, and the
// notifications + account cluster at the end — so switching between
// surfaces causes no layout shift. Navigation lives in AdminSidebar
// (desktop) and AdminMobileBottomNav (mobile).
export default function AdminNavbar({ accountSlot }: { accountSlot: ReactNode }) {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5 lg:gap-4.5">
          <button
            type={"button"}
            aria-label="Toggle sidebar"
            className={"hidden cursor-pointer p-2 text-primary-foreground md:block"}
            onClick={toggleSidebar}
          >
            <Image
              src={"/icons/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"toggle sidebar"}
              width={24}
              height={24}
            />
          </button>
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

        <div className="flex items-center gap-x-2 text-black">{accountSlot}</div>
      </div>
    </nav>
  );
}
