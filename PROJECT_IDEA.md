# Qatoto — Project Idea & Research Brief

Purpose of this document: capture what Qatoto currently claims to be (from its own marketing copy), what has actually been built in code so far, and where the open strategic questions are — so you can research comparable products, regulatory constraints, and business models, and decide what direction to take the project in. This is a snapshot as of 2026-07-14, written from the codebase and internal planning docs as they exist today.

---

## 1. One-paragraph pitch

Qatoto is pitched as a **B2B, end-to-end pipeline for turning an idea into a shipped physical product**, aimed at people who have a concept and the drive to execute but lack capital, a team, or a supply chain. The platform's promise: post an idea, get matched with a team (CEO/CTO/CFO/engineers/specialists), raise money (crowdfunding, equity sale, or direct VC — or all three), get AI-assisted project tracking from daily team updates, and have the platform itself handle manufacturing go-to-market, compliance, shipping, and marketing once the product is ready to ship. Everything runs on one identity, one ledger, one audience.

Tagline from the marketing pages: _"Idea on Monday. Team by Friday."_ / _"From an idea to a shipped product."_

---

## 2. The core pipeline, stage by stage

This is the five-stage story the marketing pages (`about`, `how-qatoto-works`) tell:

| #   | Stage         | What happens                                                                                                                                                                                 | Mechanism                                                                                                                                                                     |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Pitch**     | Founder posts a concept publicly — no deck, no connections required.                                                                                                                         | Public idea posting; examples used in copy: an AI defense robot, a water-purification module, a diagnostic device.                                                            |
| 2   | **Form team** | Engineers, operators, domain specialists, and hobbyists apply. Platform helps fill CEO/CTO/CFO/leads/IC roles.                                                                               | Cap table and role agreements are signed **before** work starts — locked on day one.                                                                                          |
| 3   | **Raise**     | Crowdfund, sell equity directly to backers, close a strategic VC — or combine all three.                                                                                                     | Disclosures, term sheets, and signing happen on-platform. Same investor-facing update wall regardless of funding type.                                                        |
| 4   | **Build**     | Every team member posts an end-of-day (EOD) update — short video or text/transcript.                                                                                                         | AI ingests every update, flags blockers, and suggests workflow changes, resequencing, or parallelization. Investors get continuous visibility instead of quarterly reporting. |
| 5   | **Ship**      | Qatoto Store takes over: worldwide shipping, compliance filings, certifications, returns, first-line support. Marketing videos are produced in the same studio used to coordinate the build. | Positioned as "you stay in product mode; the platform runs operations."                                                                                                       |

A worked example in the copy (AI ground robot for defense) walks through: Day 0 concept posted → Day 8 CTO + 3 leads onboarded → Day 14 crowdfund opens → Day 41 crowdfund closes at 138% of target → Day 60 daily updates begin, AI suggests parallel firmware/chassis tracks → Day 180 MVP integration + compliance pre-scan → Day 240 first units ship to backers.

### The "eight pillars" (finer-grained internal decomposition)

An internal planning doc (`R_AND_D_STRUCTURE.md`) breaks the same pipeline into eight pieces, which is useful because it names mechanisms the five-stage marketing story glosses over:

1. Market-demand research & feasibility
2. Problem mapping ("Civic Pulse" — geo-tagged unmet needs)
3. Knowledge Hub (market intelligence, cross-project lessons)
4. Talent matching / virtual workshop
5. Funding (crowd / VC, with transparency)
6. **Daily Update Protocol** — AI-analyzed logs, framed internally as "Proof of Effort"
7. **Financial governance** — escrow, anti-corruption controls
8. Go-to-market — suppliers, ODM (original design manufacturer) matching, shipping, storefront

Two of these deserve special attention because they are the parts of the idea that are _not_ generic "startup platform" concepts and could plausibly stand alone:

- **Proof of Effort (daily AI-read updates → compensation + investor trust).** This is closer to an AI project-management/chief-of-staff product than to a marketplace. It's a narrower, more defensible thing to build and validate on its own.
- **Escrow-governed, contribution-tracked compensation.** Pay is meant to be allocated by a ledger of logged effort/research/promotion rather than negotiated — conceptually similar to how DAO contributor-compensation tools and some equity-management platforms try to solve "who gets paid what for building this together."

---

## 3. Supporting / adjacent surfaces

These are described in the marketing copy as surfaces that share "the same identity, ledger, audience, and AI layer" as the core pipeline, but are conceptually distinct products in their own right:

- **Anime inspiration feed** (`/anime` — daily, favorites, genre, ranking, watch) — user-uploaded anime framed as an R&D inspiration source: fantasy devices, garments, vehicles that a team can bookmark and turn into a real product brief.
- **Project Immortal** — a long-horizon research wing (immortality, energy, teleportation) where hobbyist and serious researchers share work in the open, living alongside commercial projects.
- **Civic problem map** — geo-tagged public reports of missing infrastructure (roads, drinking water, etc.), meant to be raw material for civic-tech project pitches.
- **Demand insights / Knowledge Hub** — cross-project market intelligence: what's wanted, by region, so lessons compound across teams instead of staying locked in one team's deck.

---

## 4. What's actually built today (from the code, not the copy)

The marketing narrative centers "team → fund → build → ship." The actual route/component surface built so far is considerably broader than that narrative, and worth seeing as its own signal about where this project could go. Route groups in `src/app/`:

- **`(information)`** — marketing/editorial: about, how-qatoto-works, blogs, press, careers, contact, developers, creator, advertise-with-us.
- **`(auth)`** — sign-in, sign-up, forgot-password, password sign-in.
- **`(home)`** — the main product shell (navbar + sidebar). Contains: a content feed, the **anime** section, **research-and-development** (funding, knowledge-hub, problem-map, project pages, talent), **store** (buyer-facing browse/product/pathway), cart, wishlist, orders-and-returns, history, library, watch, settings, your-account, sales, customer-service, policies-and-safety, report-history.
- **`(studio)`** — a creator/seller dashboard, structurally a near-1:1 mirror of **YouTube Studio**: videos, series, playlists, subtitles, copyright, comments, analytics, customize, earn — plus commerce/startup pieces bolted on: products, orders, logistics, pitches, funding, team, support, learn, feedback.
- **`(admin)`** — internal staff console: audit, review (currently scoped to anime moderation only — see below).
- **`(disclaimers)`** — legal/policy pages.

Internal planning docs already committed to the repo (`BACKEND_STRUCTURE.md`, `STORE_BACKEND_STRUCTURE.md`, `R_AND_D_STRUCTURE.md`, `ADMIN_STRUCTURE.md`, `UPLOAD_VIDEO_STRUCTURE.md`, `VIDEO_LIST_STRUCTURE.md`) total over 3,000 lines — this has had serious design effort put into it already, not just a landing page.

### What's real vs. what's mock right now

This distinction matters for deciding direction, because it shows where engineering investment has actually concentrated versus where it's still just marketing copy and static UI:

| Surface                                                                | Status                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**                                                               | Real. Express + Postgres + Drizzle + Better Auth. OTP-gated signup, password login, Google/GitHub OAuth with account linking, passkeys, anonymous sessions, forgot-password, recovery email. Largely complete.                                                                                   |
| **Store — seller listing (create/edit/list a product)**                | Real, wired to the Express backend (`/products`) via React Query as of 2026-07-13. Draft → image upload → publish flow; pricing in integer cents; single + B2B tiered pricing.                                                                                                                   |
| **Store — buyer side, checkout, orders, payments**                     | Not yet specced or wired — `STORE_BACKEND_STRUCTURE.md` explicitly scopes only the seller listing flow so far.                                                                                                                                                                                   |
| **Studio (video/series/playlists/subtitles/copyright/analytics/earn)** | UI + mock data only. `STUDIO_BACKEND_STRUCTURE.md` exists as a filename but is currently **empty** — no backend contract drafted yet.                                                                                                                                                            |
| **R&D pipeline (pitch/team/funding/daily-logs/governance/escrow)**     | UI + mock data only, explicitly. Every number (funding, equity, escrow, AI analysis, opportunity scores) is a static mock; no backend, no real AI analysis yet.                                                                                                                                  |
| **Anime, Project Immortal, civic problem map**                         | UI + mock data only.                                                                                                                                                                                                                                                                             |
| **Admin**                                                              | Only the anime-review queue (watch + approve/reject) is being hand-built — deliberately, because everything else (users, catalog, settings) is being run through Drizzle Studio directly rather than custom-built admin UI. This is a documented, intentional scope-reduction, not an oversight. |

**Read on this:** the two features with real backend investment so far are **auth** and **store seller-listing CRUD** — not the funding/team-matching pipeline the marketing copy leads with. Whether that's an accident of build order or an emerging signal about actual direction is a decision, not a fact — but it's worth naming explicitly.

---

## 5. The central tension to resolve

Stripped of branding, the surface area staked out in code maps to **five normally-separate businesses fused into one app**:

1. **Co-founder/team matching + equity crowdfunding** — closest existing category: AngelList, Wefunder, StartEngine, CoFoundersLab.
2. **Hardware/physical-product manufacturing-to-fulfillment pipeline** — closest existing category: Dragon Innovation, Fictiv, plus 3PL/customs-compliance vendors.
3. **Creator video platform** — closest existing category: YouTube Studio (videos, series, playlists, subtitles, Content-ID-style copyright, comments, analytics, monetization/"earn").
4. **Anime streaming/inspiration feed** — closest existing category: Crunchyroll, with the added twist of "user-uploaded" content.
5. **Open research / civic-tech wing** — closest existing category: X Development (Alphabet's moonshot lab) for Project Immortal, SeeClickFix/FixMyStreet for the problem map.

Each of these categories, on its own, is a full company with its own regulatory regime, unit economics, and go-to-market motion. Building all five simultaneously is a real risk pattern (breadth before depth, no wedge to get first real users/revenue). The most valuable thing to decide, before writing more code, is **which one pillar is the wedge** — the thing that has to work and get real users on its own, with the rest sequenced in later (or dropped).

A second, sharper version of the same tension: the pitch is "0 capex required — idea is enough," aimed at reducing what the _end user_ needs. But to legally and operationally deliver that promise, **the platform itself** needs money-transmission/escrow infrastructure, securities-law compliance (if selling equity), customs/compliance expertise, and DMCA-safe content hosting — i.e., exactly the kind of capital- and license-intensive stack the pitch tells users they get to skip. That gap is worth sizing honestly before committing further.

---

## 6. Comparable products to research (by pillar)

Use these as starting points for your own research — verify current pricing, regulatory status, and whether each company is still operating as described, since categories like this shift quickly.

### Team formation / co-founder matching

- CoFoundersLab, FounderDating, Y Combinator's Co-Founder Matching, AngelList Talent, Wantedly.
- Research question: how do these monetize (subscription vs. success fee), and what stops "co-founder matching" from being a feature bolted onto something else rather than its own product?

### Equity crowdfunding / fundraising

- Wefunder, StartEngine, Republic, SeedInvest (US); Crowdcube, Seedrs (UK).
- Cap table tooling for comparison: Carta, Pulley.
- Research question: these are **FINRA-registered funding portals** (US) or equivalent regulated entities elsewhere — that registration is itself a long, expensive process. Does Qatoto plan to become one, partner/white-label with an existing regulated portal, or start with reward-based crowdfunding (Kickstarter/Indiegogo model) to avoid securities law in v1?

### Daily-update tracking + AI workflow assistant

- Range.co, Geekbot, Standuply (async standup tools), Tability (OKR check-ins), Linear/Height (issue tracking).
- Research question: is "AI reads EOD updates and suggests resequencing" differentiated enough to be a standalone B2B product that teams (unrelated to crowdfunding) would pay for? This may be the most defensible, least-crowded pillar.

### Escrow / milestone-based fund release

- Escrow.com (general escrow-as-a-service), construction-industry draw schedules, Upwork-style milestone escrow.
- Research question: who is the licensed money-transmitter of record for funds sitting in "the project ledger" — a BaaS partner (Stripe Treasury, Unit-style provider), or does Qatoto need its own money-transmitter license per jurisdiction?

### Hardware go-to-market / manufacturing pipeline

- Dragon Innovation (hardware crowdfunding-to-manufacturing), Fictiv (manufacturing marketplace), HAX/SOSV (hardware accelerator model), Alibaba/Global Sources for sourcing.
- Research question: compliance/certification work (UL, CE, FCC, export controls for anything "defense" as used in the copy's own example) is deep, slow, and jurisdiction-specific — is this in scope for v1 or a stated future promise?

### Commerce / fulfillment / cross-border compliance

- Shopify, WooCommerce (storefront); ShipBob, ShipStation (3PL); Zonos, Passport (cross-border/customs compliance); Avalara (sales tax); Flexport (freight + customs).
- Research question: "worldwide shipping and compliance" is one of the hardest ops problems in commerce — worth scoping to one or two countries for v1 rather than "worldwide" as the copy currently states.

### Creator video platform

- YouTube (Partner Program, Content ID), Vimeo, Patreon (creator monetization).
- Research question: replicating subtitles/copyright-claims/analytics/monetization is a multi-year engineering investment at YouTube's scale — what's the minimum viable slice that's actually needed to support the core pipeline (e.g., just EOD update video + a simple marketing-video uploader), versus a full creator platform?

### Anime section specifically

- Crunchyroll, and the DMCA/licensing history of fan-upload anime sites (many were shut down or sued for hosting copyrighted anime without a license).
- **This is a legal exposure question, not just a product question**: is "user-uploaded anime" meant to be (a) users' own original fan art/OC, or (b) clips of official copyrighted anime? Those two readings have wildly different legal risk. Needs an explicit answer before this section grows further.

### Civic problem mapping

- SeeClickFix, FixMyStreet (UK), 311 municipal systems, the Citizen app.
- Research question: these succeed by partnering with (or at least being tolerated by) local government; what's Qatoto's plan for civic data without that partnership?

### Long-horizon research wing

- X Development / Alphabet's moonshot factory (closest structural analogy), open research-sharing communities (LessWrong, EA Forum) for tone/precedent on hobbyist + serious research coexisting.

---

## 7. Regulatory and legal questions to research before going further

These aren't implementation details — they shape which pillar is even legally buildable in a reasonable timeframe:

1. **Securities law for equity crowdfunding.** In the US this is Regulation Crowdfunding (Reg CF, capped raise amounts, requires a registered funding portal or broker-dealer intermediary) or Reg D for accredited-only rounds. Other countries have their own regimes (Crowdcube/Seedrs operate under UK FCA rules). This is a multi-month-to-multi-year compliance undertaking, not a feature flag.
2. **Money transmission / custody of investor and backer funds.** Holding other people's money in escrow before releasing it on milestones generally requires a money-transmitter license or a licensed banking-as-a-service partner.
3. **Worker/contributor classification.** "Pay by logged contribution ledger" raises employee-vs-contractor questions that differ by country and could create payroll-tax and labor-law exposure at scale.
4. **Cross-border shipping, customs, and product compliance/certification** (the copy's own example is a defense-related AI robot — export controls like ITAR/EAR in the US would apply to that category specifically, which is a significant regulatory regime on its own).
5. **Copyright/DMCA exposure for the anime section**, as above — resolve what "user-uploaded" actually means before treating this as a low-risk supporting surface.
6. **Data/privacy for the civic problem map** (geo-tagged reports of public infrastructure issues may touch local open-data or public-records rules depending on jurisdiction).

---

## 8. Monetization models to consider, per pillar

- **Crowdfunding/raise**: platform fee on funds raised (Kickstarter-style ~5% + payment processing), or placement fees typical of equity crowdfunding portals.
- **Store/commerce**: take-rate per sale (Shopify/Etsy-style), possibly plus payment processing margin.
- **Studio/creator tools**: ad revenue share or subscription tiers (YouTube Partner Program-style "earn" surface already has a route for this).
- **Team/SaaS core (EOD updates + AI workflow assistant)**: flat per-seat or per-team subscription, independent of whether a team ever raises money — this is the pillar most naturally sold as recurring SaaS rather than a transaction cut.
- **Anime section**: likely a loss-leader/engagement surface rather than a direct revenue line, unless licensing deals are pursued deliberately.

---

## 9. Decisions worth making before more building

1. **Pick the wedge.** Of the five bundled businesses (team/funding, manufacturing/fulfillment, creator video, anime, civic/research), which one has to prove itself with real users first? The engineering investment so far (auth + store seller-listing) suggests commerce may already be the de facto starting point — worth deciding on purpose rather than by inertia.
2. **Resolve the anime legal question** explicitly before that section grows further.
3. **Decide the fundraising posture for v1**: reward-based crowdfunding (no securities law) vs. equity crowdfunding (requires registered-portal partnership or licensing) vs. skip fundraising entirely in v1 and let teams bring their own capital while Qatoto focuses on team-formation + build-tracking + fulfillment.
4. **Pick a launch geography.** "Worldwide shipping, worldwide compliance, any equity structure" is not a v1-shaped scope. One country (or one region) for commerce, one jurisdiction's securities regime if fundraising is in scope, is a much more researchable and buildable starting point.
5. **Decide who custodies money.** Even a minimal escrow/milestone-release feature needs a real answer here before it's more than a UI mock.
6. **Name the actual moat.** Team-matching and equity crowdfunding are crowded and already regulated-and-licensed by incumbents; the AI-read-daily-updates concept is comparatively novel. Consider whether the differentiated core is really the "Proof of Effort" AI layer, with commerce/funding/anime as later expansion rather than day-one scope.

---

## 10. Suggested next research steps

Concrete starting searches, grouped by the open questions above:

- "Reg CF funding portal registration requirements" / "FINRA funding portal vs broker-dealer" — sizes the equity-crowdfunding compliance path.
- "Wefunder vs StartEngine vs Republic fees" — current fee/take-rate benchmarks for the raise pillar.
- "Escrow as a service API" / "Stripe Treasury banking as a service" — sizes the custody/escrow build-or-partner decision.
- "CoFoundersLab business model" / "AngelList talent monetization" — sizes whether team-matching alone is viable as a standalone product.
- "Dragon Innovation hardware crowdfunding manufacturing" — closest existing precedent for the full idea-to-shipped-hardware pipeline.
- "DMCA anime streaming site shutdown" — grounds the anime-section legal exposure question in real precedent.
- "Async standup tool AI summarization market" (Range, Geekbot, Tability) — sizes whether the Proof-of-Effort/AI-workflow pillar is viable alone.
- "Cross-border ecommerce compliance Zonos Avalara Flexport" — sizes the "ship worldwide, comply everywhere" promise against what specialized vendors charge to solve just that slice.

---

_This document reflects the codebase and internal planning docs (`about.tsx`, `how-qatoto-works.tsx`, `Design.md`, `R_AND_D_STRUCTURE.md`, `ADMIN_STRUCTURE.md`, `STORE_BACKEND_STRUCTURE.md`, `CLAUDE.md`) as of 2026-07-14. Re-derive from current code before relying on any "what's built" claim above if significant time has passed._
