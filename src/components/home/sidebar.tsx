"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, memo, useMemo } from "react";
import Image from "next/image";
import { useSidebar } from "@/state/sidebar-context";

/* ---------- Icon paths (outside component to prevent re-allocation) ---------- */
const ICON_PATHS = {
  videoCall: {
    active: "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  home: {
    active: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/home_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  liveTv: {
    active: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  localMall: {
    active: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  science: {
    active: "/icons/science_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  selfImprovement: {
    static: "/icons/self_improvement_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  videoLibrary: {
    active: "/icons/video_library_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  history: {
    static: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  slideshow: {
    active: "/icons/slideshow_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/slideshow_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  favorite: {
    active: "/icons/favorite_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  shoppingCart: {
    active: "/icons/shopping_cart_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  localShipping: {
    active: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  chartData: {
    active: "/icons/chart_data_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/chart_data_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  featuredVideo: {
    active: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  accountCircle: {
    active: "/icons/account_circle_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  supportAgent: {
    static: "/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  logout: {
    static: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
} as const;

/* ---------- Route paths (outside component) ---------- */
const ROUTES = {
  create: "/create",
  home: "/",
  anime: "/anime",
  store: "/store",
  researchAndDevelopment: "/research-and-development",
  projectImmortal: "/project-immortal",
  library: "/library",
  history: "/history",
  wishlist: "/wishlist",
  cart: "/cart",
  ordersAndReturns: "/orders-and-returns",
  listings: "/listings",
  sales: "/sales",
  advertiseWithUs: "/advertise-with-us",
  yourAccount: "/your-account",
  customerService: "/customer-service",
  signOut: "/sign-out",
  about: "/about",
  press: "/press",
  blogs: "/blogs",
  copyrightPolicy: "/copyright-policy",
  communityGuidelines: "/community-guidelines",
  contactUs: "/contact-us",
  creator: "/creator",
  careers: "/careers",
  developers: "/developers",
  termsAndConditions: "/terms-and-conditions",
  privacyPolicy: "/privacy-policy",
  vulnerabilityDisclosurePolicy: "/vulnerability-disclosure-policy",
  howQatotoWorks: "/how-qatoto-works",
} as const;

/* ---------- Utilities ---------- */
function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// Home matches exactly; every other route is active for itself and any sub-path
// (e.g. /anime/genre keeps /anime active).
function isRouteActive(pathname: string, routePath: string) {
  if (routePath === ROUTES.home) return pathname === routePath;
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

/* ---------- Memoized Icon Component ---------- */
type IconProps = {
  isActive: boolean;
  iconKey: keyof typeof ICON_PATHS;
  alt: string;
};

const SidebarIcon = memo(function SidebarIcon({ isActive, iconKey, alt }: IconProps) {
  const iconConfig = ICON_PATHS[iconKey];
  const src =
    "static" in iconConfig ? iconConfig.static : isActive ? iconConfig.active : iconConfig.inactive;

  return <Image width={24} height={24} src={src} alt={alt} />;
});

/* ---------- Navigation Item Component ---------- */
type SidebarNavigationItemProps = {
  destinationPath: string;
  iconKey: keyof typeof ICON_PATHS;
  linkText: string;
  isEmphasized?: boolean;
  isActive?: boolean;
};

const BASE_ITEM_STYLE = "flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors";
const DEFAULT_ITEM_STYLE = "text-foreground hover:bg-muted/50 hover:text-foreground";
const ACTIVE_ITEM_STYLE = "bg-primary text-primary-foreground";
const EMPHASIZED_ITEM_STYLE = "rounded-xl bg-secondary text-secondary-foreground font-medium";
const EMPHASIZED_ACTIVE_ITEM_STYLE = "rounded-full bg-primary text-primary-foreground font-medium";

const SidebarNavigationItem = memo(function SidebarNavigationItem({
  destinationPath,
  iconKey,
  linkText,
  isEmphasized,
  isActive,
}: SidebarNavigationItemProps) {
  return (
    <Link
      href={destinationPath}
      aria-current={isActive ? "page" : undefined}
      className={joinClassNames(
        BASE_ITEM_STYLE,
        isEmphasized
          ? isActive
            ? EMPHASIZED_ACTIVE_ITEM_STYLE
            : EMPHASIZED_ITEM_STYLE
          : isActive
            ? ACTIVE_ITEM_STYLE
            : DEFAULT_ITEM_STYLE,
      )}
    >
      <span className="shrink-0 text-foreground">
        <SidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
      </span>
      <span className="truncate">{linkText}</span>
    </Link>
  );
});

/* ---------- Collapsed Navigation Item Component ---------- */
type CollapsedNavItemProps = {
  destinationPath: string;
  iconKey: keyof typeof ICON_PATHS;
  linkText: string;
  isEmphasized?: boolean;
  isActive?: boolean;
};

const CollapsedNavItem = memo(function CollapsedNavItem({
  destinationPath,
  iconKey,
  linkText,
  isEmphasized,
  isActive,
}: CollapsedNavItemProps) {
  // Create button - emphasized style with light blue rounded square
  if (isEmphasized) {
    return (
      <Link
        href={destinationPath}
        aria-current={isActive ? "page" : undefined}
        className={joinClassNames(
          "flex items-center justify-center w-14 h-14 mx-auto rounded-xl transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "bg-secondary",
        )}
      >
        <span className="shrink-0">
          <SidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
        </span>
      </Link>
    );
  }

  // Regular nav items - icon with the label below (Material 3 style)
  return (
    <Link
      href={destinationPath}
      aria-current={isActive ? "page" : undefined}
      className="group flex flex-col items-center justify-center py-2 text-xs transition-colors"
    >
      <span
        className={joinClassNames(
          "flex items-center justify-center w-14 h-8 rounded-full transition-colors",
          isActive ? "bg-primary" : "group-hover:bg-muted/50",
        )}
      >
        <span className="shrink-0">
          <SidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
        </span>
      </span>
      <span
        className={joinClassNames(
          "mt-1 text-xs",
          isActive ? "font-medium text-foreground" : "text-foreground",
        )}
      >
        {linkText}
      </span>
    </Link>
  );
});

/* ---------- Section Component ---------- */
type SidebarSectionProps = {
  sectionTitle?: string;
  children: ReactNode;
};

const SidebarSection = memo(function SidebarSection({
  sectionTitle,
  children,
}: SidebarSectionProps) {
  return (
    <section className="mt-6">
      {sectionTitle && (
        <h3 className="mb-3 truncate px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {sectionTitle}
        </h3>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
});

/* ---------- Navigation Configuration ---------- */
type NavItem = {
  path: string;
  label: string;
  iconKey: keyof typeof ICON_PATHS;
  isEmphasized?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
  hasDivider?: boolean;
};

const NAVIGATION_CONFIG: NavSection[] = [
  {
    items: [{ path: ROUTES.create, label: "Create", iconKey: "videoCall", isEmphasized: true }],
  },
  {
    items: [
      { path: ROUTES.home, label: "Home", iconKey: "home" },
      { path: ROUTES.anime, label: "Anime", iconKey: "liveTv" },
      { path: ROUTES.store, label: "Store", iconKey: "localMall" },
      { path: ROUTES.researchAndDevelopment, label: "R&D", iconKey: "science" },
    ],
    hasDivider: true,
  },
  {
    title: "Research and  Development",
    items: [
      { path: ROUTES.projectImmortal, label: "PROJECT IMMORTAL", iconKey: "selfImprovement" },
    ],
    hasDivider: true,
  },
  {
    title: "Personalisation",
    items: [
      { path: ROUTES.library, label: "Library", iconKey: "videoLibrary" },
      { path: ROUTES.history, label: "History", iconKey: "history" },
      { path: ROUTES.wishlist, label: "Wishlist", iconKey: "favorite" },
      { path: ROUTES.cart, label: "Cart", iconKey: "shoppingCart" },
      { path: ROUTES.ordersAndReturns, label: "Orders and returns", iconKey: "localShipping" },
      { path: ROUTES.listings, label: "Listings", iconKey: "slideshow" },
      { path: ROUTES.sales, label: "Sales", iconKey: "chartData" },
      { path: ROUTES.advertiseWithUs, label: "Advertise with us", iconKey: "featuredVideo" },
    ],
    hasDivider: true,
  },
  {
    title: "Help and settings",
    items: [
      { path: ROUTES.yourAccount, label: "Your account", iconKey: "accountCircle" },
      { path: ROUTES.customerService, label: "Customer service", iconKey: "supportAgent" },
      { path: ROUTES.signOut, label: "Sign out", iconKey: "logout" },
    ],
    hasDivider: true,
  },
];

const FOOTER_LINKS_ROW1 = [
  { path: ROUTES.howQatotoWorks, label: "How Qatoto Works" },
  { path: ROUTES.about, label: "About" },
  { path: ROUTES.press, label: "Press" },
  { path: ROUTES.blogs, label: "Blogs" },
  { path: ROUTES.contactUs, label: "Contact Us" },
  { path: ROUTES.creator, label: "Creator" },
  { path: ROUTES.careers, label: "Careers" },
  { path: ROUTES.developers, label: "Developers" },
] as const;

const FOOTER_LINKS_ROW2 = [
  { path: ROUTES.termsAndConditions, label: "Terms and Conditions" },
  { path: ROUTES.privacyPolicy, label: "Privacy Policy" },
  { path: ROUTES.copyrightPolicy, label: "Copyright Policy" },
  { path: ROUTES.communityGuidelines, label: "Community Guidelines" },
  { path: ROUTES.vulnerabilityDisclosurePolicy, label: "Vulnerability Disclosure Policy" },
] as const;

/* ---------- Collapsed Navigation Config ---------- */
const COLLAPSED_NAV_CONFIG: NavItem[] = [
  { path: ROUTES.create, label: "Create", iconKey: "videoCall", isEmphasized: true },
  { path: ROUTES.home, label: "Home", iconKey: "home" },
  { path: ROUTES.anime, label: "Anime", iconKey: "liveTv" },
  { path: ROUTES.store, label: "Store", iconKey: "localMall" },
  { path: ROUTES.researchAndDevelopment, label: "R&D", iconKey: "science" },
];

/* ---------- Main Component ---------- */
export default function Sidebar() {
  const currentPathname = usePathname();
  const { isCollapsed } = useSidebar();

  // Memoize rendered sections to prevent unnecessary re-renders
  const renderedSections = useMemo(() => {
    return NAVIGATION_CONFIG.map((section, sectionIndex) => (
      <SidebarSection key={sectionIndex} sectionTitle={section.title}>
        {section.items.map((item) => {
          const isActive = isRouteActive(currentPathname, item.path);
          return (
            <SidebarNavigationItem
              key={item.path}
              destinationPath={item.path}
              linkText={item.label}
              iconKey={item.iconKey}
              isEmphasized={item.isEmphasized}
              isActive={isActive}
            />
          );
        })}
        {section.hasDivider && <hr className="my-5 border-border" />}
      </SidebarSection>
    ));
  }, [currentPathname]);

  // Collapsed view
  if (isCollapsed) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-20 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
        <nav className="space-y-5 px-3 pt-11 pb-14">
          {/* Create button */}
          {COLLAPSED_NAV_CONFIG.filter((item) => item.isEmphasized).map((item) => {
            const isActive = isRouteActive(currentPathname, item.path);
            return (
              <CollapsedNavItem
                key={item.path}
                destinationPath={item.path}
                linkText={item.label}
                iconKey={item.iconKey}
                isEmphasized={item.isEmphasized}
                isActive={isActive}
              />
            );
          })}

          {/* Nav items */}
          <ul className="flex flex-col gap-1">
            {COLLAPSED_NAV_CONFIG.filter((item) => !item.isEmphasized).map((item) => {
              const isActive = isRouteActive(currentPathname, item.path);
              return (
                <CollapsedNavItem
                  key={item.path}
                  destinationPath={item.path}
                  linkText={item.label}
                  iconKey={item.iconKey}
                  isEmphasized={item.isEmphasized}
                  isActive={isActive}
                />
              );
            })}
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-80 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
      <div className="px-4 py-6">
        {renderedSections}

        {/* Footer links */}
        <footer className="space-y-2 text-xs text-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS_ROW1.map((link) => (
              <Link key={link.path} className="hover:underline" href={link.path}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS_ROW2.map((link) => (
              <Link key={link.path} className="hover:underline" href={link.path}>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="pt-2 text-muted-foreground">© 2026 Qatoto</p>
        </footer>
      </div>
    </aside>
  );
}
