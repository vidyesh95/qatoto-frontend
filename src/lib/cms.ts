import { z } from "zod";

/**
 * THE MARKETING CMS BOUNDARY.
 *
 * ⚠️ EVERY SHAPE HERE IS PARSED, NOT CAST. `cmsFetch` used to do `const data: T = await res.json()`
 * — a bare assertion on a payload from whatever host `QATOTO_CMS_URL` names. That is the Pattern 2
 * violation CLAUDE.md rules out by name, and it sat directly upstream of a `dangerouslySetInnerHTML`
 * in `blog-detail.tsx` and `press-detail.tsx`. Both halves are closed: the payload is parsed here,
 * and the body renders through `ArticleMarkdown` instead of an HTML sink.
 *
 * ⚠️ THE SCHEMAS ARE DELIBERATELY PERMISSIVE ABOUT FORMATS AND STRICT ABOUT SHAPE. `slug`,
 * `publishedAt` and `body` are plain `z.string()`: a slug regex or a `z.iso.datetime()` would turn a
 * CMS that formats a date differently into a silent fall back to the invented articles below, which
 * is a worse failure than rendering the date it sent. Shape is what is worth refusing — a missing
 * `title` or an unknown `category` is a payload no component can render.
 *
 * `z.object` strips unknown keys, so a CMS that adds a field in a minor release does not break the
 * site.
 */
const AuthorSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  avatar: z.string().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;

const BlogPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  /**
   * ⚠️ GFM MARKDOWN, NOT HTML. It renders through `ArticleMarkdown`, which drops raw HTML
   * (`skipHtml`), unwraps anything outside its element allowlist, and filters every link address.
   * **Images in a body are not rendered** — an article's image is `coverImage` — because a body
   * image arrives with no dimensions and would shift the page as it loads.
   */
  body: z.string(),
  category: z.enum(["tips", "how-to", "guide", "deep-dive", "story"]),
  coverImage: z.string().optional(),
  author: AuthorSchema,
  publishedAt: z.string(),
  readingMinutes: z.number(),
  tags: z.array(z.string()),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;

const PressItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** GFM Markdown, not HTML — see `BlogPostSchema.body`. */
  body: z.string(),
  kind: z.enum(["announcement", "release", "milestone", "media"]),
  coverImage: z.string().optional(),
  publishedAt: z.string(),
  source: z.object({ name: z.string(), url: z.string().optional() }).optional(),
  tags: z.array(z.string()),
});

export type PressItem = z.infer<typeof PressItemSchema>;

const CMS_URL = process.env.QATOTO_CMS_URL;

/**
 * One CMS read, parsed.
 *
 * The parameter order mirrors `getJson(path, dataSchema, options)` in `src/lib/http.ts`. It is NOT
 * that helper, on purpose: `getJson` resolves against the Express API origin, expects that API's
 * `{ data: … }` envelope and returns an `ActionResponse`. This speaks bare JSON to a third-party
 * CMS, and `src/lib/sitemap-sources.ts` already records that these reads must not be routed through
 * `server-http.ts`.
 *
 * ⚠️ A FAILED PARSE RETURNS `null`, WHICH MEANS THE CALLER SERVES THE MOCKS. That is the same
 * outcome a non-2xx or a network error already produced, so the fallback is not new — but note what
 * it will mean once a real CMS is live: a malformed upstream publishes the invented articles below
 * under the company's name. That deserves its own decision (`todo.md`), not a quiet change here.
 */
async function cmsFetch<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  if (!CMS_URL) return null;
  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getBlogs(): Promise<BlogPost[]> {
  "use cache";
  const remote = await cmsFetch("/blogs", z.array(BlogPostSchema));
  return remote ?? MOCK_BLOGS;
}

export async function getBlog(slug: string): Promise<BlogPost | null> {
  "use cache";
  const remote = await cmsFetch(`/blogs/${encodeURIComponent(slug)}`, BlogPostSchema);
  if (remote) return remote;
  return MOCK_BLOGS.find((p) => p.slug === slug) ?? null;
}

export async function getPressList(): Promise<PressItem[]> {
  "use cache";
  const remote = await cmsFetch("/press", z.array(PressItemSchema));
  return remote ?? MOCK_PRESS;
}

export async function getPressItem(slug: string): Promise<PressItem | null> {
  "use cache";
  const remote = await cmsFetch(`/press/${encodeURIComponent(slug)}`, PressItemSchema);
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
    body: `The first thing a great pitch does is filter. It tells a CTO whether to spend an hour on it. It tells a CFO whether the unit economics could ever clear. It tells a hobbyist whether their weekend obsession finally has a shipping address.

## Lead with the problem, not the product

Open with the pain in one sentence. Who feels it, how often, how much it costs them. If your pitch starts with "we built", rewrite it.

## Name the wedge

Where does the world give you a foothold? A regulation that just changed, a supply curve that flipped, a capability that became cheap. Without a wedge, your pitch is a wish.

## Show the team-shaped hole

Be explicit: "I'm the founder. I need a CTO with embedded systems chops, a CFO who has run a hardware raise, and two firmware engineers." Vagueness loses you a week.

## Commit to the update wall

Promise daily public updates from day one. The teams that ship on Qatoto are the ones whose investors never have to ask "what happened this week?"`,
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
    body: `The update wall is the contract between a team and its capital. Treat it that way.

## 1. One screen, not three

If your update needs scrolling, it isn't an update — it's a memo. Keep it tight: shipped, blocked, next.

## 2. Lead with what broke

Backers respect bad news posted early far more than good news posted late.

## 3. Link the artifact

A commit, a CAD render, a contract draft. Words without artifacts decay into vibes.

## 4. Tag the blocker, name the unblocker

"Blocked on FCC pre-cert paperwork — need @ravi by Wed." The AI will pick this up and route it.

## 5. End with the ask

Money, intros, decisions. Your investors are sitting on networks; let them spend.`,
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
    body: `Qatoto runs three fundraise rails on the same console. They aren't equivalent.

## Crowdfund

Best for hardware with a clear physical product and an audience. Slow capital, but the backers become customers.

## Equity round

Best for software-heavy or long-arc projects. Fewer cheques, larger sizes, real diligence.

## Direct VC

Best when there is a credible exit path inside 5–7 years and the team is already operator-grade. Highest velocity, highest dilution.

Mix and match — many Qatoto projects open a small crowdfund alongside an equity round to lock in early demand signal.`,
    category: "guide",
    author: { name: "Jin Park", role: "Capital" },
    publishedAt: "2026-03-30",
    readingMinutes: 7,
    tags: ["funding", "founders"],
  },
  {
    slug: "teardowns-as-r-and-d-input",
    title: "Why we treat teardowns as a real R&D input",
    excerpt:
      "Somebody already solved half your problem and shipped it. Opening it up is the cheapest research you will ever do.",
    body: `The Blueprints hub on Qatoto isn't a gallery. It's a low-cost, high-bandwidth channel for design intelligence.

A well-documented teardown is a design brief in reverse: part selection, tolerances, the bill of materials, and the compromises somebody already paid for. Many of our most surprising hardware projects started with a photograph of a board.

## How to use it

Publish the schematic, the CAD, and the costed BOM. Add a one-line "what would it take to build this here?" The platform routes it to teams hunting for product seeds.`,
    category: "story",
    author: { name: "Nikhil Rao", role: "Hardware R&D" },
    publishedAt: "2026-03-12",
    readingMinutes: 5,
    tags: ["r&d", "teardowns", "ideation"],
  },
];

const MOCK_PRESS: PressItem[] = [
  {
    slug: "qatoto-launches-build-console-v2",
    title: "Qatoto launches Build Console v2 with AI blocker triage",
    summary:
      "The new build console ingests EOD updates across every project and surfaces blockers before they compound.",
    body: `Today Qatoto is rolling out Build Console v2 to every active team on the platform. The release brings AI-driven blocker triage, automatic workflow re-sequencing suggestions, and a new investor-facing update wall.

## What's new

- **Blocker triage** — AI reads every EOD update and flags items that have been stuck for more than 48 hours.
- **Suggested re-sequencing** — when two tasks contend for the same resource, the console proposes an order.
- **Investor wall** — backers see the same daily updates the team posts to, with no edit layer in between.

Build Console v2 is available to all teams from today.`,
    kind: "release",
    publishedAt: "2026-05-05",
    tags: ["product", "ai", "build"],
  },
  {
    slug: "project-immortal-research-grants",
    title: "Project Immortal opens its first cohort of research grants",
    summary:
      "Qatoto's long-horizon research wing announces funding for early-stage work in cellular senescence, fusion containment, and entanglement transport.",
    body: `Project Immortal — Qatoto's long-horizon research wing — is opening its first cohort of research grants this quarter. The programme will fund early-stage work across three pillars: longevity, energy, and teleportation.

## Application timeline

Applications open today and close on June 30, 2026. The first cohort will be announced in August, with funding disbursing on a milestone-linked schedule via the Qatoto project ledger.`,
    kind: "announcement",
    publishedAt: "2026-04-28",
    tags: ["research", "grants"],
  },
  {
    slug: "civic-problem-map-india-pilot",
    title: "Civic problem map enters India pilot with three state partners",
    summary:
      "Geo-tagged citizen reports for missing roads, drinking water access, and infrastructure gaps now feed civic-tech projects on Qatoto.",
    body: `Qatoto's civic problem map is entering a structured pilot across three Indian states. Citizen-submitted, geo-tagged reports for infrastructure gaps will route to civic-tech project teams on the platform.

Reports are visible publicly. Project teams can claim them, scope them, and pull funding through the standard Qatoto fundraise rails.`,
    kind: "milestone",
    publishedAt: "2026-04-10",
    tags: ["civic", "pilot"],
  },
  {
    slug: "qatoto-store-clears-100-shipped-products",
    title: "Qatoto Store crosses 100 shipped products",
    summary:
      "The fulfilment, compliance, and support layer behind every Qatoto build has now shipped 100 distinct products to market.",
    body: `Qatoto Store — the compliance, fulfilment, and customer-support layer behind every project on the platform — has now shipped 100 distinct products to market across hardware, civic tools, and consumer goods.`,
    kind: "milestone",
    publishedAt: "2026-03-18",
    tags: ["store", "milestone"],
  },
];
