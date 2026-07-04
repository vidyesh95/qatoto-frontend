"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, memo, useMemo } from "react";
import Image from "next/image";
import { useSidebar } from "@/state/sidebar-context";

/* ---------- Icon paths (outside component to prevent re-allocation) ---------- */
const ICON_PATHS = {
  home: {
    active: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/home_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  videoCall: {
    active: "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  videoLibrary: {
    active: "/icons/video_library_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  package: {
    active: "/icons/package_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  analytics: {
    active: "/icons/analytics_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  slideshow: {
    active: "/icons/slideshow_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/slideshow_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  playlistPlay: {
    static: "/icons/playlist_play_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  group: {
    active: "/icons/group_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  requestQuote: {
    active: "/icons/request_quote_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/request_quote_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  rateReview: {
    static: "/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  feedback: {
    active: "/icons/feedback_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/feedback_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  orders: {
    active: "/icons/orders_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/orders_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  localShipping: {
    active: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  supportAgent: {
    static: "/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  paid: {
    active: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  comment: {
    active: "/icons/comment_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/comment_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  dashboardCustomize: {
    active: "/icons/dashboard_customize_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/dashboard_customize_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  copyright: {
    active: "/icons/copyright_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/copyright_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  subtitles: {
    active: "/icons/subtitles_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/subtitles_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  school: {
    active: "/icons/school_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/school_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
} as const;

/* ---------- Route paths (outside component) ---------- */
const STUDIO_ROUTES = {
  home: "/",
  create: "/studio",
  myVideos: "/studio/videos",
  myProducts: "/studio/products",
  playlists: "/studio/playlists",
  analytics: "/studio/analytics",
  pitches: "/studio/pitches",
  team: "/studio/team",
  funding: "/studio/funding",
  feedback: "/studio/feedback",
  orders: "/studio/orders",
  logistics: "/studio/logistics",
  support: "/studio/support",
  earn: "/studio/earn",
  comments: "/studio/comments",
  customize: "/studio/customize",
  copyright: "/studio/copyright",
  subtitles: "/studio/subtitles",
  learn: "/studio/learn",
} as const;

/* ---------- Utilities ---------- */
function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// Home matches "/" exactly. The Create hub owns "/studio" exactly — its
// sub-paths (/studio/videos, …) belong to their own items, which are active for
// themselves and any deeper sub-path.
function isStudioRouteActive(pathname: string, routePath: string) {
  if (routePath === STUDIO_ROUTES.home) return pathname === routePath;
  if (routePath === STUDIO_ROUTES.create) return pathname === routePath;
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

/* ---------- Memoized Icon Component ---------- */
type IconProps = {
  isActive: boolean;
  iconKey: keyof typeof ICON_PATHS;
  alt: string;
};

const StudioSidebarIcon = memo(function StudioSidebarIcon({ isActive, iconKey, alt }: IconProps) {
  const iconConfig = ICON_PATHS[iconKey];
  const src =
    "static" in iconConfig ? iconConfig.static : isActive ? iconConfig.active : iconConfig.inactive;

  return <Image width={24} height={24} src={src} alt={alt} />;
});

/* ---------- Navigation Item Component (styles copied from main sidebar) ---------- */
type StudioNavigationItemProps = {
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

const StudioNavigationItem = memo(function StudioNavigationItem({
  destinationPath,
  iconKey,
  linkText,
  isEmphasized,
  isActive,
}: StudioNavigationItemProps) {
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
        <StudioSidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
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
  // Home - emphasized style with light blue rounded square
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
          <StudioSidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
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
          <StudioSidebarIcon isActive={!!isActive} iconKey={iconKey} alt={linkText} />
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
type StudioSidebarSectionProps = {
  sectionTitle?: string;
  children: ReactNode;
};

const StudioSidebarSection = memo(function StudioSidebarSection({
  sectionTitle,
  children,
}: StudioSidebarSectionProps) {
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
type StudioNavItem = {
  path: string;
  label: string;
  iconKey: keyof typeof ICON_PATHS;
  isEmphasized?: boolean;
};

type StudioNavSection = {
  title?: string;
  items: StudioNavItem[];
  hasDivider?: boolean;
};

// Sidebar maps the product lifecycle: create/build-in-public up top (daily
// tools), then pitch → team → fund → feedback, then the sell-side (orders,
// logistics, support, earn), then channel housekeeping.
const STUDIO_NAVIGATION_CONFIG: StudioNavSection[] = [
  {
    items: [{ path: STUDIO_ROUTES.home, label: "Home", iconKey: "home", isEmphasized: true }],
  },
  {
    items: [
      { path: STUDIO_ROUTES.create, label: "Create", iconKey: "videoCall" },
      { path: STUDIO_ROUTES.myVideos, label: "My Videos", iconKey: "videoLibrary" },
      { path: STUDIO_ROUTES.myProducts, label: "My Products", iconKey: "package" },
      { path: STUDIO_ROUTES.playlists, label: "Playlists", iconKey: "playlistPlay" },
    ],
    hasDivider: true,
  },
  {
    title: "Product journey",
    items: [
      { path: STUDIO_ROUTES.pitches, label: "Pitches", iconKey: "slideshow" },
      { path: STUDIO_ROUTES.team, label: "Team", iconKey: "group" },
      { path: STUDIO_ROUTES.funding, label: "Funding", iconKey: "requestQuote" },
      { path: STUDIO_ROUTES.feedback, label: "Feedback", iconKey: "feedback" },
    ],
    hasDivider: true,
  },
  {
    title: "Commerce and operations",
    items: [
      { path: STUDIO_ROUTES.orders, label: "Orders", iconKey: "orders" },
      { path: STUDIO_ROUTES.logistics, label: "Logistics", iconKey: "localShipping" },
      { path: STUDIO_ROUTES.support, label: "Support", iconKey: "supportAgent" },
      { path: STUDIO_ROUTES.earn, label: "Earn", iconKey: "paid" },
    ],
    hasDivider: true,
  },
  {
    title: "Channel",
    items: [
      { path: STUDIO_ROUTES.comments, label: "Comments", iconKey: "comment" },
      { path: STUDIO_ROUTES.customize, label: "Customize", iconKey: "dashboardCustomize" },
      { path: STUDIO_ROUTES.copyright, label: "Copyright", iconKey: "copyright" },
      { path: STUDIO_ROUTES.subtitles, label: "Subtitles", iconKey: "subtitles" },
      { path: STUDIO_ROUTES.learn, label: "Learn", iconKey: "school" },
      { path: STUDIO_ROUTES.analytics, label: "Analytics", iconKey: "analytics" },
    ],
  },
];

/* ---------- Collapsed Navigation Config ---------- */
const COLLAPSED_NAV_CONFIG: StudioNavItem[] = [
  { path: STUDIO_ROUTES.home, label: "Home", iconKey: "home", isEmphasized: true },
  { path: STUDIO_ROUTES.create, label: "Create", iconKey: "videoCall" },
  { path: STUDIO_ROUTES.myVideos, label: "My Videos", iconKey: "videoLibrary" },
  { path: STUDIO_ROUTES.myProducts, label: "My Products", iconKey: "package" },
  { path: STUDIO_ROUTES.playlists, label: "Playlists", iconKey: "playlistPlay" },
];

/* ---------- Main Component ---------- */
export default function StudioSidebar() {
  const currentPathname = usePathname();
  const { isCollapsed } = useSidebar();

  // Memoize rendered sections to prevent unnecessary re-renders
  const renderedSections = useMemo(() => {
    return STUDIO_NAVIGATION_CONFIG.map((section, sectionIndex) => (
      <StudioSidebarSection key={sectionIndex} sectionTitle={section.title}>
        {section.items.map((item) => {
          const isActive = isStudioRouteActive(currentPathname, item.path);
          return (
            <StudioNavigationItem
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
      </StudioSidebarSection>
    ));
  }, [currentPathname]);

  // Collapsed view
  if (isCollapsed) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-20 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
        <nav className="space-y-5 px-3 pt-11 pb-14">
          {/* Home button */}
          {COLLAPSED_NAV_CONFIG.filter((item) => item.isEmphasized).map((item) => {
            const isActive = isStudioRouteActive(currentPathname, item.path);
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
              const isActive = isStudioRouteActive(currentPathname, item.path);
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
      <div className="px-4 py-6">{renderedSections}</div>
    </aside>
  );
}
