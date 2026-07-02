"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { memo, useMemo } from "react";

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
  localMall: {
    active: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  analytics: {
    active: "/icons/analytics_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  comment: {
    active: "/icons/comment_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/comment_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  paid: {
    static: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  school: {
    active: "/icons/school_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/school_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
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
} as const;

/* ---------- Utilities ---------- */
function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// The studio hub owns "/studio" and any sub-path (e.g. /studio/videos). Every
// other item points at a real app route (or an inert "#" placeholder) and is
// active only on an exact match.
function isStudioItemActive(pathname: string, destinationPath: string) {
  if (destinationPath === "/studio") {
    return pathname === "/studio" || pathname.startsWith("/studio/");
  }
  return pathname === destinationPath;
}

/* ---------- Memoized icon ---------- */
type StudioIconProps = {
  isActive: boolean;
  iconKey: keyof typeof ICON_PATHS;
  alt: string;
};

const StudioSidebarIcon = memo(function StudioSidebarIcon({
  isActive,
  iconKey,
  alt,
}: StudioIconProps) {
  const iconConfig = ICON_PATHS[iconKey];
  const src =
    "static" in iconConfig ? iconConfig.static : isActive ? iconConfig.active : iconConfig.inactive;

  return <Image width={24} height={24} src={src} alt={alt} />;
});

/* ---------- Navigation configuration ---------- */
type StudioNavItem = {
  path: string;
  label: string;
  iconKey: keyof typeof ICON_PATHS;
  isEmphasized?: boolean;
};

// "Create" is the emphasized primary action (teal) and lands on the studio hub
// itself. Home/Store link back into the main app; the remaining sections are
// inert placeholders during the UI phase.
const STUDIO_NAVIGATION_CONFIG: StudioNavItem[] = [
  { path: "/", label: "Home", iconKey: "home" },
  { path: "/studio", label: "Create", iconKey: "videoCall", isEmphasized: true },
  { path: "#", label: "My Videos", iconKey: "videoLibrary" },
  { path: "/store", label: "Store", iconKey: "localMall" },
  { path: "#", label: "Analytics", iconKey: "analytics" },
  { path: "#", label: "Comments", iconKey: "comment" },
  { path: "#", label: "Earn", iconKey: "paid" },
  { path: "#", label: "Learn", iconKey: "school" },
  { path: "#", label: "Customize", iconKey: "dashboardCustomize" },
  { path: "#", label: "Copyright", iconKey: "copyright" },
  { path: "#", label: "subtitles", iconKey: "subtitles" },
];

const BASE_ITEM_STYLE = "flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors";
const DEFAULT_ITEM_STYLE = "text-foreground hover:bg-muted/50";
const ACTIVE_ITEM_STYLE = "bg-secondary text-secondary-foreground font-medium";
const EMPHASIZED_ITEM_STYLE = "bg-primary text-primary-foreground font-medium";

/* ---------- Navigation item ---------- */
type StudioNavigationItemProps = {
  destinationPath: string;
  iconKey: keyof typeof ICON_PATHS;
  linkText: string;
  isEmphasized?: boolean;
  isActive: boolean;
};

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
        isEmphasized ? EMPHASIZED_ITEM_STYLE : isActive ? ACTIVE_ITEM_STYLE : DEFAULT_ITEM_STYLE,
      )}
    >
      <span className="shrink-0">
        <StudioSidebarIcon isActive={isActive || !!isEmphasized} iconKey={iconKey} alt={linkText} />
      </span>
      <span className="truncate">{linkText}</span>
    </Link>
  );
});

/* ---------- Main component ---------- */
export default function StudioSidebar() {
  const currentPathname = usePathname();

  const renderedItems = useMemo(() => {
    return STUDIO_NAVIGATION_CONFIG.map((item) => (
      <StudioNavigationItem
        key={item.label}
        destinationPath={item.path}
        linkText={item.label}
        iconKey={item.iconKey}
        isEmphasized={item.isEmphasized}
        isActive={isStudioItemActive(currentPathname, item.path)}
      />
    ));
  }, [currentPathname]);

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-80 shrink-0 self-start overflow-y-auto border-r border-border bg-background md:block">
      <nav className="flex flex-col gap-2 px-4 py-6">{renderedItems}</nav>
    </aside>
  );
}
