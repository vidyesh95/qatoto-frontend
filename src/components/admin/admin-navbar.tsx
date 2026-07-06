"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSidebar } from "@/state/sidebar-context";
import { useSession } from "@/lib/auth-client";
import AccountMenu from "@/components/home/account/menus/account-menu";

// Top bar for the staff console. Mirrors the (home) Navbar shell — same
// sticky wrapper, padding, brand type scale, sidebar toggle, and the
// notifications + account cluster at the end — so switching between
// surfaces causes no layout shift. Navigation lives in AdminSidebar
// (desktop) and AdminMobileBottomNav (mobile).
export default function AdminNavbar() {
  const { toggleSidebar } = useSidebar();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

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

        <div className="flex items-center gap-x-2 text-black">
          {isAuthenticated ? (
            <>
              <button
                type={"button"}
                aria-label="Notifications"
                className={"cursor-pointer rounded-full border border-primary bg-white p-1.75"}
              >
                <Image
                  src={"/icons/notifications_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                  alt={"Notifications"}
                  width={24}
                  height={24}
                />
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Account"
                  aria-haspopup="menu"
                  onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                  className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-primary"
                >
                  <Image
                    src={session?.user.image ?? "/dummy/profile_photo_girl.avif"}
                    alt={"Account"}
                    width={39}
                    height={39}
                    className="rounded-full"
                  />
                </button>
                {isAccountMenuOpen && <AccountMenu onClose={() => setIsAccountMenuOpen(false)} />}
              </div>
            </>
          ) : (
            <Link
              href={"/sign-in"}
              className="flex gap-2 rounded-full border border-primary bg-white px-2 py-1.75 text-[#1DBDC5]"
            >
              <Image
                src={"/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                alt={"Signin"}
                width={24}
                height={24}
              />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
