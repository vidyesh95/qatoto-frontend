"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSidebar } from "@/state/sidebar-context";
import AccountMenu from "@/components/home/account-menu";
import LanguageMenu from "@/components/home/language-menu";

export default function Navbar() {
  const { toggleSidebar } = useSidebar();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem("qatoto_authenticated") === "1");
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 md:justify-between">
        {/* Brand */}
        <div className={"flex items-center gap-2.5"}>
          <button
            type={"button"}
            aria-label="Toggle sidebar"
            className={"hidden md:block p-2 text-primary-foreground cursor-pointer"}
            onClick={toggleSidebar}
          >
            <Image
              src={"/icons/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"toggle sidebar"}
              width={24}
              height={24}
            />
          </button>
          <Link href="/" className="text-3xl font-serif font-medium text-[#00696E]">
            Qatoto
          </Link>
        </div>

        <div className={"hidden md:flex w-xl items-center gap-2 justify-end"}>
          <form
            action="/search"
            method="get"
            className={"group relative flex items-center rounded-full"}
          >
            <input
              type="search"
              id="search-query"
              name="query"
              placeholder="Search"
              className={
                "w-101 focus:w-107 py-1.75 rounded-l-full pl-4 focus:pl-10 bg-white border border-primary"
              }
            />
            <Image
              src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
              className={"hidden group-focus-within:block absolute left-2 top-2"}
            />
            <button
              type="submit"
              aria-label="Search"
              className={"bg-primary rounded-r-full py-2 pl-2 pr-4 cursor-pointer"}
            >
              <Image
                src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                alt={"Search"}
                width={24}
                height={24}
              />
            </button>
          </form>
          <button
            type={"button"}
            aria-label="Search by voice"
            className={"bg-primary p-2 rounded-full cursor-pointer"}
          >
            <Image
              src={"/icons/mic_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Voice input"}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className="flex items-center gap-x-2 text-black">
          <Link
            href={"/search"}
            aria-label="Search"
            className={
              "md:hidden border border-primary bg-white rounded-full p-1.75 cursor-pointer"
            }
          >
            <Image
              src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Search"}
              width={24}
              height={24}
            />
          </Link>
          <button
            type={"button"}
            aria-label="Notifications"
            className={"border border-primary bg-white rounded-full p-1.75 cursor-pointer"}
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
              type={"button"}
              aria-label="Change language"
              aria-haspopup="menu"
              onClick={() => setIsLanguageMenuOpen((v) => !v)}
              className={"border border-primary bg-white rounded-full p-1.75 cursor-pointer"}
            >
              <Image
                src={"/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                alt={"Change language"}
                width={24}
                height={24}
              />
            </button>
            {isLanguageMenuOpen && <LanguageMenu onClose={() => setIsLanguageMenuOpen(false)} />}
          </div>
          <button
            type={"button"}
            aria-label="Cart"
            className={"border border-primary bg-white rounded-full p-1.75 cursor-pointer"}
          >
            <Image
              src={"/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Cart"}
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
                onClick={() => setIsAccountMenuOpen((v) => !v)}
                className="size-10 flex items-center justify-center border border-primary rounded-full overflow-hidden cursor-pointer"
              >
                <Image
                  src={"/dummy/profile_photo_girl.avif"}
                  alt={"Account"}
                  width={39}
                  height={39}
                  className="rounded-full"
                />
              </button>
              {isAccountMenuOpen && <AccountMenu onClose={() => setIsAccountMenuOpen(false)} />}
            </div>
          ) : (
            <Link
              href={"/sign-in"}
              className="flex gap-2 text-[#1DBDC5] bg-white border border-primary rounded-full px-2 py-1.75"
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
