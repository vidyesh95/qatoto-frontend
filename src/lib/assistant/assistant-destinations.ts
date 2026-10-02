// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// WHERE THE ASSISTANT MAY SEND SOMEONE, BY KEY.
//
// The language model never writes a URL. It sees these keys and their one-line descriptions, and it
// answers with a key or with null. Its output is constrained to this enum (Chrome's
// `responseConstraint` on the device, Gemini's `responseSchema` in the cloud) and then parsed again
// with Zod, so a route that does not exist cannot reach the screen: a hallucinated key fails the
// parse and is dropped. The link is rendered as a chip the viewer clicks, never as a navigation the
// assistant performs.
//
// EVERY `href` MUST BE A ROUTE THAT WORKS. The same drift check `site-capabilities.ts` uses applies:
//
//   rg -o 'href: "(/[^"]*)"' -r '$1' src/lib/assistant/assistant-destinations.ts | sort -u | while read -r p; do
//     ls src/app/*/"${p#/}"/page.tsx >/dev/null 2>&1 || [ "$p" = "/" ] || echo "DEAD $p"
//   done
//
// The backend keeps its own copy of the key tuple (`src/modules/assistant/assistant.prompt.ts` in
// qatoto-backend). A key only one side knows is dropped by the other side's parse, so drift fails
// safe — it costs a link, never a wrong one.

export const ASSISTANT_DESTINATION_KEYS = [
  "home_feed",
  "search_everything",
  "browse_store",
  "search_store",
  "store_categories",
  "open_cart",
  "your_orders",
  "wishlist",
  "find_factories",
  "request_quote",
  "trade_services",
  "find_cofounder",
  "business_forum",
  "explore_blueprints",
  "teardowns",
  "showcase",
  "case_studies",
  "post_an_idea",
  "problem_map",
  "market_research",
  "research_programs",
  "team_building",
  "talent",
  "funding",
  "build_log",
  "governance",
  "library",
  "watch_history",
  "messages",
  "creator_studio",
  "sell_a_product",
  "roadmap",
  "customer_service",
] as const;

export type AssistantDestinationKey = (typeof ASSISTANT_DESTINATION_KEYS)[number];

export interface AssistantDestination {
  readonly label: string;
  readonly href: string;
  /** What the model reads to decide whether this is where the viewer wants to go. */
  readonly description: string;
}

export const ASSISTANT_DESTINATIONS: Record<AssistantDestinationKey, AssistantDestination> = {
  home_feed: { label: "Home feed", href: "/", description: "Newest videos from every project." },
  search_everything: {
    label: "Search",
    href: "/search",
    description: "Search videos, projects, people and products at once.",
  },
  browse_store: { label: "Store", href: "/store", description: "The B2B store front page." },
  search_store: {
    label: "Search the store",
    href: "/store/search",
    description: "Search and filter products, factories and service providers.",
  },
  store_categories: {
    label: "Categories",
    href: "/store/categories",
    description: "Browse store products by category.",
  },
  open_cart: { label: "Cart", href: "/cart", description: "The viewer's shopping cart." },
  your_orders: {
    label: "Orders and returns",
    href: "/orders-and-returns",
    description: "Orders the viewer placed, their payment and shipping, returns and refunds.",
  },
  wishlist: { label: "Wishlist", href: "/wishlist", description: "Products the viewer saved." },
  find_factories: {
    label: "Factories",
    href: "/store/factories",
    description: "Directory of manufacturers and factories to send an inquiry to.",
  },
  request_quote: {
    label: "Request a quote",
    href: "/store/rfqs/new",
    description: "Write a request for quotation that sellers answer.",
  },
  trade_services: {
    label: "Trade services",
    href: "/store/providers",
    description: "Logistics, freight, customs and other trade service providers.",
  },
  find_cofounder: {
    label: "Find a cofounder",
    href: "/store/find-cofounder",
    description: "Profiles of people looking for a cofounder.",
  },
  business_forum: {
    label: "Business forum",
    href: "/store/forum",
    description: "Discussion threads between buyers, sellers and makers.",
  },
  explore_blueprints: {
    label: "Blueprints",
    href: "/blueprints",
    description: "Engineering teardowns, launched prototypes and manufacturing case studies.",
  },
  teardowns: {
    label: "Teardowns",
    href: "/blueprints/teardowns",
    description: "Surveys of commercial products: parts, materials and bill-of-materials cost.",
  },
  showcase: {
    label: "Showcase",
    href: "/blueprints/showcase",
    description: "Launches of working prototypes people built.",
  },
  case_studies: {
    label: "Case studies",
    href: "/blueprints/case-studies",
    description: "Manufacturing lessons, one action each.",
  },
  post_an_idea: {
    label: "Post an idea",
    href: "/research-and-development/new",
    description: "Post a problem worth solving and start a project.",
  },
  problem_map: {
    label: "Problem map",
    href: "/research-and-development/problem-map",
    description: "Real reported problems clustered by theme and region.",
  },
  market_research: {
    label: "Knowledge hub",
    href: "/research-and-development/market-research",
    description: "Market research, papers and prior art.",
  },
  research_programs: {
    label: "Research programmes",
    href: "/research-and-development/programs",
    description: "Larger research programmes made of many branches of work.",
  },
  team_building: {
    label: "Team building",
    href: "/research-and-development/team-building",
    description: "Open roles on projects, listed role first.",
  },
  talent: {
    label: "Talent",
    href: "/research-and-development/talent",
    description: "People offering their skills to projects.",
  },
  funding: {
    label: "Funding",
    href: "/research-and-development/funding",
    description: "Projects looking for capital.",
  },
  build_log: {
    label: "Build log",
    href: "/research-and-development/build-log",
    description: "Daily updates from every active project.",
  },
  governance: {
    label: "Governance",
    href: "/research-and-development/governance",
    description: "Commitments to projects and month-end statements.",
  },
  library: {
    label: "Library",
    href: "/library",
    description: "The viewer's playlists, likes and saved videos.",
  },
  watch_history: {
    label: "History",
    href: "/history",
    description: "Videos the viewer already watched. Not where to find a video they have not seen.",
  },
  messages: { label: "Messages", href: "/messages", description: "The viewer's conversations." },
  creator_studio: {
    label: "Studio",
    href: "/studio",
    description: "Where creators and sellers manage videos, products and sales.",
  },
  sell_a_product: {
    label: "List a product",
    href: "/studio/products/create",
    description: "Create a product listing to sell in the store.",
  },
  roadmap: {
    label: "Roadmap",
    href: "/roadmap",
    description: "What Qatoto can do today, grouped by who you are.",
  },
  customer_service: {
    label: "Customer service",
    href: "/customer-service",
    description: "Help with an account, an order or a problem with the site.",
  },
};
