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
const historyIcon = "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const slideshowInactiveIcon = "/icons/slideshow_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const slideshowActiveIcon = "/icons/slideshow_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const shoppingCartInactiveIcon = "/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const shoppingCartActiveIcon = "/icons/shopping_cart_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const localShippingInactiveIcon =
  "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const localShippingActiveIcon = "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const chartDataInactiveIcon = "/icons/chart_data_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const chartDataActiveIcon = "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const featuredVideoInactiveIcon =
  "/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const featuredVideoActiveIcon = "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const accountCircleInactiveIcon =
  "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const accountCircleActiveIcon = "/icons/account_circle_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";
const supportAgentIcon = "/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
const logoutIcon = "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";

/* ---------- tiny utilities ---------- */
function joinClassNames(...classNameParts: Array<string | false | null | undefined>) {
  return classNameParts.filter(Boolean).join(" ");
}

/* ---------- minimalist icon set (no external deps) ---------- */
type IconSvgProps = ComponentProps<"svg">;

function IconVideoCall({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={videoCallActiveIcon} alt={"Create"} />;
  } else {
    return <Image width={24} height={24} src={videoCallInactiveIcon} alt={"Create"} />;
  }
}

function IconHome({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={homeActiveIcon} alt={"Home"} />;
  } else {
    return <Image width={24} height={24} src={homeInactiveIcon} alt={"Home"} />;
  }
}

function IconLiveTv({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={liveTvActiveIcon} alt={"Anime"} />;
  } else {
    return <Image width={24} height={24} src={liveTvInactiveIcon} alt={"Anime"} />;
  }
}

function IconLocalMall({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={localMallActiveIcon} alt={"Store"} />;
  } else {
    return <Image width={24} height={24} src={localMallInactiveIcon} alt={"Store"} />;
  }
}

function IconScreenShare({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={screenShareActiveIcon} alt={"AI"} />;
  } else {
    return <Image width={24} height={24} src={screenShareInactiveIcon} alt={"AI"} />;
  }
}

function IconSelfImprovement() {
  return <Image width={24} height={24} src={selfImprovementIcon} alt={"Project Immortal"} />;
}

function IconVideoLibrary({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={videoLibraryActiveIcon} alt={"Library"} />;
  } else {
    return <Image width={24} height={24} src={videoLibraryInactiveIcon} alt={"Library"} />;
  }
}

function IconHistory() {
  return <Image width={24} height={24} src={historyIcon} alt={"History"} />;
}

function IconSlideshow({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={slideshowActiveIcon} alt={"Your videos"} />;
  } else {
    return <Image width={24} height={24} src={slideshowInactiveIcon} alt={"Your videos"} />;
  }
}

function IconShoppingCart({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={shoppingCartActiveIcon} alt={"Cart"} />;
  } else {
    return <Image width={24} height={24} src={shoppingCartInactiveIcon} alt={"Cart"} />;
  }
}

function IconLocalShipping({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={localShippingActiveIcon} alt={"Orders and returns"} />;
  } else {
    return <Image width={24} height={24} src={localShippingInactiveIcon} alt={"Orders and returns"} />;
  }
}

function IconChartData({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={chartDataActiveIcon} alt={"Your sales"} />;
  } else {
    return <Image width={24} height={24} src={chartDataInactiveIcon} alt={"Your sales"} />;
  }
}

function IconFeaturedVideo({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={featuredVideoActiveIcon} alt={"Advertise with us"} />;
  } else {
    return <Image width={24} height={24} src={featuredVideoInactiveIcon} alt={"Advertise with us"} />;
  }
}

function IconAccountCircle({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Image width={24} height={24} src={accountCircleActiveIcon} alt={"Your account"} />;
  } else {
    return <Image width={24} height={24} src={accountCircleInactiveIcon} alt={"Your account"} />;
  }
}

function IconSupportAgent() {
  return <Image width={24} height={24} src={supportAgentIcon} alt={"Customer service"} />;
}

function IconLogout() {
  return <Image width={24} height={24} src={logoutIcon} alt={"Sign out"} />;
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

  // Real routes
  const routePathCreate = "/create";
  const routePathHome = "/";
  const routePathAnime = "/anime";
  const routePathStore = "/store";
  const routePathAi = "/ai";
  const routePathProjectImmortal = "/project-immortal";
  const routePathLibrary = "/library";
  const routePathHistory = "/history";
  const routePathYourVideos = "/your-videos";
  const routePathCart = "/cart";
  const routePathOrdersAndReturns = "/orders-and-returns";
  const routePathYourSales = "/your-sales";
  const routePathAdvertiseWithUs = "/advertise-with-us";
  const routePathYourAccount = "/your-account";
  const routePathCustomerService = "/customer-service";
  const routePathSignOut = "/sign-out";
  const routePathAbout = "/about";
  const routePathPress = "/press";
  const routePathCopyright = "/copyright";
  const routePathContactUs = "/contact-us";
  const routePathCreator = "/creator";
  const routePathCareers = "/careers";
  const routePathDevelopers = "/developers";
  const routePathTermsAndConditions = "/terms-and-conditions";
  const routePathPrivacyPolicy = "/privacy-policy";
  const routePathVulnerabilityDisclosureProgram = "/vulnerability-disclosure-program";
  const routePathHowQatotoWorks = "/how-qatoto-works";

  return (
    <aside className="w-80 shrink-0 border-r border-border bg-card">
      <div className="h-[calc(100dvh-64px)] overflow-y-auto px-4 py-6">
        {/* Create + Primary navigation */}
        <SidebarSection>
          <SidebarNavigationItem
            destinationPath={routePathCreate}
            linkText="Create"
            iconElement={<IconVideoCall isActive={currentPathname === routePathCreate} />}
            isEmphasized
            isActive={currentPathname === routePathCreate}
          />
        </SidebarSection>

        <SidebarSection>
          <SidebarNavigationItem
            destinationPath={routePathHome}
            linkText="Home"
            iconElement={<IconHome isActive={currentPathname === routePathHome} />}
            isActive={currentPathname === routePathHome}
          />
          <SidebarNavigationItem
            destinationPath={routePathAnime}
            linkText="Anime"
            iconElement={<IconLiveTv isActive={currentPathname === routePathAnime} />}
            isActive={currentPathname === routePathAnime}
          />
          <SidebarNavigationItem
            destinationPath={routePathStore}
            linkText="Store"
            iconElement={<IconLocalMall isActive={currentPathname === routePathStore} />}
            isActive={currentPathname === routePathStore}
          />
          <SidebarNavigationItem
            destinationPath={routePathAi}
            linkText="AI"
            iconElement={<IconScreenShare isActive={currentPathname === routePathAi} />}
            isActive={currentPathname === routePathAi}
          />
          <div className="my-5 border-t border-gray-200" />
        </SidebarSection>

        {/* Research and Development */}
        <SidebarSection sectionTitle="Research and  Development">
          <SidebarNavigationItem
            destinationPath={routePathProjectImmortal}
            linkText="PROJECT IMMORTAL"
            iconElement={<IconSelfImprovement />}
            isActive={currentPathname === routePathProjectImmortal}
          />
          <div className="my-5 border-t border-gray-200" />
        </SidebarSection>

        {/* Personalisation */}
        <SidebarSection sectionTitle="Personalisation">
          <SidebarNavigationItem
            destinationPath={routePathLibrary}
            linkText="Library"
            iconElement={<IconVideoLibrary isActive={currentPathname === routePathLibrary} />}
            isActive={currentPathname === routePathLibrary}
          />
          <SidebarNavigationItem
            destinationPath={routePathHistory}
            linkText="History"
            iconElement={<IconHistory />}
            isActive={currentPathname === routePathHistory}
          />
          <SidebarNavigationItem
            destinationPath={routePathYourVideos}
            linkText="Your videos"
            iconElement={<IconSlideshow isActive={currentPathname === routePathYourVideos} />}
            isActive={currentPathname === routePathYourVideos}
          />
          <SidebarNavigationItem
            destinationPath={routePathCart}
            linkText="Cart"
            iconElement={<IconShoppingCart isActive={currentPathname === routePathCart} />}
            isActive={currentPathname === routePathCart}
          />
          <SidebarNavigationItem
            destinationPath={routePathOrdersAndReturns}
            linkText="Orders and returns"
            iconElement={<IconLocalShipping isActive={currentPathname === routePathOrdersAndReturns} />}
            isActive={currentPathname === routePathOrdersAndReturns}
          />
          <SidebarNavigationItem
            destinationPath={routePathYourSales}
            linkText="Your sales"
            iconElement={<IconChartData isActive={currentPathname === routePathYourSales} />}
            isActive={currentPathname === routePathYourSales}
          />
          <SidebarNavigationItem
            destinationPath={routePathAdvertiseWithUs}
            linkText="Advertise with us"
            iconElement={<IconFeaturedVideo isActive={currentPathname === routePathAdvertiseWithUs} />}
            isActive={currentPathname === routePathAdvertiseWithUs}
          />
          <div className="my-6 border-t border-gray-200" />
        </SidebarSection>

        {/* Help and settings */}
        <SidebarSection sectionTitle="Help and settings">
          <SidebarNavigationItem
            destinationPath={routePathYourAccount}
            linkText="Your account"
            iconElement={<IconAccountCircle isActive={currentPathname === routePathYourAccount} />}
            isActive={currentPathname === routePathYourAccount}
          />
          <SidebarNavigationItem
            destinationPath={routePathCustomerService}
            linkText="Customer service"
            iconElement={<IconSupportAgent />}
            isActive={currentPathname === routePathCustomerService}
          />
          <SidebarNavigationItem
            destinationPath={routePathSignOut}
            linkText="Sign out"
            iconElement={<IconLogout />}
            isActive={currentPathname === routePathSignOut}
          />
          <div className="my-6 border-t border-gray-200" />
        </SidebarSection>

        {/* Footer links */}
        <footer className="space-y-2 text-xs text-gray-600">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:underline" href={routePathAbout}>
              About
            </Link>
            <Link className="hover:underline" href={routePathPress}>
              Press
            </Link>
            <Link className="hover:underline" href={routePathCopyright}>
              Copyright
            </Link>
            <Link className="hover:underline" href={routePathContactUs}>
              Contact us
            </Link>
            <Link className="hover:underline" href={routePathCreator}>
              Creator
            </Link>
            <Link className="hover:underline" href={routePathCareers}>
              Careers
            </Link>
            <Link className="hover:underline" href={routePathDevelopers}>
              Developers
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:underline" href={routePathTermsAndConditions}>
              Terms and Conditions
            </Link>
            <Link className="hover:underline" href={routePathPrivacyPolicy}>
              Privacy Policy
            </Link>
            <Link className="hover:underline" href={routePathVulnerabilityDisclosureProgram}>
              Vulnerability Disclosure Program
            </Link>
            <Link className="hover:underline" href={routePathHowQatotoWorks}>
              How Qatoto works
            </Link>
          </div>
          <p className="pt-2 text-gray-500">© 2026 Qatoto</p>
        </footer>
      </div>
    </aside>
  );
}
