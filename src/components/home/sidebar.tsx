"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps, ReactNode } from "react";
import Image from "next/image";
const videoCallInactiveIcon = "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const videoCallActiveIcon = "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const homeInactiveIcon = "/icons/home_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const homeActiveIcon = "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const liveTvInactiveIcon = "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const liveTvActiveIcon = "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const localMallInactiveIcon = "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const localMallActiveIcon = "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const screenShareInactiveIcon = "/icons/screen_share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const screenShareActiveIcon = "/icons/screen_share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const selfImprovementIcon = "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const videoLibraryInactiveIcon = "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const videoLibraryActiveIcon = "/icons/video_library_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";

/* ---------- tiny utilities ---------- */
function joinClassNames(...classNameParts: Array<string | false | null | undefined>) {
  return classNameParts.filter(Boolean).join(" ");
}

/* ---------- minimalist icon set (no external deps) ---------- */
type IconSvgProps = ComponentProps<"svg">;

function IconVideoCall() {
  return <Image width={24} height={24} src={videoCallInactiveIcon} alt={"Create"} />;
}

function IconAddSquare(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconHome() {
  return <Image width={24} height={24} src={homeInactiveIcon} alt={"Home"} />;
}
function IconMonitorPlay() {
  return <Image width={24} height={24} src={liveTvInactiveIcon} alt={"Anime"} />;
}
function IconBag(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 8h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 8a3 3 0 016 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconCpu(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 10h2M3 14h2M19 10h2M19 14h2M10 3v2M14 3v2M10 19v2M14 19v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconFlask(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9 3h6M10 3v6L5.5 18A2.5 2.5 0 008 22h8a2.5 2.5 0 002.5-4L14 9V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconClockRotate(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 12a9 9 0 10-3.2 6.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconCart(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 6h2l2 12h10l2-8H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconTruckReturn(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 6h10v8H7l-4-4V6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 10h3l2 2v4h-5v-6z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="18" r="1.5" fill="currentColor" />
      <circle cx="18" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconBadgeDollar(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 10c0-1.1 1.2-2 3-2s3 .9 3 2-1 1.7-3 2-3 .9-3 2 1.2 2 3 2 3-.9 3-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconMegaphone(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 11l12-6v14L3 13v-2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14v4a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconUser(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconHeadset(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 13a8 8 0 0116 0v6a2 2 0 01-2 2h-2v-6h4M4 19h2a2 2 0 002-2v-4H4v6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconLogout(props: IconSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 21H6a2 2 0 01-2-2V5a2 2 0 012-2h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------- small building blocks ---------- */
type SidebarNavigationItemProps = {
  destinationPath: string;
  iconElement: ReactNode;
  linkText: string;
  isEmphasized?: boolean; // for the big blue "Create" button
  isActive?: boolean;
};

function SidebarNavigationItem({
  destinationPath,
  iconElement,
  linkText,
  isEmphasized,
  isActive,
}: SidebarNavigationItemProps) {
  const baseItemStyle = "flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors";
  const defaultItemStyle = "text-gray-800 hover:bg-gray-100";
  const activeItemStyle = "bg-primary text-gray-900";
  const emphasizedItemStyle = "rounded-xl bg-secondary text-gray-900 font-medium";

  return (
    <Link
      href={destinationPath}
      aria-current={isActive ? "page" : undefined}
      className={joinClassNames(
        baseItemStyle,
        isEmphasized ? emphasizedItemStyle : isActive ? activeItemStyle : defaultItemStyle,
      )}
    >
      <span className="shrink-0 text-gray-800">{iconElement}</span>
      <span className="truncate">{linkText}</span>
    </Link>
  );
}

type SidebarSectionProps = {
  sectionTitle?: string;
  children: ReactNode;
};

function SidebarSection({ sectionTitle, children }: SidebarSectionProps) {
  return (
    <section className="mt-6">
      {sectionTitle && (
        <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          {sectionTitle}
        </p>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/* ---------- main component ---------- */
export default function Sidebar() {
  const currentPathname = usePathname();

  // NOTE: Give your real routes here so active highlighting works automatically.
  const routePathCreate = "/create";
  const routePathHome = "/";
  const routePathAnime = "/anime";
  const routePathStore = "/store";
  const routePathAi = "/ai";
  const routePathProjectImmortal = "/project-immortal";

  return (
    <aside className="w-80 shrink-0 border-r border-border bg-card">
      <div className="h-[calc(100dvh-64px)] overflow-y-auto px-4 py-6">
        {/* Create + Primary navigation */}
        <SidebarSection>
          <SidebarNavigationItem
            destinationPath={routePathCreate}
            linkText="Create"
            iconElement={<IconVideoCall />}
            isEmphasized
            isActive={currentPathname === routePathCreate}
          />
        </SidebarSection>

        <SidebarSection>
          <SidebarNavigationItem
            destinationPath={routePathHome}
            linkText="Home"
            isActive={currentPathname === routePathHome}
            iconElement={<IconHome />}
          />
          <SidebarNavigationItem
            destinationPath={routePathAnime}
            linkText="Anime"
            iconElement={<IconMonitorPlay className="h-5 w-5" />}
            isActive={currentPathname === routePathAnime}
          />
          <SidebarNavigationItem
            destinationPath={routePathStore}
            linkText="Store"
            iconElement={<IconBag className="h-5 w-5" />}
            isActive={currentPathname === routePathStore}
          />
          <SidebarNavigationItem
            destinationPath={routePathAi}
            linkText="AI"
            iconElement={<IconCpu className="h-5 w-5" />}
            isActive={currentPathname === routePathAi}
          />
          <div className="my-5 border-t border-gray-200" />
        </SidebarSection>

        {/* Research and Development */}
        <SidebarSection sectionTitle="Research and  Development">
          <SidebarNavigationItem
            destinationPath={routePathProjectImmortal}
            linkText="PROJECT IMMORTAL"
            iconElement={<IconFlask className="h-5 w-5" />}
            isActive={currentPathname === routePathProjectImmortal}
          />
          <div className="my-5 border-t border-gray-200" />
        </SidebarSection>

        {/* Personalisation */}
        <SidebarSection sectionTitle="Personalisation">
          <SidebarNavigationItem
            destinationPath="/library"
            linkText="Library"
            iconElement={<IconMonitorPlay className="h-5 w-5" />}
            isActive={currentPathname === "/library"}
          />
          <SidebarNavigationItem
            destinationPath="/history"
            linkText="History"
            iconElement={<IconClockRotate className="h-5 w-5" />}
            isActive={currentPathname === "/history"}
          />
          <SidebarNavigationItem
            destinationPath="/your-videos"
            linkText="Your videos"
            iconElement={<IconMonitorPlay className="h-5 w-5" />}
            isActive={currentPathname === "/your-videos"}
          />
          <SidebarNavigationItem
            destinationPath="/cart"
            linkText="Cart"
            iconElement={<IconCart className="h-5 w-5" />}
            isActive={currentPathname === "/cart"}
          />
          <SidebarNavigationItem
            destinationPath="/orders-and-returns"
            linkText="Orders and returns"
            iconElement={<IconTruckReturn className="h-5 w-5" />}
            isActive={currentPathname === "/orders-and-returns"}
          />
          <SidebarNavigationItem
            destinationPath="/your-sales"
            linkText="Your sales"
            iconElement={<IconBadgeDollar className="h-5 w-5" />}
            isActive={currentPathname === "/your-sales"}
          />
          <SidebarNavigationItem
            destinationPath="/advertise-with-us"
            linkText="Advertise with us"
            iconElement={<IconMegaphone className="h-5 w-5" />}
            isActive={currentPathname === "/advertise-with-us"}
          />
          <div className="my-6 border-t border-gray-200" />
        </SidebarSection>

        {/* Help and settings */}
        <SidebarSection sectionTitle="Help and settings">
          <SidebarNavigationItem
            destinationPath="/your-account"
            linkText="Your account"
            iconElement={<IconUser className="h-5 w-5" />}
            isActive={currentPathname === "/your-account"}
          />
          <SidebarNavigationItem
            destinationPath="/customer-service"
            linkText="Customer service"
            iconElement={<IconHeadset className="h-5 w-5" />}
            isActive={currentPathname === "/customer-service"}
          />
          <SidebarNavigationItem
            destinationPath="/sign-out"
            linkText="Sign out"
            iconElement={<IconLogout className="h-5 w-5" />}
            isActive={currentPathname === "/sign-out"}
          />
          <div className="my-6 border-t border-gray-200" />
        </SidebarSection>

        {/* Footer links */}
        <footer className="space-y-2 text-xs text-gray-600">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:underline" href="/about">
              About
            </Link>
            <Link className="hover:underline" href="/press">
              Press
            </Link>
            <Link className="hover:underline" href="/copyright">
              Copyright
            </Link>
            <Link className="hover:underline" href="/contact-us">
              Contact us
            </Link>
            <Link className="hover:underline" href="/creator">
              Creator
            </Link>
            <Link className="hover:underline" href="/careers">
              Careers
            </Link>
            <Link className="hover:underline" href="/developers">
              Developers
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:underline" href="/terms">
              Terms
            </Link>
            <Link className="hover:underline" href="/privacy-policy">
              Privacy Policy
            </Link>
            <Link className="hover:underline" href="/policies-and-safety">
              Policies and Safety
            </Link>
            <Link className="hover:underline" href="/how-qatoto-works">
              How Qatoto works
            </Link>
          </div>
          <p className="pt-2 text-gray-500">© 2026 Qatoto</p>
        </footer>
      </div>
    </aside>
  );
}
