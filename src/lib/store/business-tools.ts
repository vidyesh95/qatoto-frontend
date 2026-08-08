// TRANSPORT: props-only — a static navigation manifest, no network.
//
// THE SIX THINGS A BUSINESS COMES TO THE STORE TO DO, in one list.
//
// NOT A FIXTURE, and it deliberately does not go through `resolveMockRead`. Every constant under
// `src/mocks/store/` stands in for an endpoint and is deleted when that endpoint is wired; this one
// stands in for nothing. It is the store's own information architecture — the same category of thing
// as `INFORMATION_LINKS` in `account-menu.tsx` — and it survives every wiring phase.
//
// WHY IT EXISTS AT ALL, which is the load-bearing part. The tile hrefs used to be hand-written inside
// `MOCK_B2B_LINKS`, corroborated by nothing, and FOUR OF THE SIX POINTED AT ROUTES THAT DO NOT EXIST:
// `/store/rfq` (the route is `/store/rfqs`), `/store/logistics`, `/store/factories`, `/store/forum`
// and `/store/find-cofounder`. Each fell through to the legacy `[...slug]` catch-all, which is
// redirect-only, so a click produced a visible meta-refresh pause and then the store 404 page.
//
// One manifest now feeds BOTH the store-home rail and the `/store/business` index, so a tile and its
// index card cannot disagree about where a tool lives. Changing a destination is one edit here.
//
// KEEP EVERY `href` POINTED AT A ROUTE THAT EXISTS. The check is `ls src/app/\(home\)/store/`.

/** One entry in the "For your Business" set. */
export type BusinessTool = {
  readonly id: string;
  readonly label: string;
  /**
   * One line of copy for the index card. The rail tile shows the label alone — it is 160px wide and
   * a sentence in it is unreadable — so this is the index page's field and only the index page's.
   */
  readonly description: string;
  /** A bare path under `public/icons/`, matching the convention every store icon map uses. */
  readonly iconSrc: string;
  readonly href: string;
};

/**
 * The manifest, in the order both surfaces render it.
 *
 * `all-business-tools` is FIRST and points at the index itself. On the rail that is a genuine
 * affordance — the rail is horizontally scrolled and truncated, so the first tile is the way to see
 * the rest. On the index page it is a self-link and is filtered out there rather than here, because
 * dropping it from the manifest would take it off the rail too.
 */
export const BUSINESS_TOOLS: readonly BusinessTool[] = [
  {
    id: "all-business-tools",
    label: "All Business Tools",
    description: "Everything on this page, in one place.",
    iconSrc: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/business",
  },
  {
    id: "request-for-quotation",
    label: "Request for Quotation",
    description:
      "Describe what you need once and let sellers and trade-service providers quote against it.",
    iconSrc: "/icons/request_quote_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    // `/store/rfqs`, PLURAL. The singular is the four-year-old href that 404s.
    href: "/store/rfqs",
  },
  {
    id: "logistic-services",
    label: "Logistic Services",
    description:
      "Freight, customs, inspection, testing, warehousing, insurance and settlement providers.",
    iconSrc: "/icons/directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    // The connector directory already exists and already covers logistics. A second `/store/logistics`
    // route would be a narrower view of the same nine kinds under a name that hides seven of them.
    href: "/store/providers",
  },
  {
    id: "factories-worldwide",
    label: "Factories Worldwide",
    description:
      "ODM and OEM manufacturers, by capability, country, order minimum and certification.",
    iconSrc: "/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/factories",
  },
  {
    id: "business-forum",
    label: "Business Forum",
    description:
      "Ask operators who have already shipped it — sourcing, customs, compliance, payments.",
    iconSrc: "/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/forum",
  },
  {
    id: "find-cofounder",
    label: "Find Cofounder",
    description:
      "People offering capital, expertise, reach or operating time in exchange for a stake.",
    iconSrc: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/find-cofounder",
  },
];

/** The index page's own list: every tool except the self-link back to the index. */
export const BUSINESS_TOOLS_EXCLUDING_INDEX: readonly BusinessTool[] = BUSINESS_TOOLS.filter(
  (businessTool) => businessTool.href !== "/store/business",
);
