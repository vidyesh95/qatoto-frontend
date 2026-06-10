"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "@/state/sidebar-context";
import AccountMenu from "@/components/home/account-menu";

export default function Navbar() {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const ANIME_SUBPAGES: Record<string, string> = {
    "/anime/genre": "Genre",
    "/anime/daily": "Daily",
    "/anime/favorite": "Favorite",
    "/anime/ranking": "Ranking",
  };
  const animeSubPage = ANIME_SUBPAGES[pathname];
  const isGenre = Boolean(animeSubPage);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem("qatoto_authenticated") === "1");
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 md:justify-between lg:px-6">
        {/* Brand */}
        <div className={"flex items-center gap-2.5 lg:gap-4.5"}>
          {isGenre && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid size-9 place-items-center rounded-full transition hover:bg-black/5 md:hidden"
            >
              <Image
                src={"/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                width={24}
                height={24}
                alt=""
              />
            </button>
          )}
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
          {isGenre ? (
            <>
              {/* mobile: page title */}
              <h1 className="text-xl font-medium text-foreground md:hidden">{animeSubPage}</h1>
              {/* desktop: breadcrumb */}
              <div className="hidden items-baseline gap-2 md:flex">
                <Link href="/" className="font-serif text-3xl font-medium text-[#00696E]">
                  Qatoto
                </Link>
                <span className="font-serif text-2xl text-[#00696E]/40">|</span>
                <Link href="/anime" className="text-xl font-medium text-foreground hover:underline">
                  Anime
                </Link>
                <span className="text-muted-foreground">›</span>
                <span className="text-xl font-medium text-foreground">{animeSubPage}</span>
              </div>
            </>
          ) : (
            <Link href="/" className="font-serif text-3xl font-medium text-[#00696E]">
              Qatoto
            </Link>
          )}
        </div>

        <div className={"hidden items-center justify-end gap-2 md:flex lg:w-xl"}>
          <form
            action="/search"
            method="get"
            className={"group relative flex items-center rounded-full"}
          >
            <input
              type="search"
              id="search-query"
              name="query"
              aria-label="Search"
              placeholder="Search"
              className={
                "w-64 rounded-l-full border border-primary bg-white py-1.75 pl-4 focus:w-72 focus:pl-10 lg:w-101 lg:focus:w-107"
              }
            />
            <Image
              src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
              className={"absolute top-2 left-2 hidden group-focus-within:block"}
            />
            <button
              type="submit"
              aria-label="Search"
              className={"cursor-pointer rounded-r-full bg-primary py-2 pr-4 pl-2"}
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
            className={"cursor-pointer rounded-full bg-primary p-2"}
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
              "cursor-pointer rounded-full border border-primary bg-white p-1.75 md:hidden"
            }
          >
            <Image
              src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Search"}
              width={24}
              height={24}
            />
          </Link>
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
              <button
                type={"button"}
                aria-label="Cart"
                className={"cursor-pointer rounded-full border border-primary bg-white p-1.75"}
              >
                <Image
                  src={"/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                  alt={"Cart"}
                  width={24}
                  height={24}
                />
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Account"
                  aria-haspopup="menu"
                  onClick={() => setIsAccountMenuOpen((v) => !v)}
                  className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-primary"
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
