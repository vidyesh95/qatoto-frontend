# MVP focus plan: step by step

_Written 2026-11-03. Builds on `PRODUCT_REVIEW.md` (what to add, change and remove) and
`FOCUS_AREAS_RESEARCH.md` (proof of work and product R&D). Do **one step at a time**: finish it,
check it, then start the next._

> **Updated 2026-11-06, read this first.** The goal changed from 3 to 5 pilot teams to as many real
> users as possible, so the order below changed:
>
> - **Team formation is the front door.** Proof of effort is what teams use after they form. It is
>   not what the site advertises.
> - **Steps 1 and 2 are done** in beta form. Everything hidden is marked `HIDDEN-FOR-BETA`, so
>   `rg HIDDEN-FOR-BETA` lists what to restore. The beta menu also hides Funding, Factories and
>   Market Research, because they have no data on an empty database.
> - **Build Seasons come next.** A six-week public cohort: join, form a team in week 1, log your
>   work, show a prototype or demand test at a demo day. Season 0 runs by hand with 30 to 50 adults,
>   with no equity, pay statements or prize money through Qatoto. The main number is people in a team
>   still logging in week 3.
> - **Step 4 becomes season demos.** Steps 5 and 6 wait.
> - **Correction to Step 4, rule 4.** The streak leaderboard lists projects, not people, so it is not
>   a public ranking of workers. Consent still matters for anything that names a person.
> - **The cutover to an empty production database** is in the section at the end of this file.

## The decision

- **Keep this website. Don't build a new one.** The hard parts (login, daily logs, AI analysis,
  claim checks, equity maths, pay statements, disputes, quote requests, the factory directory)
  already work. The problem is what visitors see first, not the code underneath.
- **Hide, don't delete.** Anything taken off the menu stays in the code and can come back.
- **The MVP solves one problem:**

    > A small team building a physical product needs a fair, verified record of who did what, so
    > everyone gets their fair cash or equity, investors see real progress, and the factory gets a
    > package it can build from.

## Step 0: decisions only you can make (no code)

Write the answers at the bottom of this file before Step 1.

1. **One product category to start with**, for example simple electronics or consumer goods. Not
   "any product".
2. **Who the first 3 to 5 teams are.** Name them. Ideally they also pay for research or design
   work (`PRODUCT_REVIEW.md` Part 5).
3. **The one-line pitch** for the home page. Suggested:
   _"Build your product with your team. Qatoto keeps a verified record of who did what, turns it
   into fair pay and equity, and gives your investors and your factory the real picture."_
4. **Which country's rules you design for first** (India is the likely start).

**Done when:** all four are written down.

## Step 1: focus-mode menu

**What:** shrink the main menu to the MVP, and hide the rest.

| Menu item            | Goes to (existing pages)                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| My projects          | The R&D project pages (`/research-and-development/project/[id]`, its `workshop` and `proof-of-effort`) |
| Daily logs           | The project's daily-log tab and build log                                                              |
| Team and equity      | Team building, talent, and the project's compensation tab                                              |
| Factories and quotes | `/store/factories`, `/store/rfqs`, quote comparison                                                    |
| Funding              | `/research-and-development/funding` (links out to licensed platforms only)                             |
| Product package      | **Hidden until Step 5 exists**                                                                         |

**Hide from the menu:**

- the video feed and its pages (Watch, Library, History, Playlists)
- Project Immortal
- Problem Map
- Advertise with us
- Wishlist and the retail cart
- the anime-era leftovers
- the YouTube-style Studio items: subtitles, playlists, customize, copyright, comments, earn

**Where:**

- `src/components/home/layout/sidebar.tsx`: the main section list and the separate mobile list
  further down the file
- `src/components/studio/studio-sidebar.tsx`

**Notes:**

- Hidden pages still work if someone types the address. That's fine for now. If any of them
  should not appear in search engines, check `src/app/robots.ts` and `src/app/sitemap.ts`.
- Keep the "AI Assist" entry only if you decide the mascot stays (`PRODUCT_REVIEW.md` Part 4).

**Done when:** a new visitor sees only the MVP items, every hidden page still loads by its address,
and `pnpm lint` and `pnpm build` pass.

## Step 2: new home page for signed-out visitors

**What:** replace the video grid with three things, top to bottom:

1. **The pitch** (Step 0, item 3), with one short line under it saying who it is for.
2. **Two buttons:** "I have an idea" and "I already make a product". Each goes to the right
   starting page; sign-up comes first if needed.
3. **The milestone feed** (Step 4). Until it has real entries, **show nothing there.** No "coming
   soon", no sample cards, because absence renders nothing (`PRODUCT.md` Principle 2).

**Where:**

- `src/app/(home)/page.tsx`: also replace the metadata description "Welcome to Qatoto" with the
  real one
- `src/components/home/feed/home.tsx`: stop rendering the promo carousel and the video feed here;
  keep their files

**Watch out:**

- **Server data rules.** The page runs under `cacheComponents`. Keep any request-dependent part
  (such as "is this person signed in") inside its own `<Suspense>`, the way `home.tsx` already
  does. Read the comments in that file first.
- **Copy rules.** Follow the house rules: sentence case, no hype, no exclamation marks, no
  "you're all set!" style (`PRODUCT.md`, `docs/Design.md`).

**Done when:** a signed-out visitor understands what Qatoto does in ten seconds, without
scrolling.

## Step 3: home page for signed-in users (their dashboard)

**What:** a signed-in person lands on their own work, not a feed:

- their projects, and the stage each one is at
- **what is waiting on them:** a log to write, a claim to review, a dispute, a pay statement to
  countersign or confirm
- where their pay and equity stand, with a link to the statement

**First, check the backend.** See whether reads already exist for "my projects" and "my open
items" (`src/lib/rnd/projects.api.ts`, `compensation.api.ts`, `proof-of-effort.api.ts`). Build
only what is missing, in the backend first. Follow the house patterns:

- Zod parsing
- results as success or failure values
- a discriminated-union view state with an exhaustive `switch`

**Done when:** a pilot team member can sign in and see, in one screen, everything that needs
them today.

## Step 4: the milestone feed (the "showcase founders and workers" idea, done safely)

**What:** a public feed of **real progress**, not videos. Each card shows:

- the team or person, and the product
- the milestone, for example:
    - "First prototype assembled"
    - "Factory quote received"
    - "50 sign-ups"
    - "First 100 units shipped"
- a **"verified" mark only when the backend says evidence backs it**, never set by the client
- an optional video, only if the team chose to attach one

**Rules, not negotiable:**

1. **Opt-in, per milestone.** Nothing from a private daily log becomes public by default. A team
   chooses to publish one milestone at a time.
2. **Everyone named on a card agrees first.** A worker's work is their personal data; India's
   and Europe's privacy laws need their agreement before it is shown publicly.
3. **A moderator approves before it shows,** the same way showcase launches work today
   (`/admin/showcase-launches`).
4. **No public ranking of people.** There is already a public daily-log **streak leaderboard**
   (`src/lib/rnd/daily-logs.api.ts`). Review it in this step: a public ranking of workers is
   exactly the "rank employees" pattern `FOCUS_AREAS_RESEARCH.md` warns against. At minimum make
   it opt-in, or remove it.
5. **No client-only counters** (likes, votes) without a real backend table. That's an existing
   house rule.

**Where:**

- **Backend first:** a new "milestone post" record with consent per named person, moderation
  state and an evidence link.
- **Frontend:** reuse the look of the showcase rows (`src/components/home/blueprints/showcase/`,
  `cards/showcase-launch-link.tsx`) rather than inventing a new card.

**Done when:** at least one pilot team has published one real, approved, consented milestone, and
the home page shows it.

## Step 5: product package workspace (light)

**What:** a per-product checklist of what a factory needs, with files and sign-off. Not a CAD
tool.

1. Requirements
2. 3D files (STEP)
3. 2D drawings with tolerances
4. Bill of materials
5. Electronics files
6. Assembly steps
7. Test plan
8. Packaging and labels
9. Target certificates
10. Approved version

**Each item:**

- **"done" or "missing"**, worked out by the backend from uploaded files, not ticked by hand
- **versions**, with a named person approving each one
- **every upload and approval recorded as proof of work** for the person who did it (feeds
  Part 1 of `FOCUS_AREAS_RESEARCH.md`)
- **an "IP assignment signed" requirement** before a contributor's design work counts

**The handoff:** one action sends the approved version into the existing quote-request flow.

**Watch out:**

- **This is a new record type, not a teardown.** `AGENTS.md` keeps teardowns for existing,
  bought products only.
- **File storage:** reuse the private upload pattern teardown uploads already use (private
  storage, short-lived download links).
- **Client designs are private by default.** Nothing here is public.

**Done when:** one real product package has gone from checklist to a factory quote.

## Step 6: real company numbers for investors

**What:**

- **read-only connections** to the tools companies already use:
    - accounting: Tally, Zoho Books, QuickBooks, Xero
    - payments: Razorpay, Stripe
    - shops: Shopify, Amazon
- from these the backend works out revenue, margin, burn and runway
- **a weekly investor summary** where every line links to its evidence (logs, claims, statements,
  milestones)

**Rules:**

- **No hand-typed financial numbers shown as fact.** A number that came from a connection says
  so; anything else is labelled as founder-reported.
- **No connection, no number.** Show nothing rather than a zero.
- **Investors see summaries,** and can click into detail. No daily push.

**Done when:** one pilot team's investor receives a weekly summary built from connected data.

## Step 7: legal checks before wider use

Before any EU or US company uses proof of work for pay, promotion or employment decisions:

- **a lawyer's review**
- **a data protection impact assessment**
- **written notices to workers**
- **documented human oversight**

The EU deadline for this kind of tool is **2 December 2027**. India's privacy rules need full
compliance by about **May 2027**. Details are in `FOCUS_AREAS_RESEARCH.md`.

**Never build:**

- an employee ranking
- a "promote, demote or fire" suggestion
- emotion reading from video
- pay held back because of an AI verdict

## Running alongside every step: real teams and real money

- **Week 1 onward:** onboard the 3 to 5 pilot teams by hand. Sit with them. Write down every
  complaint.
- **Sell paid research and design work** (`PRODUCT_REVIEW.md` Part 5) to the same teams or
  others. Their projects become your first real milestones and packages.
- **Only build what a pilot team actually asked for.** If nobody asks for it, it waits.

## How to check each step

- `pnpm lint`, `pnpm build`, `pnpm check:client-boundary`
- `pnpm fmt:check` for any doc change
- open the changed pages in a browser, signed out and signed in, in light and dark mode
- for backend steps: the backend repo's own checks, and a rolled-back database check, since the
  database is shared

## Clean database cutover

**Warning:** this removes every live account and row from production, including admin access. Keep
the old database untouched until beta is stable, so you can roll back.

**Do not deploy the reminder job to a worker on the current database.** It would reach every seeded
member at 7 pm, 88 of them when this was written. Deploy that backend version as part of the switch.

Before the switch:

1. Build the frontend against an empty backend on a throwaway database. The current build ran
   against a populated one, so an empty run is unproven. `store/[...slug]`, `store/pathway/[id]` and
   `blueprints/[slug]` have `generateStaticParams` with no sentinel, and an empty list fails the build
   under `cacheComponents`.
2. Replay all migrations on that throwaway database, not the shared one.
3. Pick a plan with room. The Aiven free tier went read-only at about 429 MB.

At the switch:

1. Point only the production backend's `DATABASE_URL` at the new database. Development stays on the
   old one.
2. Run migrations.
3. Run only `db:seed-content-categories`, `db:seed-commerce-categories`,
   `db:seed-supplier-capabilities` and `db:seed-research-programs`. The last also creates the Project
   Immortal row.
4. Never run `db:seed-store-demo` (it publishes passwords), `db:seed-store-ranking-dev`,
   `db:seed-blueprint-teardowns`, `db:seed-blueprint-case-studies`,
   `db:seed-blueprint-store-categories` or `db:seed-promotional-slides`.
5. Sign up, then run `db:grant-platform-role` for your account. Remove the hero slides migration 0149
   inserts, at `/admin/blueprints-hero`.
6. Redeploy the frontend, because prerendered pages keep the old data until then.
7. Confirm the worker and `BREVO_API_KEY` are live, or no application emails go out.

Then edit `alpha-banner.tsx` for beta, and post real projects before inviting anyone.

## Step 0 answers

_(fill in)_

1. Product category:
2. Pilot teams:
3. Pitch line:
4. First country:
