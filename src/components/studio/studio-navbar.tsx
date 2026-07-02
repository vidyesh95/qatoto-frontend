"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSidebar } from "@/state/sidebar-context";
import { useSession } from "@/lib/auth-client";
import AccountMenu from "@/components/home/account/menus/account-menu";

// Top bar for the Creator Studio hub. Mirrors the main Navbar's layout but
// swaps the brand for the "Qatoto | Creator Studio" wordmark and replaces the
// cart with a language (translate) control. Presentational only.
export default function StudioNavbar() {
  const { toggleSidebar } = useSidebar();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 lg:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2.5 lg:gap-4.5">
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="hidden cursor-pointer p-2 text-primary-foreground md:block"
            onClick={toggleSidebar}
          >
            <Image
              src="/icons/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="toggle sidebar"
              width={24}
              height={24}
            />
          </button>
          <div className="flex min-w-0 items-baseline gap-2">
            <Link href="/" className="shrink-0 font-serif text-3xl font-medium text-[#00696E]">
              Qatoto
            </Link>
            <span className="shrink-0 font-serif text-2xl text-[#00696E]/40">|</span>
            <span className="truncate text-xl font-medium text-foreground">Creator Studio</span>
          </div>
        </div>

        {/* Search + voice */}
        <div className="hidden items-center justify-end gap-2 xl:absolute xl:left-1/2 xl:flex xl:w-xl xl:-translate-x-1/2">
          <form
            action="/search"
            method="get"
            className="group relative flex items-center rounded-full"
          >
            <input
              type="search"
              id="studio-search-query"
              name="query"
              aria-label="Search"
              placeholder="Search"
              className="w-64 rounded-l-full border border-primary bg-white py-1.75 pl-4 focus:w-72 focus:pl-10 lg:w-101 lg:focus:w-107"
            />
            <Image
              src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
              className="absolute top-2 left-2 hidden group-focus-within:block"
            />
            <button
              type="submit"
              aria-label="Search"
              className="cursor-pointer rounded-r-full bg-primary py-2 pr-4 pl-2"
            >
              <Image
                src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Search"
                width={24}
                height={24}
              />
            </button>
          </form>
          <button
            type="button"
            aria-label="Search by voice"
            className="cursor-pointer rounded-full bg-primary p-2"
          >
            <Image
              src="/icons/mic_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Voice input"
              width={24}
              height={24}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-x-2 text-black">
          <Link
            href="/search"
            aria-label="Search"
            className="cursor-pointer rounded-full border border-primary bg-white p-1.75 xl:hidden"
          >
            <Image
              src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Search"
              width={24}
              height={24}
            />
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="cursor-pointer rounded-full border border-primary bg-white p-1.75"
          >
            <Image
              src="/icons/notifications_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Notifications"
              width={24}
              height={24}
            />
          </button>
          {isAuthenticated ? (
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
                  alt="Account"
                  width={39}
                  height={39}
                  className="rounded-full"
                />
              </button>
              {isAccountMenuOpen && <AccountMenu onClose={() => setIsAccountMenuOpen(false)} />}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="flex gap-2 rounded-full border border-primary bg-white px-2 py-1.75 text-[#1DBDC5]"
            >
              <Image
                src="/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Signin"
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
