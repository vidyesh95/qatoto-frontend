"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/state/sidebar-context";

export default function Navbar() {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2.5 md:justify-between">
        {/* Brand */}
        <div className={"flex items-center gap-2.5"}>
          <button
            type={"button"}
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
            className={"group relative flex items-center border border-primary rounded-full"}
          >
            <input
              type="search"
              id="search-query"
              name="query"
              placeholder="Search"
              className={"w-[404px] focus:w-[428px] py-2 rounded-l-full pl-4 focus:pl-10 bg-white"}
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
              className={"bg-primary rounded-r-full py-2 pl-2 pr-4 cursor-pointer"}
            >
              <Image
                src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                alt={"translate"}
                width={24}
                height={24}
              />
            </button>
          </form>
          <button type={"button"} className={"bg-primary p-2 rounded-full cursor-pointer"}>
            <Image
              src={"/icons/mic_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-black">
          <button
            type={"button"}
            className={"border border-primary bg-white rounded-full p-1.75 cursor-pointer"}
          >
            <Image
              src={"/icons/notifications_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
            />
          </button>
          <button
            type={"button"}
            className={"border border-primary bg-white rounded-full p-1.75 cursor-pointer"}
          >
            <Image
              src={"/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
            />
          </button>
          <button
            type={"button"}
            className="flex gap-2 text-[#1DBDC5] bg-white border border-primary rounded-full px-2 py-1.75 cursor-pointer"
          >
            <Image
              src={"/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"translate"}
              width={24}
              height={24}
            />
            Sign in
          </button>
        </div>
      </div>
    </nav>
  );
}
