"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/state/sidebar-context";

// Desktop-only sidebar for the staff console. Mirrors the (home) Sidebar's and the
// StudioSidebar's expanded/collapsed shells — same wrapper, paddings, pill styles,
// section headings, and the emphasized Create entry in its own section — so switching
// surfaces feels identical. Users, catalog and settings still have no page here and
// stay in Drizzle Studio per ADMIN_STRUCTURE.md §0.
type AdminNavItem = {
  href: string;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
  isEmphasized?: boolean;
};

type AdminNavSection = {
  title?: string;
  items: AdminNavItem[];
  hasDivider?: boolean;
};

const CREATE_ITEM: AdminNavItem = {
  href: "/studio",
  label: "Create",
  activeIcon: "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
  inactiveIcon: "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  isEmphasized: true,
};

// THE SECTIONS GROUP BY SURFACE, AND THE ORDER IS THE ARGUMENT.
//
// `Studio · …` is work someone is BLOCKED ON: a creator or seller submitted something and
// cannot proceed until a moderator answers. `Home · …` is work on what is ALREADY LIVE to the
// public — a takedown, a taxonomy, a merchandising slot. `Platform` is staff-only and touches
// neither surface.
//
// That is why Review sits under Studio and Video reports under Home even though both are
// `moderate_content` over video: "may this go out" is a person waiting, "should this come
// down" is a page already published.
//
// ⚠️ THE GROUPING IS NOT THE CAPABILITY PARTITION, on purpose. `Home · Video & anime` mixes
// `moderate_content` (the two report queues) with `manage_promotions` (Spotlight, Anime hero),
// and `Home · Community & R&D` mixes `moderate_content` with `moderate_taxonomy`. Do not
// "fix" the sections to match capabilities — the question this nav answers is WHERE A THING
// LIVES, not whether the viewer may act on it, and every page banners on its own capability.
// The sidebar itself still does no capability read at all (see Metrics below for why).
const ADMIN_NAVIGATION_SECTIONS: AdminNavSection[] = [
  {
    title: "Console",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        activeIcon: "/icons/dashboard_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/dashboard_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Studio · Creator submissions",
    items: [
      {
        // PRE-publication: an anime episode that has never been public, waiting for a verdict
        // before anyone sees it. A creator in Studio is blocked until this queue answers, which
        // is what puts it here rather than under Home — see "Video reports" for the other half.
        href: "/admin/review",
        label: "Review",
        activeIcon: "/icons/reviews_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/reviews_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Studio · Seller submissions",
    items: [
      {
        // The queue the certification decision route shipped without: a seller's compliance claim
        // becomes a filterable fact for buyers only after somebody here decides it.
        // `moderate_commerce`, and it leads this section because it is the plainest case of what
        // the heading means — a seller in Studio is blocked until a moderator answers.
        //
        // THE SAME ICON IN BOTH STATES, unlike every other item. `workspace_premium` is the app's
        // certification glyph — the storefront section, the capabilities sheet and the studio
        // sidebar all use it — and only its FILL0 is committed. Borrowing another item's pair
        // would say this page is that page; repeating one glyph only makes the active state
        // quieter.
        href: "/admin/certifications",
        label: "Certifications",
        activeIcon: "/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // The record behind a factory's `site_audited` state, under `moderate_commerce`. It is a
        // commerce fact about a seller — a check on somebody waiting in Studio — which is why it
        // does not sit with Community under `Home · Community & R&D`.
        //
        // `fact_check`, not `verified`: only a teal FILL1 verified icon is committed, and the nav
        // needs a black FILL0/FILL1 pair like every other item here.
        href: "/admin/site-audits",
        label: "Site audits",
        activeIcon: "/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // SELLER CLAIMS ABOUT WHICH PRODUCTS GO TOGETHER. `moderate_commerce`, and it sits with
        // the other seller checks in this section for the same reason they do: this is a fact
        // about a seller's catalogue, not about somebody's words.
        //
        // ⚠️ THE ONE ACTION HERE IS PERMANENT — nothing in the backend un-confirms a relation, and
        // the seller cannot remove a confirmed one either. The page confirms before acting.
        //
        // `link`, because a relation is an edge between two listings, and both fills are committed.
        href: "/admin/product-relations",
        label: "Product claims",
        activeIcon: "/icons/link_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // CURATED SETS AWAITING PUBLICATION. `moderate_commerce`, and it sits with the other
        // seller checks rather than with Community for the reason §17.4 gives: a self-dealing
        // shopping list and an off-topic forum thread are not the same shift.
        //
        // ⚠️ THE DECISION HERE IS A ONE-WAY DOOR. There is no route anywhere that deletes,
        // withdraws or unpublishes a set, so publishing is permanent — the page confirms before
        // it does.
        //
        // `category`, matching the studio sidebar's entry for the same thing, so an author and a
        // moderator recognise the same glyph.
        href: "/admin/pathways",
        label: "Curated sets",
        activeIcon: "/icons/category_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Home · Video & anime",
    items: [
      {
        // A DIFFERENT SECTION FROM "Review", though both are `moderate_content` and both are
        // about video. Review is PRE-publication and sits under `Studio · Creator submissions`
        // with a creator blocked on it. This is POST-publication: a live video on Home that a
        // viewer objected to. The decisions differ ("may this go out" vs "should this come
        // down"), and so does the cost of being wrong.
        href: "/admin/reports",
        label: "Video reports",
        activeIcon: "/icons/flag_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // A THIRD `moderate_content` QUEUE, and separate from "Review" and "Video reports" for
        // the same kind of reason those two are separate from each other: the SUBJECT differs.
        // Review decides whether a video may go out; Video reports decide whether a live video
        // comes down; this decides whether a person's channel DESCRIPTION comes down. The lever
        // here reaches the bio and links and nothing else — not their videos and not their
        // account — so mixing it into the video queue would blur what a moderator is actually
        // about to do.
        href: "/admin/profile-reports",
        label: "Profile reports",
        activeIcon: "/icons/report_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/report_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // Desktop only, same tradeoff as Promotions in `Home · Store` — video search plus three
        // slots is a desk job, and the mobile bar would go from six tabs to seven.
        href: "/admin/spotlight",
        label: "Spotlight",
        activeIcon: "/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // Desktop only, same tradeoff as Spotlight and as Promotions in `Home · Store` —
        // uploading art and setting an order is a desk job, and a seventh tab would break the
        // mobile bar.
        href: "/admin/anime-hero",
        label: "Anime hero",
        activeIcon: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Home · Store",
    items: [
      {
        // A DIFFERENT TAXONOMY FROM "Categories", which is R&D's `research_category` and
        // `research_paper_category` under `moderate_taxonomy` and sits in
        // `Home · Community & R&D`. This one is the store's browse tree under
        // `moderate_commerce` — separate tables, separate capability, separate job. The two
        // headings are what tells them apart now; the labels alone never did.
        //
        // Desktop only, same tradeoff as Promotions in this section: the mobile bar would go from
        // six tabs to seven, and arranging a category grid means picking image files.
        href: "/admin/store-categories",
        label: "Store categories",
        // `local_mall`, not `storefront`: only a teal FILL0 storefront is committed, and the nav
        // needs a black FILL0/FILL1 pair like every other item here.
        activeIcon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // BUYER REPORTS ON THE STORE, and it is separate from the other report queues for the
        // reason those are separate from each other: the CAPABILITY and the subject differ.
        // "Community" is `moderate_content` over forum threads and cofounder profiles; this is
        // `moderate_commerce` over listings, reviews, questions, answers and companies. §17.4
        // refuses to merge those shifts — a counterfeit-listing shift and an off-topic-thread
        // shift are not the same job.
        //
        // ⚠️ AND NOT THE SAME AS "Video reports" EITHER, despite the word. Different medium,
        // different capability — and unlike video, this surface has an AUTOMATIC hide, which is
        // why the page carries a moderation log beside the queue and the video console does not.
        //
        // `feedback`, not `flag` or `report`: those two are taken by the video and profile queues
        // in `Home · Video & anime`, and a shared glyph would say this page is that page. Only
        // its FILL0 and FILL1 pair is committed black, which is what the nav needs.
        href: "/admin/commerce-reports",
        label: "Store reports",
        activeIcon: "/icons/feedback_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/feedback_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // `manage_promotions`, not the `moderate_commerce` its section-mates carry — the heading
        // groups by SURFACE, not by capability, which the note above this array argues for.
        //
        // Desktop only, deliberately not added to admin-mobile-bottom-nav: that bar would go
        // from six tabs to seven, and managing a carousel means picking image files.
        href: "/admin/promotions",
        label: "Promotions",
        activeIcon: "/icons/slideshow_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/slideshow_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // The operations side of the store, not the taxonomy side: rate cards price a lane and
        // customs estimates give it an arrival window. Same `moderate_commerce` capability as
        // Store categories in this section, but that capability gates the READS here too, so an
        // unheld viewer gets a banner instead of a read-only console.
        //
        // Desktop only, same tradeoff as the rest of `Home · Store`: the mobile bar would go from
        // six tabs to seven, and authoring a weight ladder is a desk job either way.
        href: "/admin/freight",
        label: "Freight lanes",
        activeIcon: "/icons/local_shipping_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Home · Community & R&D",
    items: [
      {
        // COMMUNITY, NOT COMMERCE (§1.1). Forum threads, their replies, community reports and
        // cofounder profiles are one shift under `moderate_content` — the same moderator works
        // the off-topic thread, the report that named it and the profile that arrived after.
        // Separate from the whole `Home · Store` section, which is `moderate_commerce`: §17.4
        // refuses to merge the two queues because a counterfeit-listing shift and an
        // off-topic-thread shift are not the same job, and merging creates the coupling
        // capabilities exist to prevent.
        //
        // Desktop only, same tradeoff as Promotions.
        href: "/admin/community",
        label: "Community",
        activeIcon: "/icons/forum_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        // R&D's `research_category` and `research_paper_category` under `moderate_taxonomy` —
        // NOT the store's browse tree, which is "Store categories" in `Home · Store`. It sits
        // beside Community because both govern the non-commerce half of Home: what people write
        // and how it gets filed.
        href: "/admin/categories",
        label: "Categories",
        activeIcon: "/icons/category_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
    hasDivider: true,
  },
  {
    title: "Platform",
    items: [
      {
        // ADMIN ONLY, and the page says so rather than this list: `view_platform_metrics` is held
        // by `admin` alone, but the sidebar is rendered for every staff role and has no
        // capability read of its own. Hiding the row for a moderator would mean fetching
        // `/admin/whoami` from the chrome on every admin page load to hide one link.
        //
        // Desktop only, same tradeoff as Promotions and Spotlight — the mobile bar would go from
        // six tabs to seven, and a dashboard of charts is a desk job.
        href: "/admin/metrics",
        label: "Metrics",
        activeIcon: "/icons/analytics_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        href: "/admin/staff",
        label: "Staff",
        activeIcon: "/icons/group_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        activeIcon: "/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
        inactiveIcon: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      },
    ],
  },
];

// The 80px rail has no room for a heading or a divider, so it shows the same items as one flat
// column — DERIVED, not a second array. A hand-kept copy would drift the moment an admin page
// ships, which is exactly how the mobile bar's six tabs already differ from this list.
const ADMIN_COLLAPSED_ITEMS: AdminNavItem[] = ADMIN_NAVIGATION_SECTIONS.flatMap(
  (section) => section.items,
);

// Same pill styles as the (home) Sidebar's navigation items.
const BASE_ITEM_STYLE = "flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors";
const DEFAULT_ITEM_STYLE = "text-foreground hover:bg-muted/50 hover:text-foreground";
const ACTIVE_ITEM_STYLE = "bg-primary text-primary-foreground";
const EMPHASIZED_ITEM_STYLE = "rounded-xl bg-secondary text-secondary-foreground font-medium";
const EMPHASIZED_ACTIVE_ITEM_STYLE = "rounded-full bg-primary text-primary-foreground font-medium";

// /admin is the index — match it exactly so it doesn't stay highlighted on
// /admin/review and /admin/audit; the others stay active for sub-paths.
function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminSidebarIcon({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  return (
    <Image
      src={isActive ? item.activeIcon : item.inactiveIcon}
      width={24}
      height={24}
      alt={item.label}
    />
  );
}

// Same markup as StudioSidebarSection and the (home) SidebarSection, so the three consoles
// render their headings identically.
function AdminSidebarSection({
  sectionTitle,
  children,
}: {
  sectionTitle?: string;
  children: React.ReactNode;
}) {
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
}

function AdminSidebarNavigationItem({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  const stateStyle = item.isEmphasized
    ? isActive
      ? EMPHASIZED_ACTIVE_ITEM_STYLE
      : EMPHASIZED_ITEM_STYLE
    : isActive
      ? ACTIVE_ITEM_STYLE
      : DEFAULT_ITEM_STYLE;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`${BASE_ITEM_STYLE} ${stateStyle}`}
    >
      <span className="shrink-0 text-foreground">
        <AdminSidebarIcon item={item} isActive={isActive} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function AdminCollapsedNavItem({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  // Create button - emphasized style with light blue rounded square
  if (item.isEmphasized) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "bg-secondary"
        }`}
      >
        <span className="shrink-0">
          <AdminSidebarIcon item={item} isActive={isActive} />
        </span>
      </Link>
    );
  }

  // Regular nav items - icon with the label below (Material 3 style)
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className="group flex flex-col items-center justify-center py-2 text-xs transition-colors"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
          isActive ? "bg-primary" : "group-hover:bg-muted/50"
        }`}
      >
        <span className="shrink-0">
          <AdminSidebarIcon item={item} isActive={isActive} />
        </span>
      </span>
      <span className={`mt-1 text-xs text-foreground ${isActive ? "font-medium" : ""}`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  if (isCollapsed) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-20 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
        <nav aria-label="Admin console" className="space-y-5 px-3 pt-11 pb-14">
          <AdminCollapsedNavItem
            item={CREATE_ITEM}
            isActive={isRouteActive(pathname, CREATE_ITEM.href)}
          />

          <ul className="flex flex-col gap-1">
            {ADMIN_COLLAPSED_ITEMS.map((item) => (
              <AdminCollapsedNavItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-80 shrink-0 self-start overflow-y-auto border-r border-border bg-background transition-all duration-300 md:block">
      <nav aria-label="Admin console" className="px-4 py-6">
        {/* Create is a link OUT to the Studio app, not admin work — it stays above every
            heading, in its own untitled section, so the `Studio · …` sections below cannot be
            read as belonging to it. */}
        <AdminSidebarSection>
          <AdminSidebarNavigationItem
            item={CREATE_ITEM}
            isActive={isRouteActive(pathname, CREATE_ITEM.href)}
          />
        </AdminSidebarSection>

        {ADMIN_NAVIGATION_SECTIONS.map((section) => (
          <AdminSidebarSection key={section.title} sectionTitle={section.title}>
            {section.items.map((item) => (
              <AdminSidebarNavigationItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
            {section.hasDivider && <hr className="my-5 border-border" />}
          </AdminSidebarSection>
        ))}
      </nav>
    </aside>
  );
}
