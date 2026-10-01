# [Qatoto](https://qatoto.com/) — Physical Product Development Pipeline

[![CodSpeed](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://app.codspeed.io/vidyesh95/qatoto-frontend?utm_source=badge)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-61dafb?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)

> **Qatoto is a B2B pipeline that carries a physical product from an idea to a shipped unit.**  
> _Pitch, form a team, raise, build under a daily-update protocol, and ship through the platform's store and logistics._  
> **One identity, one ledger, one audience across all five stages.**

---

## Table of Contents

- [Overview](#overview)
- [For Whom It Is Useful](#for-whom-it-is-useful)
- [How the Platform Works](#how-the-platform-works-the-5-stage-pipeline)
- [Key Features](#key-features)
- [How to Start a New Project](#how-to-start-a-new-project)
- [For Employees & Regular Contributors](#for-employees--regular-contributors)
    - [Recognition for Your Work](#recognition-for-your-work)
    - [Detailed Transparency on What You Are Doing](#detailed-transparency-on-what-you-are-doing)
    - [Active AI Optimization Suggestions](#active-ai-optimization-suggestions)
    - [Startup Feasibility Reports](#startup-feasibility-reports)
- [Privacy & Local Self-Hosting Guide](#privacy--local-self-hosting-guide)
    - [Privacy-by-Design Architecture](#privacy-by-design-architecture)
    - [Local Setup & Running the Frontend](#local-setup--running-the-frontend)
    - [Connecting to the Local Backend](#connecting-to-the-local-backend)
- [Tech Stack & Architecture Invariants](#tech-stack--architecture-invariants)
- [Developer Commands & Testing](#developer-commands--testing)
- [Documentation & Deep Dives](#documentation--deep-dives)

---

## Overview

Bringing a physical hardware product to market has traditionally required deep venture capital connections, fragmented tooling (spread across spreadsheets, Discord, GitHub, and Jira), opaque equity promises, and complex offshore manufacturing knowledge.

**Qatoto** replaces this broken workflow with an integrated, end-to-end execution system. Founders with an idea can match with skilled engineers, lock in deterministic dynamic equity before work starts, log daily progress that is automatically audited against real code and CAD artifacts, and transition seamlessly into manufacturing, global storefront distribution, and fulfillment.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   01. PITCH   │ ──> │ 02. ASSEMBLE │ ──> │  03. RAISE   │ ──> │  04. BUILD   │ ──> │   05. SHIP   │
│ Public idea  │     │ Match team & │     │ Milestone-   │     │ Daily update │     │ Storefront & │
│  no deck req │     │ lock equity  │     │ backed funds │     │ & proof log  │     │ ODM logistics│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## For Whom It Is Useful

Qatoto unites five key personas on a single shared ledger:

1. **Founders & Hardware Entrepreneurs**
    - **Need**: You have a physical product concept and the drive to build, but lack seed capital, co-founders, or manufacturing expertise.
    - **Value**: Validate consumer demand via civic problem mapping, find verified engineering talent, secure milestone-based funding, and receive automated build tracking without needing prior supply chain knowledge.

2. **Engineers, Designers & Technical Specialists**
    - **Need**: You want to contribute your engineering, CAD, or software skills to high-impact physical builds without getting exploited by empty founder equity promises.
    - **Value**: Join vetted teams, negotiate pre-locked Fair Market Rates, earn mathematically guaranteed equity via the Slicing Pie dynamic equity protocol, and build a public portfolio of cryptographically verified effort.

3. **Backers, Angels & Investors**
    - **Need**: Hardware startups frequently fail due to opacity, missed milestones, or premature scaling.
    - **Value**: Gain radical visibility through the Daily Update Protocol. Inspect ground-truth engineering diffs, video logs, and hash-chained governance ledgers rather than relying on curated quarterly pitch decks.

4. **Makers, Creators & Sellers**
    - **Need**: Distributing hardware prototypes, gathering community feedback, and converting early builds into retail sales.
    - **Value**: Publish teardowns and showcases in the **Blueprints Hub**, manage video updates in **Qatoto Studio** (mirroring YouTube Studio), and sell products with single and B2B volume pricing in the **Qatoto Store**.

5. **Contract Manufacturers, Suppliers & ODMs (Original Design Manufacturers)**
    - **Need**: Vetting customer designs and receiving clean, unambiguous technical specifications to provide accurate production quotes.
    - **Value**: Access structured Bills of Materials (BOM), CAD files, and clear component specifications directly from teams ready for manufacturing runs.

---

## How the Platform Works (The 5-Stage Pipeline)

Every project on Qatoto advances through five continuous stages:

### Stage 1: Pitch (Public Concept)

The founder posts a project concept openly. No polished pitch deck, warm VC introductions, or upfront capital are required. The listing details the problem, target geography, initial bill-of-materials assumptions, and required roles.

### Stage 2: Form Team (Talent Matching & Fair Market Valuation)

Engineers, operators, and specialists apply to open roles. Before any work begins, the team establishes baseline **Fair Market Rates** (what each member would command in an open market) and signs the dynamic equity agreement. Cap table rules are locked upfront—eliminating bitter equity disputes later.

### Stage 3: Raise (Milestone-Backed Capital)

Projects can raise capital through community crowdfunding, pre-orders, angel checks, or institutional venture capital. Capital is committed against transparent project milestones, with progress visible on the public project wall.

### Stage 4: Build (Daily Update Protocol & Proof of Effort)

Building happens in public view under the **Daily Update Protocol**:

- At the end of each day (EOD), team members submit a short update (video walkthrough, text log, or physical build photos).
- AI extraction parses the update into concrete claims (time spent, components modified, tickets closed).
- The **Proof of Effort** engine grounds these claims against real digital artifacts (GitHub commits, AST code complexity, Linear/Jira ticket closures) or physical receipts (EXIF-checked photos and CAD revisions).
- Verified effort dynamically updates the team's **Slicing Pie** equity pool.

### Stage 5: Ship (Store, Logistics & Global Fulfillment)

When the product achieves MVP validation:

- The design transitions to vetted ODMs and component suppliers for batch production.
- The product launches on the **Qatoto Store** with global shipping, automated compliance filings, certifications, and customer support.
- Marketing assets and video updates continue through **Qatoto Studio**.

---

## Key Features

- **Civic Pulse Problem Map (`/research-and-development/problem-map`)**: Interactive vector map displaying geo-tagged, community-reported infrastructure and product problems, enabling founders to build solutions where real need exists.
- **Startup Feasibility Readouts (`/research-and-development/market-research`)**: Grounded feasibility reports across 3 independent pillars (Need Density, Purchasing Power, and Manufacturing Capability) backed by World Bank and UN Comtrade data.
- **Proof of Effort & Verification Engine**: Multi-modal claim extraction, GitHub commit AST complexity verification, and temporal anomaly detection to prevent fraudulent time logging.
- **Slicing Pie Dynamic Equity Protocol**: Mathematical equity allocation governed by risk-weighted inputs (Cash 4x, Labor 2x) with a mandatory 24-hour dispute window for human consensus.
- **Tamper-Evident Governance Ledger (`/research-and-development/governance`)**: SHA-256 hash-chained audit trail of all allocations, rate changes, milestone payouts, and equity shifts.
- **Blueprints Hub (`/blueprints`)**: Engineering teardown library with an interactive 3D exploded view engine (Three.js / React Three Fiber), working prototype showcases, and manufacturing case studies.
- **Store & Studio (`/store`, `/studio`)**: Multi-currency hardware marketplace supporting retail and B2B tiered orders, paired with a creator studio for product video logs, analytics, and earnings.

---

## How to Start a New Project

Starting a new project on Qatoto takes minutes:

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 1. Discover Need       │ ───> │ 2. Evaluate Feasibility│ ───> │ 3. Launch Idea Wizard  │
│ Civic Pulse Problem Map│      │ World Bank & Comtrade  │      │ /research-and-         │
│ & Import Intelligence  │      │ 3-pillar indicators    │      │    development/new     │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                             │
                                                                             ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 6. Daily Build Protocol│ <─── │ 5. Lock Rates & Equity │ <─── │ 4. Assemble Team       │
│ Proof of Effort logs   │      │ Slicing Pie agreement  │      │ Talent Hub matching    │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Discover Unmet Needs**:
   Browse the **Civic Pulse Problem Map** (`/research-and-development/problem-map`) to identify verified pain points reported by citizens worldwide, or inspect **Import Intelligence** to discover high-volume commodities ripe for domestic substitution.
2. **Evaluate Market Feasibility**:
   Open **Market Research** (`/research-and-development/market-research`) and select your target country and domain. Review the three feasibility pillars to ensure the local purchasing power and supply chain can sustain a viable commercial product.
3. **Launch the Idea Wizard** (`/research-and-development/new`):
   Complete the multi-step project wizard:
    - **Idea Basics**: Name, one-line pitch, and engineering category.
    - **Problem & Market**: Detailed problem statement, target region, and existing demand evidence.
    - **Roles Needed**: Specify required technical roles (e.g. Embedded Firmware Engineer, Industrial Designer), commitment type (full-time / part-time), and initial offered equity range (in basis points).
    - **Review & Submit**: Save as a private draft or publish to open recruitment.
4. **Assemble Your Team**:
   Browse candidate profiles in the **Talent Hub** (`/research-and-development/talent`). Filter by engineering discipline, availability, and historical verified effort. Send role offers and agree upon Fair Market Rates.
5. **Lock Dynamic Equity & Milestones**:
   Configure project milestones, target raise goals, and initial risk parameters.
6. **Initiate the Daily Build Protocol**:
   Begin logging daily EOD updates, enabling the AI verification pipeline to record progress, ground claims against GitHub/CAD diffs, and dynamically adjust equity allocations.

---

## For Employees & Regular Contributors

For engineers, specialists, and contributors working on hardware projects, Qatoto provides radical transparency, fair compensation, and unforgeable career recognition.

### Recognition for Your Work

- **Verified Effort Score**: Every hour you work is grounded against verifiable digital artifacts (commit hashes, pull requests, AST diffs, Jira/Linear tasks) or physical build receipts. This produces an immutable track record of verified effort.
- **Talent Hub Spotlight**: Contributor rankings in the Talent Hub can be sorted by verified effort (`sort=effort`), giving you industry-wide visibility based on proven output rather than resume claims.
- **Public Portfolio & Attribution**: Your contributions to teardowns, prototypes, and project repos are permanently recorded in the platform's public Blueprints and Governance ledgers.

### Detailed Transparency on What You Are Doing

- **Claimed vs. Grounded Minutes**: Clear visibility into every daily log. See exactly what claims were extracted, what artifacts were verified, and how many grounded minutes were credited.
- **Real-Time Dynamic Equity Dashboard**: Through the Slicing Pie model, your share of the cap table updates dynamically as you contribute:
  $$\text{Individual Equity \%} = \frac{\text{Slices}_{\text{individual}}}{\sum \text{Slices}_{\text{team}}}$$
  $$\text{Slices}_{\text{labor}} = (\text{Unpaid Hours} \times \text{Fair Market Hourly Rate}) \times 2$$
  $$\text{Slices}_{\text{cash}} = \text{Cash Spent} \times 4$$
- **Month-End Compensation Statements**: Detailed gross compensation summaries combining verified cash pay with equity slice allocations, requiring dual countersignatures and frozen into hash-chained records.

### Active AI Optimization Suggestions

- **Proactive Workflow Optimization**: The platform's AI doesn't just record hours; it analyzes build logs across teams to identify critical path bottlenecks, suggested parallelization (e.g. running chassis 3D printing concurrently with firmware development), and supply chain shortcuts.
- **Full Model Provenance**: Every optimization suggestion explicitly displays the generating model name, prompt version, confidence score (`confidenceBps`), and cited evidence.
- **Contributor Agency**: Suggestions are strictly advisory. Team members can freely review, accept, or dismiss suggestions with custom rationale notes.

### Startup Feasibility Reports

- Before joining a project or investing hundreds of unpaid sweat-equity hours, contributors can inspect the project's **Feasibility Report**:
    - **Need Density (0–30 pts)**: Count of verified citizen reports and active geographic clusters.
    - **Purchasing Power (0–25 pts)**: World Bank GDP per capita (PPP) evaluating whether local users can afford the unit economics.
    - **Manufacturing Readiness (0–25 pts)**: UN Comtrade trade data and domestic ODM availability evaluating whether the hardware can be built locally.
- Protects contributors from sinking effort into commercially unviable ideas.

---

## Privacy & Local Self-Hosting Guide

For users, organizations, or defense/hardware teams who handle proprietary IP, sensitive CAD files, or private hardware designs, Qatoto is designed to be **run and hosted entirely locally**.

### Privacy-by-Design Architecture

Qatoto enforces strict architectural privacy safeguards:

- **Single Storage Key**: The frontend stores all client-side state in a single persistent browser key (`qatoto.browser-preferences`). There are no third-party tracking scripts, hidden fingerprinting beacons, or unsolicited persistent cookies. Erasure is instantaneous via settings.
- **In-Browser Geolocation Quantization**: Under the Civic Pulse map, exact device GPS coordinates are rounded to 3 decimal places (~110 meters) **inside the browser before transmission**. Raw high-precision coordinates never touch the network or server.
- **Automated EXIF & Metadata Scrubbing**: All uploaded build photos, problem submissions, and hardware receipts are stripped of EXIF, GPS, camera serials, and device fingerprints upon ingestion.
- **Prohibition of Emotion/Affect Inference**: In strict compliance with Article 5(1)(f) of the EU AI Act, the Daily Update Protocol extracts only claims, timestamps, and artifact links. Voice sentiment, facial analysis, and emotion detection are structurally prohibited.
- **Mandatory 24-Hour Human Dispute Window**: Automated algorithmic decisions never lock in immediately. Every allocation proposal enters a mandatory 24-hour review window, satisfying GDPR Article 22 human intervention rights.

---

### Local Setup & Running the Frontend

#### Prerequisites

- **Node.js**: `>= 24.21.0`
- **pnpm**: `>= 12.3.4`

#### 1. Clone the Repository

```bash
git clone https://github.com/vidyesh95/qatoto-frontend.git
cd qatoto-frontend
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Local Environment

Create a `.env` file in the root directory:

```bash
# URL of your local Express API backend (defaults to http://localhost:8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Razorpay Test Key for local payment testing (optional)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_sample_key

# Enable OpenFreeMap vector basemap for Civic Pulse (no API key or account required)
NEXT_PUBLIC_CIVIC_PULSE_MAPLIBRE=true
```

#### 4. Run the Development Server

```bash
pnpm dev
```

The application will synchronize MapLibre web worker assets and launch the Turbopack server. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Connecting to the Local Backend

The frontend communicates with the backend via Next.js rewrites defined in `next.config.ts`:

- Any request sent to `/api/*` on port `3000` is transparently proxied to `NEXT_PUBLIC_API_URL` (port `8000`).
- When running in an isolated offline mode without a backend:
    - **Marketing CMS**: Marketing blog and press articles automatically fall back to the built-in `MOCK_BLOGS` and `MOCK_PRESS` datasets in `src/lib/cms.ts`.
    - **Blueprints**: The 3D exploded view engine and blueprint showcases run with local offline geometric fixtures.
    - **Map Tiles**: Civic Pulse vector tiles are served directly from OpenFreeMap over open protocols without user tracking.

---

## Tech Stack & Architecture Invariants

- **Framework**: Next.js 16 (App Router) with React 19.3
- **Compiler**: React Compiler enabled (`reactCompiler: true`, `turbopackRustReactCompiler: true`)
- **Bundler**: Next.js Turbopack with filesystem caching
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`
- **Type Safety**: TypeScript strict mode, Zod 4 for boundary defense
- **Mapping & 3D**: MapLibre GL, Three.js, React Three Fiber, Google Model Viewer
- **State & Data Fetching**: TanStack React Query v5, Context API
- **Linter & Formatter**: Oxlint (type-aware) and Oxfmt
- **Testing**: Vitest (unit/component), Playwright (end-to-end), Tinybench (performance benchmarks)

### Core Architecture Rules

1. **Thin, Untrusted Client**: The frontend is an untrusted presentation layer. All authentication, validation, pricing, and business logic are independently verified by the backend.
2. **Deterministic UI State (Discriminated Unions)**: Components never use loose boolean flags (e.g. `isLoading`, `isError`). States are modeled as discriminated unions rendered with exhaustive `switch` blocks.
3. **Defensive Boundary Parsing**: All network payloads are parsed with Zod before entering application state. No `any` or `as MyType` assertions.

---

## Developer Commands & Testing

```bash
# Start Turbopack dev server
pnpm dev

# Build production bundle with Turbopack
pnpm build

# Start production server
pnpm start

# Linting with Oxlint
pnpm lint
pnpm lint:fix

# Code formatting with Oxfmt
pnpm fmt
pnpm fmt:check

# Unit tests with Vitest
pnpm test
pnpm test:watch

# Single unit test
pnpm exec vitest run src/lib/cms.test.ts

# Performance benchmarks
pnpm bench

# React Doctor diagnostic scan
pnpm doctor

# End-to-end tests with Playwright
pnpm exec playwright test
pnpm exec playwright test --project=chromium
pnpm exec playwright test --ui
```

---

## Documentation & Deep Dives

For in-depth architectural specifications and domain models, consult the internal documentation:

- [`AGENTS.md`](./AGENTS.md): Architectural invariants, coding standards, wire casings, and agent guidelines.
- [`docs/PRODUCT.md`](./docs/PRODUCT.md): Strategic personas, design principles, and product purpose.
- [`docs/FEASIBILITY_MODEL.md`](./docs/FEASIBILITY_MODEL.md): Mathematical specification of the 3-pillar Startup Feasibility Model.
- [`docs/PROOF_OF_EFFORT_SPEC.md`](./docs/PROOF_OF_EFFORT_SPEC.md): Proof of Effort verification mechanics, Slicing Pie dynamic equity math, and fraud mitigation.
- [`docs/GEOLOCATION_PRIVACY.md`](./docs/GEOLOCATION_PRIVACY.md): Geolocation quantization, PII filtering, and GDPR/DPDP compliance.
- [`docs/R_AND_D_STRUCTURE.md`](./docs/R_AND_D_STRUCTURE.md): Comprehensive 8-pillar R&D frontend specification.
- [`docs/STORE_STRUCTURE.md`](./docs/STORE_STRUCTURE.md): Store and commerce architecture.
- [`docs/ADMIN_STRUCTURE.md`](./docs/ADMIN_STRUCTURE.md): Staff console and review queues.
