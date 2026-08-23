"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import QueueButton from "@/components/home/layout/queue-button";
import { useSidebar } from "@/state/sidebar-context";

const ANIME_SUBPAGES: Record<string, string> = {
  "/anime/genre": "Genre",
  "/anime/daily": "Daily",
  "/anime/favorite": "Favorite",
  "/anime/ranking": "Ranking",
};

const RESEARCH_AND_DEVELOPMENT_SUBPAGES: Record<string, string> = {
  "/research-and-development/problem-map": "Problem Map",
  "/research-and-development/knowledge-hub": "Knowledge Hub",
  "/research-and-development/talent": "Talent",
  "/research-and-development/funding": "Funding",
  "/research-and-development/new": "Post an Idea",
  // The four pipeline stage routes. They need explicit entries because the
  // prettifySlug fallthrough would render "Build log" and "Go to market",
  // which are not the stage names.
  "/research-and-development/team-building": "Team Building",
  "/research-and-development/build-log": "Build & Daily Logs",
  "/research-and-development/governance": "Governance",
  "/research-and-development/go-to-market": "Go-to-Market",
  // §10 research programmes. The index and the wizard are STATIC paths and need entries;
  // an individual programme is `/programs/[programSlug]` and falls through to prettifySlug,
  // which renders its slug — the right answer, because the programme names itself.
  "/research-and-development/programs": "Research Programmes",
  "/research-and-development/programs/new": "Propose a Programme",
};

function prettifySlug(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type SubHeader = { title: string; parentHref: string; parentLabel: string };

// Sub-page header shown on mobile (back arrow + title) and desktop (breadcrumb).
// Anime and R&D use fixed title maps; store category/pathway and R&D project
// routes derive their title from the last URL segment.
function getSubHeader(pathname: string): SubHeader | null {
  const anime = ANIME_SUBPAGES[pathname];
  if (anime) return { title: anime, parentHref: "/anime", parentLabel: "Anime" };
  const researchAndDevelopment = RESEARCH_AND_DEVELOPMENT_SUBPAGES[pathname];
  if (researchAndDevelopment) {
    return {
      title: researchAndDevelopment,
      parentHref: "/research-and-development",
      parentLabel: "R&D",
    };
  }
  if (pathname.startsWith("/research-and-development/")) {
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return {
      title: prettifySlug(last),
      parentHref: "/research-and-development",
      parentLabel: "R&D",
    };
  }
  if (pathname.startsWith("/store/")) {
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return {
      title: prettifySlug(last),
      parentHref: "/store",
      parentLabel: "Store",
    };
  }
  return null;
}

export default function Navbar({
  accountSlot,
}: {
  /**
   * The per-viewer half of the bar, handed in by the layout as a `<Suspense>`-wrapped server
   * component. It arrives as a NODE rather than being rendered here because this component is
   * `"use client"` and cannot create a server element itself — and because the cookie read behind it
   * must stay inside its own boundary, or the whole route group goes dynamic.
   */
  accountSlot: ReactNode;
}) {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const sub = getSubHeader(pathname);

  return (
    <nav className="sticky top-0 z-50 bg-background">
      <div className="relative mx-auto flex items-center justify-between px-4 py-2 md:justify-between lg:px-6">
        {/* Brand */}
        <div className={"flex min-w-0 items-center gap-2.5 lg:gap-4.5"}>
          {sub && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-black/5 md:hidden"
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
          {sub ? (
            <>
              {/* mobile: page title */}
              <h1 className="truncate text-xl font-medium text-foreground md:hidden">
                {sub.title}
              </h1>
              {/* desktop: breadcrumb */}
              <div className="hidden min-w-0 items-baseline gap-2 md:flex">
                <Link href="/" className="shrink-0 font-serif text-3xl font-medium text-[#00696E]">
                  Qatoto
                </Link>
                <span className="shrink-0 font-serif text-2xl text-[#00696E]/40">|</span>
                <Link
                  href={sub.parentHref}
                  className="shrink-0 text-xl font-medium text-foreground hover:underline"
                >
                  {sub.parentLabel}
                </Link>
                <span className="shrink-0 text-muted-foreground">›</span>
                <span className="truncate text-xl font-medium text-foreground">{sub.title}</span>
              </div>
            </>
          ) : (
            <Link href="/" className="font-serif text-3xl font-medium text-[#00696E]">
              Qatoto
            </Link>
          )}
        </div>

        <div
          className={
            "hidden items-center justify-end gap-2 xl:absolute xl:left-1/2 xl:flex xl:w-xl xl:-translate-x-1/2"
          }
        >
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
              "cursor-pointer rounded-full border border-primary bg-white p-1.75 xl:hidden"
            }
          >
            <Image
              src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Search"}
              width={24}
              height={24}
            />
          </Link>
          {/* Renders nothing until something is queued — see the component's header. */}
          <QueueButton />
          {accountSlot}
        </div>
      </div>
    </nav>
  );
}
