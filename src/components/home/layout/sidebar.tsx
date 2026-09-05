"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, memo, useMemo } from "react";
import Image from "next/image";
import { useSidebar } from "@/state/sidebar-context";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

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
  architecture: {
    active: "/icons/architecture_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/architecture_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  localMall: {
    active: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  // `static` because the only filled `search` asset is tinted teal (`00696E`), and using it
  // as the active state would make one entry the wrong colour rather than the right weight.
  storeSearch: {
    static: "/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  category: {
    active: "/icons/category_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  package: {
    active: "/icons/package_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  requestQuote: {
    active: "/icons/request_quote_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/request_quote_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  science: {
    active: "/icons/science_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  flag: {
    active: "/icons/flag_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  // Stage 02's icon in `pipeline-stages-strip.tsx` already, so the sidebar and the pipeline
  // strip name the same surface with the same glyph.
  analytics: {
    active: "/icons/analytics_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  school: {
    active: "/icons/school_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/school_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  group: {
    active: "/icons/group_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  paid: {
    active: "/icons/paid_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
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
  favorite: {
    active: "/icons/favorite_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  bookmark: {
    active: "/icons/bookmark_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/bookmark_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  shoppingCart: {
    active: "/icons/shopping_cart_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  localShipping: {
    active: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  featuredVideo: {
    active: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    inactive: "/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
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
  create: "/studio",
  home: "/",
  blueprints: "/blueprints",
  store: "/store",
  storeSearch: "/store/search",
  storeCategories: "/store/categories",
  storeProviders: "/store/providers",
  storePathways: "/store/pathways",
  storeRfqs: "/store/rfqs",
  serviceEngagements: "/service-engagements",
  researchAndDevelopment: "/research-and-development",
  problemMap: "/research-and-development/problem-map",
  marketResearch: "/research-and-development/market-research",
  talent: "/research-and-development/talent",
  funding: "/research-and-development/funding",
  // Project Immortal is now ONE ROW in the generic /programs surface rather than a hardcoded
  // page, so its URL moved. The old path still resolves — it is a redirect — but the sidebar
  // points at the real one so the active state can match it exactly.
  projectImmortal: "/research-and-development/programs/project-immortal",
  library: "/library",
  history: "/history",
  wishlist: "/wishlist",
  cart: "/cart",
  ordersAndReturns: "/orders-and-returns",
  advertiseWithUs: "/advertise-with-us",
  customerService: "/customer-service",
  policiesAndSafety: "/policies-and-safety",
  about: "/about",
  press: "/press",
  blogs: "/blogs",
  copyrightPolicy: "/copyright-policy",
  communityGuidelines: "/community-guidelines",
  contactUs: "/contact-us",
  creator: "/creator",
  careers: "/careers",
  developers: "/developers",
  roadmap: "/roadmap",
  termsAndConditions: "/terms-and-conditions",
  privacyPolicy: "/privacy-policy",
  vulnerabilityDisclosurePolicy: "/vulnerability-disclosure-policy",
  howQatotoWorks: "/how-qatoto-works",
} as const;

/* ---------- Utilities ---------- */
function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Two routes match EXACTLY; every other one is active for itself and any sub-path (e.g.
 * /blueprints/<slug> keeps /blueprints active).
 *
 * `projectImmortal` is exact because it names ONE programme inside a generic surface. Under
 * prefix matching it would still be correct for its own page — but the surface around it is not
 * its own: `/research-and-development/programs`, `/programs/new` and every other programme are
 * siblings, not children, and none of them should light up an entry labelled PROJECT IMMORTAL.
 * Those pages highlight the top-level R&D entry instead, like any ordinary R&D sub-route.
 */
const EXACT_MATCH_ROUTES: readonly string[] = [ROUTES.projectImmortal];

function isRouteActive(pathname: string, routePath: string) {
  // Home owns "/" and the watch player ("/watch"). Blueprints has no player of its own —
  // the /anime/watch alias went with the vertical — so nothing else needs an exception.
  if (routePath === ROUTES.home) return pathname === routePath || pathname === "/watch";
  if (EXACT_MATCH_ROUTES.includes(routePath)) return pathname === routePath;
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
  /**
   * Hide this row from a visitor with no session.
   *
   * IT IS A DISPLAY RULE, NOT A GUARD. The row points at a route that authorizes itself and a
   * backend that re-authorizes every request (CLAUDE.md, "the client is hostile"); hiding it
   * stops the app OFFERING a signed-out visitor somebody else's cart, it does not protect
   * anything. Marking a row here is therefore never a substitute for the route's own gate.
   */
  requiresSession?: true;
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
      { path: ROUTES.blueprints, label: "Blueprints", iconKey: "architecture" },
      { path: ROUTES.store, label: "Store", iconKey: "localMall" },
      { path: ROUTES.researchAndDevelopment, label: "R&D", iconKey: "science" },
    ],
    hasDivider: true,
  },
  {
    title: "Research and Development",
    items: [
      { path: ROUTES.problemMap, label: "Problem Map", iconKey: "flag" },
      // Stage 02 of the pipeline. It absorbed the knowledge hub AND import intelligence,
      // the latter of which had no link from anywhere in the app until this entry.
      { path: ROUTES.marketResearch, label: "Market Research", iconKey: "analytics" },
      { path: ROUTES.talent, label: "Talent", iconKey: "group" },
      { path: ROUTES.funding, label: "Funding", iconKey: "paid" },
      { path: ROUTES.projectImmortal, label: "PROJECT IMMORTAL", iconKey: "selfImprovement" },
    ],
    hasDivider: true,
  },
  {
    // The store's own sub-section, modelled on "Research and Development" above.
    //
    // It did not exist: the store had ONE top-level entry, and its buyer surfaces were
    // scattered through "Personalisation" beside Wishlist and Library. Search, categories,
    // the provider directory and the RFQ queues are not personalisation — they are the
    // store's navigation, and a buyer looking for them under a heading about their own
    // preferences will not find them. Cart and Orders stay where they are: those genuinely
    // are the visitor's own things.
    title: "Store",
    items: [
      { path: ROUTES.storeSearch, label: "Search the store", iconKey: "storeSearch" },
      { path: ROUTES.storeCategories, label: "Categories", iconKey: "category" },
      { path: ROUTES.storePathways, label: "Pathways", iconKey: "package" },
      { path: ROUTES.storeProviders, label: "Trade services", iconKey: "localShipping" },
      // ADDED LATE, and their absence was a real gap: `/store/rfqs` shipped with no way to reach it by
      // clicking, which is the definition of unreviewable. The section comment above already claimed the RFQ
      // queues lived here.
      // GATED FOR THE SAME REASON AS "PERSONALISATION" BELOW, and they are the two rows in this
      // section that are the viewer's own rather than the store's. `robots.ts` already lists both
      // prefixes as private; a row labelled "Your requests" shown to somebody with no account is
      // the same defect, one section higher.
      {
        path: ROUTES.storeRfqs,
        label: "Your requests",
        iconKey: "requestQuote",
        requiresSession: true,
      },
      {
        path: ROUTES.serviceEngagements,
        label: "Service engagements",
        iconKey: "localShipping",
        requiresSession: true,
      },
    ],
    hasDivider: true,
  },
  {
    // EVERY ROW HERE EXCEPT THE LAST IS THE VIEWER'S OWN, so each is `requiresSession`. Before
    // that flag existed this whole section rendered to anonymous visitors — the section is
    // literally titled "Personalisation" and it was offering strangers a cart and an order
    // history that could not be theirs. `advertise-with-us` is a public page and stays, which is
    // why the section survives the filter rather than disappearing.
    //
    // WHAT IS DELIBERATELY ABSENT: "Listings" and "Sales". Both were SELLER surfaces sitting in a
    // section about the viewer's own preferences, and both left this chrome the moment you clicked
    // them — `/listings` was a bare redirect to `/studio/products`, and `/sales` linked every row
    // to `/studio/orders/[orderId]`. They live in the studio sidebar now, beside the listing
    // creation they belong to. "Create" above is the one row here that enters the studio on
    // purpose.
    title: "Personalisation",
    items: [
      { path: ROUTES.library, label: "Library", iconKey: "videoLibrary", requiresSession: true },
      { path: ROUTES.history, label: "History", iconKey: "history", requiresSession: true },
      // A BOOKMARK, NOT A HEART. The heart is the public like on a listing and files nothing;
      // the bookmark is what this page lists. A heart here would advertise the wrong control.
      { path: ROUTES.wishlist, label: "Wishlist", iconKey: "bookmark", requiresSession: true },
      { path: ROUTES.cart, label: "Cart", iconKey: "shoppingCart", requiresSession: true },
      {
        path: ROUTES.ordersAndReturns,
        label: "Orders and returns",
        iconKey: "localShipping",
        requiresSession: true,
      },
      { path: ROUTES.advertiseWithUs, label: "Advertise with us", iconKey: "featuredVideo" },
    ],
    hasDivider: true,
  },
  {
    // NO "SIGN OUT" ROW HERE, DELIBERATELY. Every entry in this file is a DESTINATION, and
    // sign-out is an action — the one irreversible thing in a list of places. It lives in the
    // account menu (`account/menus/account-menu.tsx`), which is also the only surface that
    // carries it everywhere: that menu is mounted by the (home), (studio) AND (admin) navbars,
    // while this sidebar is (home)-only. A second sign-out affordance here would be a second
    // implementation to keep in step, reachable from a third of the app.
    title: "Help and settings",
    items: [
      // NO "YOUR ACCOUNT" AND NO "SETTINGS" ROW EITHER, for the same reason as sign-out above:
      // both are panels in the account menu, not destinations. They were rows here pointing at
      // `/your-account` and `/settings`, two page trees that rendered near-copies of what that
      // menu already carried; the routes are gone and the menu is the one place they live.
      { path: ROUTES.customerService, label: "Customer service", iconKey: "supportAgent" },
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
  { path: ROUTES.roadmap, label: "Roadmap" },
] as const;

const FOOTER_LINKS_ROW2 = [
  { path: ROUTES.termsAndConditions, label: "Terms and Conditions" },
  { path: ROUTES.privacyPolicy, label: "Privacy Policy" },
  { path: ROUTES.copyrightPolicy, label: "Copyright Policy" },
  { path: ROUTES.communityGuidelines, label: "Community Guidelines" },
  { path: ROUTES.vulnerabilityDisclosurePolicy, label: "Vulnerability Disclosure Policy" },
  { path: ROUTES.policiesAndSafety, label: "Policies and Safety" },
] as const;

/* ---------- Collapsed Navigation Config ---------- */
const COLLAPSED_NAV_CONFIG: NavItem[] = [
  { path: ROUTES.create, label: "Create", iconKey: "videoCall", isEmphasized: true },
  { path: ROUTES.home, label: "Home", iconKey: "home" },
  { path: ROUTES.blueprints, label: "Blueprints", iconKey: "architecture" },
  { path: ROUTES.store, label: "Store", iconKey: "localMall" },
  { path: ROUTES.researchAndDevelopment, label: "R&D", iconKey: "science" },
];

/* ---------- Main Component ---------- */
/**
 * @param isViewerSignedIn what the SERVER saw, from `hasCallerSession()` in `sidebar-slot.tsx`.
 *   It seeds `useViewerSignedIn` so the first client render matches the HTML that shipped —
 *   without it the session atom can resolve mid-hydration and React discards the whole subtree.
 */
export default function Sidebar({ isViewerSignedIn }: { isViewerSignedIn: boolean }) {
  const currentPathname = usePathname();
  const { isCollapsed } = useSidebar();
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  // Memoize rendered sections to prevent unnecessary re-renders
  const renderedSections = useMemo(() => {
    return NAVIGATION_CONFIG.map((section, sectionIndex) => {
      const visibleItems = section.items.filter((item) => isSignedIn || !item.requiresSession);

      // A section can empty out entirely — render nothing rather than a heading and a divider
      // with no rows under them. None does today; the guard is here so adding one more
      // `requiresSession` row cannot leave a floating title behind.
      if (visibleItems.length === 0) return null;

      return (
        <SidebarSection key={sectionIndex} sectionTitle={section.title}>
          {visibleItems.map((item) => {
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
      );
    });
  }, [currentPathname, isSignedIn]);

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
