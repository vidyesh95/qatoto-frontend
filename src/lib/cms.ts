export type Author = {
  name: string;
  role?: string;
  avatar?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: "tips" | "how-to" | "guide" | "deep-dive" | "story";
  coverImage?: string;
  author: Author;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
};

export type PressItem = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  kind: "announcement" | "release" | "milestone" | "media";
  coverImage?: string;
  publishedAt: string;
  source?: { name: string; url?: string };
  tags: string[];
};

const CMS_URL = process.env.QATOTO_CMS_URL;

async function cmsFetch<T>(path: string): Promise<T | null> {
  if (!CMS_URL) return null;
  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: T = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function getBlogs(): Promise<BlogPost[]> {
  "use cache";
  const remote = await cmsFetch<BlogPost[]>("/blogs");
  return remote ?? MOCK_BLOGS;
}

export async function getBlog(slug: string): Promise<BlogPost | null> {
  "use cache";
  const remote = await cmsFetch<BlogPost>(`/blogs/${encodeURIComponent(slug)}`);
  if (remote) return remote;
  return MOCK_BLOGS.find((p) => p.slug === slug) ?? null;
}

export async function getPressList(): Promise<PressItem[]> {
  "use cache";
  const remote = await cmsFetch<PressItem[]>("/press");
  return remote ?? MOCK_PRESS;
}

export async function getPressItem(slug: string): Promise<PressItem | null> {
  "use cache";
  const remote = await cmsFetch<PressItem>(`/press/${encodeURIComponent(slug)}`);
  if (remote) return remote;
  return MOCK_PRESS.find((p) => p.slug === slug) ?? null;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const MOCK_BLOGS: BlogPost[] = [
  {
    slug: "how-to-pitch-on-qatoto",
    title: "How to pitch an idea on Qatoto that attracts a team",
    excerpt:
      "A founder pitch is not a deck — it's a hiring magnet. Here's the structure that pulls operators, engineers, and capital into the same room.",
    body: `<p>The first thing a great pitch does is filter. It tells a CTO whether to spend an hour on it. It tells a CFO whether the unit economics could ever clear. It tells a hobbyist whether their weekend obsession finally has a shipping address.</p>
<h2>Lead with the problem, not the product</h2>
<p>Open with the pain in one sentence. Who feels it, how often, how much it costs them. If your pitch starts with "we built", rewrite it.</p>
<h2>Name the wedge</h2>
<p>Where does the world give you a foothold? A regulation that just changed, a supply curve that flipped, a capability that became cheap. Without a wedge, your pitch is a wish.</p>
<h2>Show the team-shaped hole</h2>
<p>Be explicit: "I'm the founder. I need a CTO with embedded systems chops, a CFO who has run a hardware raise, and two firmware engineers." Vagueness loses you a week.</p>
<h2>Commit to the update wall</h2>
<p>Promise daily public updates from day one. The teams that ship on Qatoto are the ones whose investors never have to ask "what happened this week?"</p>`,
    category: "how-to",
    author: { name: "Maya Iyer", role: "Founder Programs" },
    publishedAt: "2026-04-22",
    readingMinutes: 6,
    tags: ["pitch", "founders", "team"],
  },
  {
    slug: "five-tips-for-eod-updates",
    title: "Five tips for an EOD update that investors actually read",
    excerpt:
      "End-of-day updates are the heartbeat of a Qatoto project. Make yours scannable, honest, and load-bearing.",
    body: `<p>The update wall is the contract between a team and its capital. Treat it that way.</p>
<h2>1. One screen, not three</h2>
<p>If your update needs scrolling, it isn't an update — it's a memo. Keep it tight: shipped, blocked, next.</p>
<h2>2. Lead with what broke</h2>
<p>Backers respect bad news posted early far more than good news posted late.</p>
<h2>3. Link the artifact</h2>
<p>A commit, a CAD render, a contract draft. Words without artifacts decay into vibes.</p>
<h2>4. Tag the blocker, name the unblocker</h2>
<p>"Blocked on FCC pre-cert paperwork — need @ravi by Wed." The AI will pick this up and route it.</p>
<h2>5. End with the ask</h2>
<p>Money, intros, decisions. Your investors are sitting on networks; let them spend.</p>`,
    category: "tips",
    author: { name: "Ravi Bhatt", role: "Build Operations" },
    publishedAt: "2026-04-15",
    readingMinutes: 4,
    tags: ["build", "ops", "investors"],
  },
  {
    slug: "fundraising-paths-on-qatoto",
    title: "Crowdfund, equity round, or direct VC: which path on Qatoto",
    excerpt:
      "Three rails, three trade-offs. A short guide to picking the right capital structure for your pitch.",
    body: `<p>Qatoto runs three fundraise rails on the same console. They aren't equivalent.</p>
<h2>Crowdfund</h2>
<p>Best for hardware with a clear physical product and an audience. Slow capital, but the backers become customers.</p>
<h2>Equity round</h2>
<p>Best for software-heavy or long-arc projects. Fewer cheques, larger sizes, real diligence.</p>
<h2>Direct VC</h2>
<p>Best when there is a credible exit path inside 5–7 years and the team is already operator-grade. Highest velocity, highest dilution.</p>
<p>Mix and match — many Qatoto projects open a small crowdfund alongside an equity round to lock in early demand signal.</p>`,
    category: "guide",
    author: { name: "Jin Park", role: "Capital" },
    publishedAt: "2026-03-30",
    readingMinutes: 7,
    tags: ["funding", "founders"],
  },
  {
    slug: "anime-as-r-and-d-input",
    title: "Why we treat anime as a real R&D input",
    excerpt:
      "Fictional devices, fictional fashion, fictional cities — every once in a while one of them is a product brief in disguise.",
    body: `<p>The anime feed on Qatoto isn't entertainment. It's a low-cost, high-bandwidth channel for design fiction.</p>
<p>A well-tagged frame can become a design brief: silhouette, materials, motion language, payload. Many of our most surprising hardware projects started with a screenshot.</p>
<h2>How to use it</h2>
<p>Tag clips with the device or garment you noticed. Add a one-line "what would it take to build this?" The platform routes it to teams hunting for product seeds.</p>`,
    category: "story",
    author: { name: "Nikhil Rao", role: "Anime R&D" },
    publishedAt: "2026-03-12",
    readingMinutes: 5,
    tags: ["r&d", "anime", "ideation"],
  },
];

const MOCK_PRESS: PressItem[] = [
  {
    slug: "qatoto-launches-build-console-v2",
    title: "Qatoto launches Build Console v2 with AI blocker triage",
    summary:
      "The new build console ingests EOD updates across every project and surfaces blockers before they compound.",
    body: `<p>Today Qatoto is rolling out Build Console v2 to every active team on the platform. The release brings AI-driven blocker triage, automatic workflow re-sequencing suggestions, and a new investor-facing update wall.</p>
<h2>What's new</h2>
<ul>
<li><strong>Blocker triage</strong> — AI reads every EOD update and flags items that have been stuck for more than 48 hours.</li>
<li><strong>Suggested re-sequencing</strong> — when two tasks contend for the same resource, the console proposes an order.</li>
<li><strong>Investor wall</strong> — backers see the same daily updates the team posts to, with no edit layer in between.</li>
</ul>
<p>Build Console v2 is available to all teams from today.</p>`,
    kind: "release",
    publishedAt: "2026-05-05",
    tags: ["product", "ai", "build"],
  },
  {
    slug: "project-immortal-research-grants",
    title: "Project Immortal opens its first cohort of research grants",
    summary:
      "Qatoto's long-horizon research wing announces funding for early-stage work in cellular senescence, fusion containment, and entanglement transport.",
    body: `<p>Project Immortal — Qatoto's long-horizon research wing — is opening its first cohort of research grants this quarter. The program will fund early-stage work across three pillars: longevity, energy, and teleportation.</p>
<h2>Application timeline</h2>
<p>Applications open today and close on June 30, 2026. The first cohort will be announced in August, with funding disbursing on a milestone-linked schedule via the Qatoto project ledger.</p>`,
    kind: "announcement",
    publishedAt: "2026-04-28",
    tags: ["research", "grants"],
  },
  {
    slug: "civic-problem-map-india-pilot",
    title: "Civic problem map enters India pilot with three state partners",
    summary:
      "Geo-tagged citizen reports for missing roads, drinking water access, and infrastructure gaps now feed civic-tech projects on Qatoto.",
    body: `<p>Qatoto's civic problem map is entering a structured pilot across three Indian states. Citizen-submitted, geo-tagged reports for infrastructure gaps will route to civic-tech project teams on the platform.</p>
<p>Reports are visible publicly. Project teams can claim them, scope them, and pull funding through the standard Qatoto fundraise rails.</p>`,
    kind: "milestone",
    publishedAt: "2026-04-10",
    tags: ["civic", "pilot"],
  },
  {
    slug: "qatoto-store-clears-100-shipped-products",
    title: "Qatoto Store crosses 100 shipped products",
    summary:
      "The fulfilment, compliance, and support layer behind every Qatoto build has now shipped 100 distinct products to market.",
    body: `<p>Qatoto Store — the compliance, fulfilment, and customer-support layer behind every project on the platform — has now shipped 100 distinct products to market across hardware, civic tools, and consumer goods.</p>`,
    kind: "milestone",
    publishedAt: "2026-03-18",
    tags: ["store", "milestone"],
  },
];
