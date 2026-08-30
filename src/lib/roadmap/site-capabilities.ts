// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// WHAT YOU CAN DO HERE, GROUPED BY WHO YOU ARE.
//
// `site-roadmap.ts` beside this file answers "where is every surface and how do I reach it". It is
// a map, and a map does not tell a first-time reader what the place is FOR. This file answers the
// other half: eight audiences, and for each one the handful of things that audience actually comes
// here to do — every one of them landing on a real URL rather than a promise.
//
// TWO RULES KEEP THE PAGE HONEST, and both are why this is authored rather than generated:
//
//  1. A `href` here must be a route that WORKS. The roadmap marks a set of routes `kind: "planned"`
//     — they resolve but render a placeholder heading (thirteen `/studio/*` stubs including
//     analytics, earn and payouts). Linking one of those from a capability row would be the page
//     promising a feature the app does not have. Where a capability genuinely lives on a stub, it
//     is said in `summary` prose with no chip. (`/settings` and `/your-account` were on that list,
//     then were built, and are now deleted — the account menu owns those panels and there is no URL
//     to link. Neither has ever been referenced here.)
//
//  2. A capability on a dynamic segment (`/…/project/[id]/proof-of-effort`) carries NO chip. There
//     is no URL to link, so `summary` says how it is reached instead.
//
// The drift check, both halves, is in the plan for this page and reduces to two greps:
//
//   rg -o 'href: "(/[^"]*)"' -r '$1' src/lib/roadmap/site-capabilities.ts | sort -u | while read -r p; do
//     ls src/app/*/"${p#/}"/page.tsx >/dev/null 2>&1 || [ "$p" = "/" ] || echo "DEAD $p"
//   done
//
//   rg -o 'pathPattern: "(/[^"]*)"' -r '$1' src/lib/roadmap/site-roadmap.ts | sort -u | while read -r p; do
//     rg -q "href: \"$p\"" src/lib/roadmap/site-capabilities.ts && echo "PROMISES A STUB $p"
//   done
//
// WORDING CONSTRAINT — money. Escrow left this codebase. Nothing here may say a backer "paid",
// "funded" or "escrowed" anything: a commitment is a commitment, and a month-end statement is a
// statement. Likewise effort logging mints a Slicing Pie CLAIM on the split, never a payout.

/** One working destination a capability lives on. Rendered as a chip. */
export interface CapabilityRoute {
  readonly label: string;
  readonly href: string;
}

/** One thing a reader can do. `action` is a verb phrase — it is the sentence they came to read. */
export interface RoadmapCapability {
  readonly action: string;
  readonly summary: string;
  /** Empty for a capability that lives on a dynamic segment — `summary` carries the route instead. */
  readonly routes: readonly CapabilityRoute[];
}

/** One reader. `id` doubles as the `#anchor` a jump-nav can target. */
export interface RoadmapAudience {
  readonly id: string;
  readonly headline: string;
  readonly summary: string;
  readonly capabilities: readonly RoadmapCapability[];
}

export const ROADMAP_AUDIENCES: readonly RoadmapAudience[] = [
  {
    id: "have-an-idea",
    headline: "If you have an idea",
    summary:
      "The pipeline starts with a problem worth solving, not a deck. You need the concept and the conviction to lead it — not capital, and not a team you already know.",
    capabilities: [
      {
        action: "Post the problem you want solved",
        summary:
          "A four-step wizard that asks for the problem before it asks for your solution. It lands on the pipeline where people can find it and apply to it.",
        routes: [{ label: "Post an idea", href: "/research-and-development/new" }],
      },
      {
        action: "Find a problem already worth working on",
        summary:
          "Civic Pulse clusters real reports by theme and region. A cluster marked as a gap is one nobody has claimed — that signal is computed nightly, never self-declared.",
        routes: [{ label: "Problem map", href: "/research-and-development/problem-map" }],
      },
      {
        action: "Check the prior art before you commit",
        summary:
          "Market research, papers and prior art, so the first month is not spent rediscovering what someone already published.",
        routes: [{ label: "Knowledge hub", href: "/research-and-development/knowledge-hub" }],
      },
      {
        action: "Propose a whole research programme",
        summary:
          "Bigger than one project. Anyone with a full account may propose one; it lands pending and a moderator publishes it.",
        routes: [
          { label: "Research programmes", href: "/research-and-development/programs" },
          { label: "Propose a programme", href: "/research-and-development/programs/new" },
        ],
      },
      {
        action: "Recruit the people who finish things",
        summary:
          "Open your roles on the team board, or go the other way and approach someone from the talent directory.",
        routes: [
          { label: "Team building", href: "/research-and-development/team-building" },
          { label: "Talent", href: "/research-and-development/talent" },
        ],
      },
    ],
  },
  {
    id: "join-a-build",
    headline: "If you want to join a build",
    summary:
      "Engineers, operators, domain specialists and hobbyists join projects they did not start. Contribution is logged, and the log is what the split is argued from.",
    capabilities: [
      {
        action: "Browse every open role, role-first",
        summary:
          "Every project currently short a person, listed by the role rather than the pitch.",
        routes: [{ label: "Team building", href: "/research-and-development/team-building" }],
      },
      {
        action: "List what you have shipped, and what you want in return",
        summary:
          "The talent directory is people-first: skill offered, terms wanted. Founders search it directly.",
        routes: [{ label: "Talent", href: "/research-and-development/talent" }],
      },
      {
        action: "Track the roles you applied for",
        summary: "Applications you sent and invitations you received, in one place.",
        routes: [{ label: "Your applications", href: "/research-and-development/applications" }],
      },
      {
        action: "Work in the project's shared space",
        summary:
          "Each project has a virtual workshop and a daily log. Open a project card from the build log, then its Workshop tab.",
        routes: [{ label: "Build log", href: "/research-and-development/build-log" }],
      },
      {
        action: "Log effort and claim your share of the split",
        summary:
          "The Slicing Pie ledger on a project's Proof of effort tab — a claim is submitted, re-verified, and only then counted. A submitted claim is not yet a verdict.",
        routes: [],
      },
    ],
  },
  {
    id: "back-a-project",
    headline: "If you want to back a project",
    summary:
      "Deal flow you can read the daily work behind. Visibility here is continuous rather than quarterly — the build log is the disclosure.",
    capabilities: [
      {
        action: "See which projects are looking for capital",
        summary: "Deal flow across the pipeline, with what each project is asking for.",
        routes: [{ label: "Funding", href: "/research-and-development/funding" }],
      },
      {
        action: "Read the commitments and month-end statements",
        summary:
          "What has been committed to a project and what the statement says at month end. A commitment is a commitment — no money rail runs through this codebase.",
        routes: [{ label: "Governance", href: "/research-and-development/governance" }],
      },
      {
        action: "Watch the work before you decide",
        summary:
          "The daily-log feed across every active project. Progress, blockers and dead ends, posted as they happen.",
        routes: [{ label: "Build log", href: "/research-and-development/build-log" }],
      },
    ],
  },
  {
    id: "here-to-watch",
    headline: "If you are just here to watch",
    summary:
      "The feed is the front door, and browsing needs no account. Every project on the pipeline publishes here, so watching is how most people first meet an idea.",
    capabilities: [
      {
        action: "Watch what is being built right now",
        summary: "The home feed, newest first, with the player one click off any card.",
        routes: [
          { label: "Home feed", href: "/" },
          { label: "Watch", href: "/watch" },
        ],
      },
      {
        action: "Search across everything at once",
        summary: "Videos, projects, people and products in a single query.",
        routes: [{ label: "Search", href: "/search" }],
      },
      {
        action: "Browse the anime hub",
        summary:
          "Its own player and rails — what aired today, by genre, ranked by watch signal, and the titles you saved.",
        routes: [
          { label: "Anime", href: "/anime" },
          { label: "Daily", href: "/anime/daily" },
          { label: "Genre", href: "/anime/genre" },
          { label: "Ranking", href: "/anime/ranking" },
          { label: "Favourites", href: "/anime/favorite" },
        ],
      },
      {
        action: "Keep what you found",
        summary: "Playlists, likes and bookmarks in your library; watch history kept for 90 days.",
        routes: [
          { label: "Library", href: "/library" },
          { label: "History", href: "/history" },
        ],
      },
    ],
  },
  {
    id: "here-to-research",
    headline: "If you are here to research",
    summary:
      "Long-horizon work that does not fit a launch date. Programmes carry branch maps whose gaps and duplicated effort are derived nightly, not claimed by whoever is loudest.",
    capabilities: [
      {
        action: "Read the market research and prior art",
        summary: "Papers, market work and prior art, gathered per problem rather than per project.",
        routes: [{ label: "Knowledge hub", href: "/research-and-development/knowledge-hub" }],
      },
      {
        action: "Find an unworked branch of a programme",
        summary:
          "Each programme is a branch map. A branch marked missing is a gap nobody is on; one flagged as overlapping means several groups are duplicating each other.",
        routes: [{ label: "Research programmes", href: "/research-and-development/programs" }],
      },
      {
        action: "Follow Project Immortal",
        summary:
          "The long-horizon wing — immortality, energy, teleportation — as one programme among the rest rather than a page of its own.",
        routes: [
          {
            label: "Project Immortal",
            href: "/research-and-development/projects/project-immortal",
          },
        ],
      },
      {
        action: "Ground the work in reported demand",
        summary:
          "Civic Pulse is where the problems come from: geo-tagged reports clustered by theme, with who is already working on each.",
        routes: [{ label: "Problem map", href: "/research-and-development/problem-map" }],
      },
    ],
  },
  {
    id: "want-to-buy",
    headline: "If you want to buy",
    summary:
      "The Store is where a shipped product lands. Everything the pipeline finishes is sold here, alongside services from providers on the platform.",
    capabilities: [
      {
        action: "Browse and search the catalogue",
        summary:
          "Products, services and providers. Filtering and pagination happen server-side, so a deep category is as fast as a shallow one.",
        routes: [
          { label: "Store", href: "/store" },
          { label: "Store search", href: "/store/search" },
          { label: "Categories", href: "/store/categories" },
        ],
      },
      {
        action: "Follow a curated pathway",
        summary: "Pathways group what you need for one outcome instead of one product at a time.",
        routes: [{ label: "Pathways", href: "/store/pathways" }],
      },
      {
        action: "Hire a service provider",
        summary: "Providers and their offerings, quoted and engaged on platform.",
        routes: [{ label: "Service providers", href: "/store/providers" }],
      },
      {
        action: "Check out and track the order",
        summary:
          "Cart, checkout, wishlist, then orders and returns. An order's own page carries its shipping and return state.",
        routes: [
          { label: "Cart", href: "/cart" },
          { label: "Checkout", href: "/checkout" },
          { label: "Wishlist", href: "/wishlist" },
          { label: "Orders and returns", href: "/orders-and-returns" },
        ],
      },
      {
        action: "Raise it when something goes wrong",
        summary:
          "Message the seller, or open a dispute. A raised dispute answers that it has been received — the verdict comes after review, not on submit.",
        routes: [
          { label: "Messages", href: "/messages" },
          { label: "Disputes", href: "/disputes" },
        ],
      },
      {
        action: "Say how it went",
        summary:
          "Everything of yours that has completed, and the one review you get to leave on each — with photos or a video if you have them.",
        routes: [{ label: "Reviews you can leave", href: "/orders-and-returns/reviews" }],
      },
    ],
  },
  {
    id: "need-it-manufactured",
    headline: "If you need something made",
    summary:
      "The sourcing side of the Store. A project that reaches manufacturing does not leave the platform to find a factory.",
    capabilities: [
      {
        action: "Find a factory with the right capability",
        summary: "Capability, capacity and record per factory, then an inquiry thread with them.",
        routes: [
          { label: "Factories", href: "/store/factories" },
          { label: "Your factory inquiries", href: "/store/factory-inquiries" },
        ],
      },
      {
        action: "Raise an RFQ and compare what comes back",
        summary:
          "One request, many quotes, compared side by side rather than in a spreadsheet you maintain yourself.",
        routes: [
          { label: "RFQs", href: "/store/rfqs" },
          { label: "Raise an RFQ", href: "/store/rfqs/new" },
        ],
      },
      {
        action: "Buy as a business",
        summary: "The business tools surface — buying at volume rather than one unit at a time.",
        routes: [{ label: "Business tools", href: "/store/business" }],
      },
      {
        action: "Find a co-founder or ask the forum first",
        summary:
          "Sourcing questions, supplier experience and co-founder posts from people who have already shipped a unit.",
        routes: [
          { label: "Forum", href: "/store/forum" },
          { label: "Find a co-founder", href: "/store/find-cofounder" },
        ],
      },
    ],
  },
  {
    id: "want-to-sell",
    headline: "If you want to sell or create",
    summary:
      "Studio is the other side of every buyer surface — list what you make, answer the RFQs that arrive, and publish the video that sells it.",
    capabilities: [
      {
        action: "List a product or a service",
        summary: "Create it once in Studio and it appears everywhere the Store surfaces it.",
        routes: [
          { label: "Studio", href: "/studio" },
          { label: "Products", href: "/studio/products" },
          { label: "Create a product", href: "/studio/products/create" },
          { label: "Create a service", href: "/studio/services/create" },
        ],
      },
      {
        action: "Fulfil what sells",
        summary: "Incoming orders, their detail pages, and the logistics surface behind them.",
        routes: [
          { label: "Orders", href: "/studio/orders" },
          { label: "Logistics", href: "/studio/logistics" },
          { label: "Sales", href: "/sales" },
        ],
      },
      {
        action: "Quote the RFQs that arrive",
        summary:
          "Incoming requests, the quote you return, and every bid you have authored — including the ones you started and have not submitted.",
        routes: [
          { label: "Incoming RFQs", href: "/studio/rfqs" },
          { label: "Your quotes", href: "/studio/quotes" },
          { label: "Factory profile", href: "/studio/factory-profile" },
        ],
      },
      {
        action: "Publish the video that sells it",
        summary:
          "Your videos, series and playlists — the same studio you coordinated the build in.",
        routes: [
          { label: "Your videos", href: "/studio/videos" },
          { label: "Series", href: "/studio/series" },
          { label: "Playlists", href: "/studio/playlists" },
        ],
      },
      {
        action: "Say what your channel is about",
        summary:
          "The description and links visitors read in the About panel on your channel, beside your join date and your counts.",
        routes: [{ label: "Customise", href: "/studio/customize" }],
      },
      {
        action: "Answer what buyers said about you",
        summary:
          "Every review of your organization, and the one reply you get to each — revisable once, within 30 days.",
        routes: [{ label: "Reviews", href: "/studio/reviews" }],
      },
      {
        action: "Answer what buyers asked",
        summary:
          "Every question asked on a product you sell, oldest first, with the ones still waiting on you filtered out from the rest.",
        routes: [{ label: "Questions", href: "/studio/questions" }],
      },
      {
        action: "Read the numbers",
        summary:
          "Reach and engagement across your videos, and every comment on them in one place. Earnings, subtitles and copyright have routes in Studio but are still placeholders — on the map, not yet in your hands.",
        routes: [
          { label: "Analytics", href: "/studio/analytics" },
          { label: "Comments", href: "/studio/comments" },
        ],
      },
    ],
  },
];
