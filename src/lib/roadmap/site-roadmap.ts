// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// THE SITE ROADMAP: every surface this product has, in the order a person meets them.
//
// This is deliberately AUTHORED rather than derived. A generated route list would be a directory
// listing, not a roadmap — it cannot say that /research-and-development/project/[id] is reached by
// clicking a card in the build log, that /studio/analytics is still a stub, or that the eleven
// milestones below are a sequence rather than an alphabet. Those are the only facts on this page
// worth reading, and none of them live in the filesystem.
//
// THE COST OF AUTHORING IT IS DRIFT, and the mitigation is that every `route` href is a literal
// string, so a moved route is one grep away:
//
//   rg -o 'href: "(/[^"]*)"' -r '$1' src/lib/roadmap/site-roadmap.ts | sort -u | while read -r p; do
//     ls src/app/*/"${p#/}"/page.tsx >/dev/null 2>&1 || [ "$p" = "/" ] || echo "DEAD $p"
//   done
//
// WHAT IS NOT HERE: the ten /admin routes. That console is staff-gated, and enumerating its shape
// on a public marketing page is disclosure with no reader who benefits.

/**
 * One destination on the map. THREE VARIANTS, NOT A BAG OF OPTIONAL FIELDS — a `href?: string`
 * plus a `isPlanned?: boolean` would permit a planned route that is also linkable and a dynamic
 * route with no explanation of how to reach it, both of which are lies the renderer would happily
 * paint. The union makes each one an exhaustive `switch` case instead.
 */
export type RoadmapDestination =
  | {
      /** A real, directly linkable URL. */
      readonly kind: "route";
      readonly label: string;
      readonly href: string;
      readonly summary: string;
    }
  | {
      /**
       * A dynamic segment — `[id]`, `[slug]`. There is no URL to link, so the node carries the
       * navigation instead: this is the half of the page that answers "how do I reach it".
       */
      readonly kind: "dynamic";
      readonly label: string;
      readonly pathPattern: string;
      readonly summary: string;
      readonly reachedFrom: string;
    }
  | {
      /**
       * The route resolves but renders a placeholder heading. Listing it as working would make
       * the map a promise the app does not keep.
       */
      readonly kind: "planned";
      readonly label: string;
      readonly pathPattern: string;
      readonly summary: string;
    };

/** One stage on the trunk. `id` doubles as the `#anchor` the jump-nav targets. */
export interface RoadmapMilestone {
  readonly id: string;
  readonly stageLabel: string;
  readonly title: string;
  readonly summary: string;
  /** The trunk marker itself is a link — the one route that best opens this stage. */
  readonly entryHref: string;
  readonly destinations: readonly RoadmapDestination[];
}

export const SITE_ROADMAP_MILESTONES: readonly RoadmapMilestone[] = [
  {
    id: "get-an-account",
    stageLabel: "01",
    title: "Get an account",
    summary:
      "Browsing is open to everyone. Posting an idea, joining a team, claiming equity or buying anything needs an account.",
    entryHref: "/sign-up",
    destinations: [
      {
        kind: "route",
        label: "Sign up",
        href: "/sign-up",
        summary: "Create the account everything else hangs off.",
      },
      {
        kind: "route",
        label: "Sign in",
        href: "/sign-in",
        summary: "Passwordless — a one-time code to your email.",
      },
      {
        kind: "route",
        label: "Sign in with password",
        href: "/sign-in-with-password",
        summary: "The classic fallback if you set a password.",
      },
      {
        kind: "route",
        label: "Forgot password",
        href: "/forgot-password",
        summary: "Reset link, for the password route only.",
      },
      // NO "Your account", "Settings" OR "Sign out" NODE. All three were here as routes and are
      // now none: `/your-account` and `/settings` were page trees rendering near-copies of panels
      // the account menu already carried, and they were deleted rather than kept in step. Like
      // sign-out, what remains is a control in that menu, not a surface — and a map of surfaces is
      // the wrong place to promise a control. See the "Help and settings" comment in
      // `components/home/layout/sidebar.tsx` for why they live only in that menu.
    ],
  },
  {
    id: "watch-and-discover",
    stageLabel: "02",
    title: "Watch and discover",
    summary:
      "The feed is the front door. Every project on the pipeline publishes here, so watching is how most people first meet an idea.",
    entryHref: "/",
    destinations: [
      {
        kind: "route",
        label: "Home feed",
        href: "/",
        summary: "Everything being built, newest first.",
      },
      {
        kind: "route",
        label: "Watch",
        href: "/watch",
        summary: "The player. Opens from any video card.",
      },
      {
        kind: "route",
        label: "Search",
        href: "/search",
        summary: "Across videos, projects, people and products.",
      },
      {
        kind: "route",
        label: "Anime",
        href: "/anime",
        summary: "The anime hub, with its own player and rails.",
      },
      {
        kind: "route",
        label: "Anime — daily",
        href: "/anime/daily",
        summary: "What aired today.",
      },
      {
        kind: "route",
        label: "Anime — genre",
        href: "/anime/genre",
        summary: "Browse by genre.",
      },
      {
        kind: "route",
        label: "Anime — ranking",
        href: "/anime/ranking",
        summary: "Ranked by watch signal.",
      },
      {
        kind: "route",
        label: "Anime — favourites",
        href: "/anime/favorite",
        summary: "The titles you saved.",
      },
      {
        kind: "route",
        label: "Library",
        href: "/library",
        summary: "Your playlists, likes and bookmarks.",
      },
      {
        kind: "route",
        label: "History",
        href: "/history",
        summary: "Everything you have watched, kept for 90 days.",
      },
    ],
  },
  {
    id: "bring-a-problem",
    stageLabel: "03",
    title: "Bring a problem",
    summary:
      "The pipeline starts with a problem worth solving, not a pitch deck. Post one, or find one already mapped and unclaimed.",
    entryHref: "/research-and-development",
    destinations: [
      {
        kind: "route",
        label: "R&D hub",
        href: "/research-and-development",
        summary: "The pipeline landing page — every stage from here.",
      },
      {
        kind: "route",
        label: "Post an idea",
        href: "/research-and-development/new",
        summary: "Four-step wizard. Problem first, solution second.",
      },
      {
        kind: "route",
        label: "Problem map",
        href: "/research-and-development/problem-map",
        summary: "Civic Pulse — real problems clustered by theme and region.",
      },
      {
        kind: "dynamic",
        label: "Problem cluster",
        pathPattern: "/research-and-development/problem-map/cluster/[clusterId]",
        summary: "Every report behind one cluster, and who is working on it.",
        reachedFrom: "clicking a cluster on the problem map",
      },
      {
        kind: "route",
        label: "Knowledge hub",
        href: "/research-and-development/knowledge-hub",
        summary: "Market research, papers and prior art before you commit.",
      },
    ],
  },
  {
    id: "find-your-team",
    stageLabel: "04",
    title: "Find your team",
    summary:
      "People trade skill for equity here. Roles are posted against a project, applications are tracked, and the split is recorded.",
    entryHref: "/research-and-development/team-building",
    destinations: [
      {
        kind: "route",
        label: "Team building",
        href: "/research-and-development/team-building",
        summary: "Open roles across every project, role-first.",
      },
      {
        kind: "route",
        label: "Talent",
        href: "/research-and-development/talent",
        summary: "People offering skill for equity, people-first.",
      },
      {
        kind: "dynamic",
        label: "Talent profile",
        pathPattern: "/research-and-development/talent/[handle]",
        summary: "What one person has shipped, and what they want in return.",
        reachedFrom: "clicking anyone on the talent directory",
      },
      {
        kind: "route",
        label: "Your applications",
        href: "/research-and-development/applications",
        summary: "Roles you applied for and invitations you received.",
      },
    ],
  },
  {
    id: "build-in-the-open",
    stageLabel: "05",
    title: "Build in the open",
    summary:
      "Work is logged daily and effort is measured, because the equity split at the end is computed from the record, not negotiated.",
    entryHref: "/research-and-development/build-log",
    destinations: [
      {
        kind: "route",
        label: "Build log",
        href: "/research-and-development/build-log",
        summary: "The daily-log feed across every active project.",
      },
      {
        kind: "dynamic",
        label: "Project",
        pathPattern: "/research-and-development/project/[id]",
        summary: "Overview, daily logs, team, funding and governance in five tabs.",
        reachedFrom: "clicking any project card in the build log or R&D hub",
      },
      {
        kind: "dynamic",
        label: "Virtual workshop",
        pathPattern: "/research-and-development/project/[id]/workshop",
        summary: "The shared build space for one project.",
        reachedFrom: "the Workshop tab on a project",
      },
      {
        kind: "dynamic",
        label: "Proof of effort",
        pathPattern: "/research-and-development/project/[id]/proof-of-effort",
        summary: "The Slicing Pie ledger — claims, re-verification and the running split.",
        reachedFrom: "the Proof of Effort link on a project",
      },
    ],
  },
  {
    id: "fund-and-govern",
    stageLabel: "06",
    title: "Fund and govern",
    summary:
      "Money and commitments are visible to the people affected by them. Commitments are recorded and reconciled monthly.",
    entryHref: "/research-and-development/funding",
    destinations: [
      {
        kind: "route",
        label: "Funding",
        href: "/research-and-development/funding",
        summary: "Deal flow — projects looking for capital.",
      },
      {
        kind: "route",
        label: "Governance",
        href: "/research-and-development/governance",
        summary: "Commitments and month-end statements.",
      },
      {
        kind: "route",
        label: "Research programmes",
        href: "/research-and-development/programs",
        summary: "Long-horizon programmes with their own branch maps.",
      },
      {
        kind: "route",
        label: "Propose a programme",
        href: "/research-and-development/programs/new",
        summary: "Anyone with a full account may propose one. It lands pending review.",
      },
      {
        kind: "dynamic",
        label: "Programme",
        pathPattern: "/research-and-development/programs/[programSlug]",
        summary: "One programme, its branch map and its open gaps.",
        reachedFrom: "clicking a programme in the programmes list",
      },
    ],
  },
  {
    id: "go-to-market",
    stageLabel: "07",
    title: "Go to market",
    summary:
      "The last pipeline stage: suppliers, compliance and the handoff from a working prototype to a product people can buy.",
    entryHref: "/research-and-development/go-to-market",
    destinations: [
      {
        kind: "route",
        label: "Go to market",
        href: "/research-and-development/go-to-market",
        summary: "Manufacturing, certification and launch readiness.",
      },
      {
        kind: "dynamic",
        label: "Supplier",
        pathPattern: "/research-and-development/go-to-market/supplier/[supplierSlug]",
        summary: "One supplier's capability, capacity and record.",
        reachedFrom: "clicking a supplier on the go-to-market page",
      },
    ],
  },
  {
    id: "buy-in-the-store",
    stageLabel: "08",
    title: "Buy in the Store",
    summary:
      "What the pipeline ships ends up here — alongside services, factories and the B2B rails for sourcing at volume.",
    entryHref: "/store",
    destinations: [
      {
        kind: "route",
        label: "Store",
        href: "/store",
        summary: "The commerce landing page.",
      },
      {
        kind: "route",
        label: "Store search",
        href: "/store/search",
        summary: "Search products, services and providers.",
      },
      {
        kind: "route",
        label: "Categories",
        href: "/store/categories",
        summary: "The full category tree.",
      },
      {
        kind: "dynamic",
        label: "Category",
        pathPattern: "/store/categories/[...slug]",
        summary: "One category at any depth, filtered and paginated server-side.",
        reachedFrom: "drilling into the category tree",
      },
      {
        kind: "dynamic",
        label: "Product",
        pathPattern: "/store/product/[id]",
        summary: "One product — variants, samples, seller and shipping.",
        reachedFrom: "clicking any product card",
      },
      {
        kind: "dynamic",
        label: "Merchandising rail",
        pathPattern: "/store/rails/[railSlug]",
        summary: "A curated row expanded to a full page.",
        reachedFrom: "the See all link on a store rail",
      },
      {
        kind: "route",
        label: "Pathways",
        href: "/store/pathways",
        summary: "Guided routes into a category for buyers who are new to it.",
      },
      {
        kind: "dynamic",
        label: "Pathway",
        pathPattern: "/store/pathways/[pathwaySlug]",
        summary: "One guided sourcing pathway, step by step.",
        reachedFrom: "clicking a pathway",
      },
      {
        kind: "route",
        label: "Business tools",
        href: "/store/business",
        summary: "The B2B index — RFQs, factories, providers in one place.",
      },
      {
        kind: "dynamic",
        label: "Storefront",
        pathPattern: "/store/organizations/[organizationSlug]",
        summary: "Everything one organisation sells.",
        reachedFrom: "the seller name on any product",
      },
      {
        kind: "route",
        label: "Service providers",
        href: "/store/providers",
        summary: "Trade services directory — design, tooling, compliance, logistics.",
      },
      {
        kind: "dynamic",
        label: "Provider",
        pathPattern: "/store/providers/[organizationSlug]",
        summary: "One provider's offerings and engagement record.",
        reachedFrom: "clicking a provider in the directory",
      },
      {
        kind: "dynamic",
        label: "Service offering",
        pathPattern: "/store/services/[offeringSlug]",
        summary: "One service, its scope and how to engage it.",
        reachedFrom: "clicking an offering on a provider page",
      },
      {
        kind: "route",
        label: "Factories",
        href: "/store/factories",
        summary: "Manufacturing partners by capability and capacity.",
      },
      {
        kind: "dynamic",
        label: "Factory",
        pathPattern: "/store/factories/[factorySlug]",
        summary: "One factory — lines, certifications, minimums.",
        reachedFrom: "clicking a factory in the directory",
      },
      {
        kind: "dynamic",
        label: "Factory inquiry",
        pathPattern: "/store/factories/[factorySlug]/inquire",
        summary: "Send a production inquiry to that factory.",
        reachedFrom: "the Inquire button on a factory",
      },
      {
        kind: "route",
        label: "Your factory inquiries",
        href: "/store/factory-inquiries",
        summary: "Inquiries you sent, and where each one stands.",
      },
      {
        kind: "dynamic",
        label: "Factory inquiry thread",
        pathPattern: "/store/factory-inquiries/[inquiryId]",
        summary: "One inquiry, its replies and attachments.",
        reachedFrom: "your factory inquiries list",
      },
      {
        kind: "route",
        label: "RFQs",
        href: "/store/rfqs",
        summary: "Requests for quotation you have raised.",
      },
      {
        kind: "route",
        label: "Raise an RFQ",
        href: "/store/rfqs/new",
        summary: "Describe what you need; sellers quote against it.",
      },
      {
        kind: "dynamic",
        label: "RFQ",
        pathPattern: "/store/rfqs/[rfqId]",
        summary: "One RFQ and every quote it drew.",
        reachedFrom: "your RFQ list",
      },
      {
        kind: "dynamic",
        label: "Compare quotes",
        pathPattern: "/store/rfqs/[rfqId]/compare",
        summary: "Quotes on one RFQ, side by side.",
        reachedFrom: "the Compare button on an RFQ",
      },
      {
        kind: "dynamic",
        label: "Quote",
        pathPattern: "/store/quotes/[quoteId]",
        summary: "One quote — line items, lead time, terms.",
        reachedFrom: "clicking a quote on an RFQ",
      },
      {
        kind: "route",
        label: "Forum",
        href: "/store/forum",
        summary: "Sourcing and manufacturing discussion.",
      },
      {
        kind: "route",
        label: "Start a thread",
        href: "/store/forum/new",
        summary: "Ask the trade something.",
      },
      {
        kind: "route",
        label: "Your threads",
        href: "/store/forum/mine",
        summary: "Threads you started or replied to.",
      },
      {
        kind: "dynamic",
        label: "Thread",
        pathPattern: "/store/forum/[threadSlug]",
        summary: "One discussion.",
        reachedFrom: "clicking a thread in the forum",
      },
      {
        kind: "route",
        label: "Find a co-founder",
        href: "/store/find-cofounder",
        summary: "Profiles of people looking for a founding partner.",
      },
      {
        kind: "route",
        label: "Post a co-founder profile",
        href: "/store/find-cofounder/new",
        summary: "Say what you bring and what you are missing.",
      },
      {
        kind: "route",
        label: "Your co-founder profile",
        href: "/store/find-cofounder/mine",
        summary: "Edit or withdraw your own listing.",
      },
      {
        kind: "dynamic",
        label: "Co-founder profile",
        pathPattern: "/store/find-cofounder/[profileSlug]",
        summary: "One person, what they bring, what they want.",
        reachedFrom: "clicking a profile in the directory",
      },
    ],
  },
  {
    id: "orders-money-disputes",
    stageLabel: "09",
    title: "Orders, money and disputes",
    summary:
      "Everything that happens after you commit — carts, payment, delivery, engagement milestones and the route to a human when it goes wrong.",
    entryHref: "/cart",
    destinations: [
      {
        kind: "route",
        label: "Cart",
        href: "/cart",
        summary: "Items and samples, with per-item quantity ceilings.",
      },
      {
        kind: "route",
        label: "Checkout",
        href: "/checkout",
        summary: "Address, shipping and payment.",
      },
      {
        kind: "route",
        label: "Wishlist",
        href: "/wishlist",
        summary: "Saved for later.",
      },
      {
        kind: "route",
        label: "Orders and returns",
        href: "/orders-and-returns",
        summary: "Every order you placed, and the return window on each.",
      },
      {
        kind: "dynamic",
        label: "Order",
        pathPattern: "/orders-and-returns/[orderId]",
        summary: "One order — shipments, invoices, return actions.",
        reachedFrom: "clicking an order in your orders list",
      },
      {
        kind: "route",
        label: "Service engagements",
        href: "/service-engagements",
        summary: "Services you commissioned, by milestone.",
      },
      {
        kind: "dynamic",
        label: "Engagement",
        pathPattern: "/service-engagements/[engagementId]",
        summary: "One engagement — scope, milestones, payments.",
        reachedFrom: "your engagements list",
      },
      {
        kind: "route",
        label: "Messages",
        href: "/messages",
        summary: "Threads with sellers, providers and factories.",
      },
      {
        kind: "route",
        label: "Disputes",
        href: "/disputes",
        summary: "Raised against an order or an engagement.",
      },
      {
        kind: "dynamic",
        label: "Dispute",
        pathPattern: "/disputes/[disputeId]",
        summary: "One dispute, its evidence and its resolution.",
        reachedFrom: "your disputes list",
      },
      {
        kind: "route",
        label: "Sales",
        href: "/sales",
        summary: "The other side of the same orders, if you sell.",
      },
    ],
  },
  {
    id: "sell-and-create",
    stageLabel: "10",
    title: "Sell and create in Studio",
    summary:
      "The back office. One place for the video side and the commerce side, because on this platform they are the same account.",
    entryHref: "/studio",
    destinations: [
      {
        kind: "route",
        label: "Studio",
        href: "/studio",
        summary: "The creator and seller home.",
      },
      {
        kind: "route",
        label: "Your videos",
        href: "/studio/videos",
        summary: "Upload, edit and publish.",
      },
      {
        kind: "route",
        label: "Series",
        href: "/studio/series",
        summary: "Group videos into an ordered series.",
      },
      {
        kind: "dynamic",
        label: "Series detail",
        pathPattern: "/studio/series/[seriesId]",
        summary: "Reorder and manage one series.",
        reachedFrom: "clicking a series in Studio",
      },
      {
        kind: "route",
        label: "Playlists",
        href: "/studio/playlists",
        summary: "Curated, reorderable collections.",
      },
      {
        kind: "dynamic",
        label: "Playlist detail",
        pathPattern: "/studio/playlists/[playlistId]",
        summary: "Manage one playlist.",
        reachedFrom: "clicking a playlist in Studio",
      },
      {
        kind: "route",
        label: "Products",
        href: "/studio/products",
        summary: "Your listings — stock, variants, samples, pricing.",
      },
      {
        kind: "route",
        label: "Create a product",
        href: "/studio/products/create",
        summary: "The listing form, category-aware.",
      },
      {
        kind: "route",
        label: "Services",
        href: "/studio/services",
        summary: "Offerings you sell as a provider.",
      },
      {
        kind: "route",
        label: "Create a service",
        href: "/studio/services/create",
        summary: "Scope, milestones and rate card.",
      },
      {
        kind: "route",
        label: "Orders",
        href: "/studio/orders",
        summary: "Orders to fulfil.",
      },
      {
        kind: "dynamic",
        label: "Order detail",
        pathPattern: "/studio/orders/[orderId]",
        summary: "Fulfil, ship and invoice one order.",
        reachedFrom: "your Studio orders list",
      },
      {
        kind: "route",
        label: "Incoming RFQs",
        href: "/studio/rfqs",
        summary: "Requests you can quote against.",
      },
      {
        kind: "dynamic",
        label: "RFQ detail",
        pathPattern: "/studio/rfqs/[rfqId]",
        summary: "Read the request and send a quote.",
        reachedFrom: "your incoming RFQs list",
      },
      // ⚠️ THE THREE LIST ROUTES BELOW WERE MISSING FROM THIS FILE, and two of them are not new.
      // `/studio/quotes` and `/studio/reviews` both shipped without a roadmap entry — only the
      // `[quoteId]` DETAIL was here, and reviews had nothing at all. Both were registered in
      // `site-capabilities.ts` at the time, which is why nobody noticed: the drift loop in this
      // file's header only walks roadmap → filesystem and cannot see a page that has no entry.
      // Added alongside `/studio/questions` rather than left for the next reader to trip over.
      {
        kind: "route",
        label: "Your quotes",
        href: "/studio/quotes",
        summary: "Every quote you sent, including the unsubmitted one blocking the next revision.",
      },
      {
        kind: "dynamic",
        label: "Quote detail",
        pathPattern: "/studio/quotes/[quoteId]",
        summary: "One quote you sent, and its outcome.",
        reachedFrom: "an RFQ you quoted on",
      },
      {
        kind: "route",
        label: "Reviews",
        href: "/studio/reviews",
        summary: "What buyers said about your organization, and your one answer to each.",
      },
      {
        kind: "route",
        label: "Questions",
        href: "/studio/questions",
        summary:
          "Questions asked on your listings, oldest first, filtered to the ones still waiting on you.",
      },
      {
        kind: "dynamic",
        label: "Engagement (seller)",
        pathPattern: "/studio/service-engagements/[engagementId]",
        summary: "Deliver one engagement, milestone by milestone.",
        reachedFrom: "a service order in Studio",
      },
      {
        kind: "route",
        label: "Factory profile",
        href: "/studio/factory-profile",
        summary: "Your lines, certifications and minimums, as buyers see them.",
      },
      {
        kind: "route",
        label: "Factory inquiries",
        href: "/studio/factory-inquiries",
        summary: "Production inquiries buyers sent you.",
      },
      {
        kind: "dynamic",
        label: "Inquiry detail",
        pathPattern: "/studio/factory-inquiries/[inquiryId]",
        summary: "Reply to one production inquiry.",
        reachedFrom: "your Studio inquiries list",
      },
      {
        kind: "route",
        label: "Logistics",
        href: "/studio/logistics",
        summary: "Shipping profiles and carriers.",
      },
      {
        // `route`, not `planned`: the page reads real data now. The other five Studio entries stay
        // `planned` — the data for those does not exist, and an honest placeholder is not a feature.
        // (The count is the live one: Subtitles, Earn, Learn, Support, Feedback. It drifted to
        // "six" and "seven" here as routes graduated and these comments did not.)
        kind: "route",
        label: "Analytics",
        href: "/studio/analytics",
        summary: "Reach and engagement across your videos, counted on Qatoto.",
      },
      {
        // `route`, not `planned`: the page reads real data now. The other five Studio entries stay
        // `planned` — the data for those does not exist, and an honest placeholder is not a feature.
        // (The count is the live one: Subtitles, Earn, Learn, Support, Feedback. It drifted to
        // "six" and "seven" here as routes graduated and these comments did not.)
        kind: "route",
        label: "Comments",
        href: "/studio/comments",
        summary: "Every comment on your videos, in one place.",
      },
      {
        kind: "planned",
        label: "Subtitles",
        pathPattern: "/studio/subtitles",
        summary: "Captions and translations.",
      },
      {
        // `route`, not `planned`: the page reads real data now — and it shipped because the
        // creator was being told something false. A moderator-hidden video derived as
        // `published` for its own owner until `hidden-by-moderator` was added to the badge.
        kind: "route",
        label: "Copyright",
        href: "/studio/copyright",
        summary: "Decisions about your videos, and the reports you have filed.",
      },
      {
        // `route`, not `planned`: the page writes real columns now. The other five Studio entries
        // stay `planned` — the data for those does not exist, and an honest placeholder is not a
        // feature.
        //
        // THE SUMMARY NARROWED WITH THE FLIP. It used to promise "Channel branding and layout",
        // and what shipped is the description and the links — no banner, no layout control. A
        // roadmap line that keeps describing the larger thing is how a `route` quietly becomes a
        // claim again.
        kind: "route",
        label: "Customise",
        href: "/studio/customize",
        summary: "Your channel description and links.",
      },
      {
        kind: "planned",
        label: "Earn",
        pathPattern: "/studio/earn",
        summary: "Monetisation and payouts.",
      },
      {
        // `route`, not `planned`: the page reads real data now. `GET /funding-rounds/mine` is the
        // cross-project view the placeholder promised and nothing provided — R&D's funding surface
        // is PER PROJECT. The writes stayed there deliberately; this page reads and links through.
        kind: "route",
        label: "Funding",
        href: "/studio/funding",
        summary: "Every round across the ventures you founded.",
      },
      {
        // `route`, not `planned` — and NOT for what the old summary promised. It read
        // "Pitches you sent and received", which implies sending a pitch TO a named person;
        // there is no such primitive, and building one needs an investor entity, KYC and a
        // securities answer. `todo.md` had this route down as blocked on a DEFINITION rather
        // than on code, and it was right.
        //
        // What shipped is the Kickstarter/YC-demo-day reading: publish a venture to people who
        // might fund it. The money is deliberately elsewhere — the pitch links out to a
        // licensed third party — so this summary says "links out" rather than implying Qatoto
        // takes funding, which it does not.
        kind: "route",
        label: "Pitches",
        href: "/studio/pitches",
        summary:
          "Publish a venture to people who might fund it. Funding links out; Qatoto holds no funds.",
      },
      {
        // ⚠️ THIS ENTRY HAS NOW BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, and the history is worth
        // keeping. It first read "Who else can act on this account" — account-level DELEGATION,
        // which does not exist. It was then corrected to describe collaborator credits, which is
        // what the page actually served. Both times the summary chased the page.
        //
        // The page was the thing that was wrong. `/studio/team` sits in the sidebar's Product
        // journey section between Pitches and Funding, so it owes the pipeline stage where a
        // founder assembles a team; the credits moved to `/studio/collaborations` below and this
        // route now does that job.
        kind: "route",
        label: "Team",
        href: "/studio/team",
        summary:
          "Who wants to build with you, across every venture you run — and what each role offers.",
      },
      {
        // The credits, unchanged, in the Channel section where the other video features live.
        // A credit still grants nobody anything, which is why the summary keeps saying so.
        kind: "route",
        label: "Collaborations",
        href: "/studio/collaborations",
        summary: "Collaborator credits on your videos. Credits grant no access.",
      },
      {
        kind: "planned",
        label: "Learn",
        pathPattern: "/studio/learn",
        summary: "How to do the thing you are stuck on.",
      },
      {
        kind: "planned",
        label: "Support",
        pathPattern: "/studio/support",
        summary: "Reach a human about your account.",
      },
      {
        kind: "planned",
        label: "Feedback",
        pathPattern: "/studio/feedback",
        summary: "Tell us what is broken.",
      },
    ],
  },
];

/**
 * The reading room. These are not a stage of anything — they are the pages you go to when you want
 * to know how the thing works or what you agreed to — so they render as a flat grid at the foot of
 * the map rather than a node on the trunk.
 */
export const ROADMAP_REFERENCE_DESTINATIONS: readonly RoadmapDestination[] = [
  {
    kind: "route",
    label: "How Qatoto works",
    href: "/how-qatoto-works",
    summary: "The pipeline in five stages, with a worked example.",
  },
  {
    kind: "route",
    label: "About",
    href: "/about",
    summary: "Why this exists.",
  },
  {
    kind: "route",
    label: "Creator",
    href: "/creator",
    summary: "What the platform offers people who make things.",
  },
  {
    kind: "route",
    label: "Developers",
    href: "/developers",
    summary: "API, SDKs and endpoints.",
  },
  {
    kind: "route",
    label: "Blogs",
    href: "/blogs",
    summary: "Longer writing from the team.",
  },
  {
    kind: "dynamic",
    label: "Blog post",
    pathPattern: "/blogs/[slug]",
    summary: "One post.",
    reachedFrom: "clicking a post on the blogs index",
  },
  {
    kind: "route",
    label: "Press",
    href: "/press",
    summary: "Coverage and announcements.",
  },
  {
    kind: "dynamic",
    label: "Press item",
    pathPattern: "/press/[slug]",
    summary: "One press item.",
    reachedFrom: "clicking an item on the press index",
  },
  {
    kind: "route",
    label: "Careers",
    href: "/careers",
    summary: "Open roles at Qatoto itself.",
  },
  {
    kind: "route",
    label: "Contact us",
    href: "/contact-us",
    summary: "How to reach us.",
  },
  {
    // `route`, not `planned`: the body is a real page now rather than a placeholder heading, which
    // is the whole distinction between those two kinds.
    kind: "route",
    label: "Customer service",
    href: "/customer-service",
    summary: "Help with an order or an account.",
  },
  {
    // `route`, not `planned`: the body is a real page now rather than a placeholder heading, which
    // is the whole distinction between those two kinds.
    kind: "route",
    label: "Advertise with us",
    href: "/advertise-with-us",
    summary: "Placement across the feed and store.",
  },
  {
    // `route`, not `planned`, since video content reporting shipped: the page renders the
    // caller's own reports from `GET /users/me/video-reports` rather than a placeholder
    // heading, which is the whole distinction between those two kinds.
    kind: "route",
    label: "Report history",
    href: "/report-history",
    summary: "Reports you filed, and what came of them.",
  },
  {
    // `route`, not `planned`: the body is a real page now rather than a placeholder heading, which
    // is the whole distinction between those two kinds.
    kind: "route",
    label: "Policies and safety",
    href: "/policies-and-safety",
    summary: "The safety centre.",
  },
  {
    kind: "route",
    label: "Terms and conditions",
    href: "/terms-and-conditions",
    summary: "The agreement.",
  },
  {
    kind: "route",
    label: "Privacy policy",
    href: "/privacy-policy",
    summary: "What is collected and why.",
  },
  {
    kind: "route",
    label: "Copyright policy",
    href: "/copyright-policy",
    summary: "Claims, counter-claims and takedowns.",
  },
  {
    kind: "route",
    label: "Community guidelines",
    href: "/community-guidelines",
    summary: "What is allowed here.",
  },
  {
    kind: "route",
    label: "Vulnerability disclosure policy",
    href: "/vulnerability-disclosure-policy",
    summary: "How to report a security issue safely.",
  },
];
