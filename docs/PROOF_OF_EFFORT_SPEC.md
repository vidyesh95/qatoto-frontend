# Proof of Effort — Product & Business Spec

Business/product spec for Qatoto's AI-driven compensation engine — the mechanism
behind pillar 6 ("Daily Update Protocol") in [R_AND_D_STRUCTURE.md](R_AND_D_STRUCTURE.md).
This doc is **strategy, not implementation** — no code here targets the current
UI-phase build. Where the R&D frontend renders a piece of this (Daily Logs tab, Team
equity, Governance ledger), those renders are **static mocks only**; the math and
verification logic described below are entirely backend-owned, later phase.

> Relationship to `R_AND_D_STRUCTURE.md`: that doc specs the **frontend surface**
> (routes, components, mock shapes) for the pipeline UI-phase build. This doc specs
> the **product mechanism** (why Proof of Effort exists, how the math works, how
> fraud is defeated, how the business sequences rollout). Frontend implementers
> should read `R_AND_D_STRUCTURE.md`; product/backend design should read this.

---

## 1. How to sequence the build

Launching all five pillars at once fails. Sequence to generate revenue, prove the
model, and defer the heaviest regulatory burden until there's capital to handle it.

1. **Phase 1 — AI Chief of Staff (Months 1–8).** Monetization: B2B SaaS
   subscriptions. Focus solely on the Daily Update Protocol — teams log EOD updates
   (video or text), AI analyzes blockers, tracks contributions, manages a dynamic
   "sweat equity" ledger. Validates the product and generates recurring revenue
   without touching physical supply chains or securities law.
2. **Phase 2 — Reward-based crowdfunding (Year 1).** Monetization: platform take-rate
   (5%). Once teams are successfully building on the platform, introduce
   Kickstarter-style reward crowdfunding. Avoids Reg CF's regulatory overhead —
   teams raise via pre-sales using Stripe Treasury or similar BaaS for escrow.
3. **Phase 3 — Ecosystem partnerships (Year 2).** Instead of building a manufacturing
   pipeline from scratch, integrate with existing digital manufacturers — pass
   finalized CAD files to Fictiv / Xometry APIs for automated quoting and
   production.
4. **Phase 4 — True equity crowdfunding (Year 3+).** Requires FINRA/SEC
   registration. Once deal flow and proven-team volume are large, partner with a
   licensed broker-dealer (or acquire a funding portal license) to unlock direct
   equity sales.

---

## 2. Why this is a product, not a prompt

**The Trust Protocol.** Tell a lead engineer "your bonus is 10% lower because my
custom Gemini prompt decided that" and they quit. Founder-controlled spreadsheet +
founder-controlled prompt = employees know the founder can quietly tweak parameters
to pay out less. Employees won't trust their livelihood to a private chat window.
Qatoto is an independent, third-party ledger — valuation rules locked in and
transparent to everyone. Replaces founder fiat with objective, verifiable math.

**Financial determinism vs. LLM hallucination.** Standard LLMs are probabilistic —
same spreadsheet fed to an LLM Monday vs. Friday can output 5% vs. 8% bonus. Cannot
calculate real payroll or cap tables with a random number generator. Qatoto does not
"ask the AI to decide compensation." AI is used purely for **extraction** — parsing
videos and pull requests into structured metrics (hours worked, tasks closed, code
complexity). Those metrics feed a **fixed, deterministic mathematical formula** (§3),
same spirit as the "Slicing Pie" dynamic equity model.

**The automation pipeline.** Nobody wants to manually copy 50 YouTube links, fetch
200 GitHub commit diffs, and format them into a prompt every Friday, or manage
context-window limits as the codebase grows. Building a GitHub/Linear/YouTube data
pipeline that never drops data is real engineering time — startups pay for SaaS to
avoid maintaining their own HR/data-ops pipeline.

**Legal execution — tokens aren't contracts.** An LLM outputting "Employee A earned
50 shares this week" has zero legal weight. Issuing real ESOPs needs updated cap
tables, board approvals, legally binding option grants. Qatoto's moat isn't
generating the number — it's acting as the automated financial infrastructure that
**legally executes** the equity distribution without a founder calling a lawyer every
month.

Takeaway: customers pay for legal infrastructure, team trust, and automation — not
"AI analysis."

---

## 3. The math — Slicing Pie dynamic equity

Framework: Mike Moyer's Slicing Pie. Single principle — a person's equity share
equals their share of total risk taken to build the company. Every contribution
converts to standardized units called **Slices**, multiplied by a risk premium.

**1. Cash contributions — 4x multiplier.** Cash is hard to get, usually taxed before
investment, easily lost.

$$Slices_{cash} = Cash\ Spent \times 4$$

**2. Non-cash contributions — 2x multiplier.** Time, labor, IP, equipment, valued at
Fair Market Value (what the person would earn at a normal corporate job).

$$Slices_{time} = (Unpaid\ Hours \times Fair\ Market\ Hourly\ Rate) \times 2$$

**3. Real-time equity calculation.** Every day, as members log hours or spend money,
slices grow. Ownership recalculates dynamically:

$$Individual\ Equity\ \% = \frac{Slices_{individual}}{\sum Slices_{all\ team\ members}}$$

**Worked example** — two-person team, one week:

- Founder A (hardware engineer, $100/hr market rate): 40 unpaid hours →
  `40 × $100 × 2 = 8,000 Slices`
- Founder B (business lead, $50/hr): 40 unpaid hours + $1,000 out-of-pocket on a 3D
  printer → time `40 × $50 × 2 = 4,000 Slices`, cash `$1,000 × 4 = 4,000 Slices`,
  total `8,000 Slices`
- Pool: 16,000 Slices → each owns 50%. If A takes next week off and B keeps working,
  B's percentage automatically rises.

**Platform mapping:**

1. **Input layer (baseline value)** — on team formation, members negotiate Fair
   Market Rates (not equity). Locked into the ledger Day 1.
2. **Verification layer (Proof of Effort)** — see §4. AI does not decide equity
   value; it validates that logged hours actually happened, then pushes verified
   hours to the ledger.
3. **Ledger layer (daily recalculation)** — nightly job runs the math, dashboard
   updates showing slices earned and cap-table shift. Radical transparency,
   gamifies productivity.
4. **Baking the pie (exit event)** — dynamic equity can't fluctuate forever. At
   cash-flow breakeven or a priced VC round (handled via Reg CF, Phase 4), the pie
   **bakes** — dynamic calculation stops, percentages freeze, legal paperwork for
   formal ESOPs/shares auto-generates from the final math.

Maps to `R_AND_D_STRUCTURE.md` §10 `TeamMember.equityShare` and §5.3 Team's equity
split bar — those are the frontend's static mock rendering of this formula's output.
`Milestone.escrowReleaseAmount` and the §5.5 Governance compensation table are the
mock rendering of the ledger layer.

---

## 4. Verification pipeline — defeating fraud

If a system auto-prints equity based on what an AI thinks it saw in a video, users
will game it — read from a script, push 10,000 lines of boilerplate, claim 12 hours
of "research." The AI must **not trust the video** — the video is a claim; the AI's
job is aggressive auditor, cross-referencing the claim against deterministic digital
artifacts.

1. **Extraction (parsing the claim).** Transcribe video, extract structured claims.
   "I spent 6 hours refactoring the Better Auth session logic and closed the
   migration ticket" → three claims: Time (6h), Code Component (Better Auth /
   session), Task Management (ticket closed).
2. **Cryptographic & API grounding.** Query connected integrations (GitHub, Jira,
   Linear, Figma). Did the user push commits to the auth module today? Does the
   commit signature match their key? Is the Jira ticket actually marked done? No
   digital receipts → flag "Unverified," zero equity slices.
3. **Substantive code analysis — defeats line-count cheating.** A malicious dev
   might generate 5,000 useless lines just to trigger the GitHub integration. Use
   Abstract Syntax Tree (AST) analysis (à la Greptile / SonarQube) to measure diff
   complexity and substance — reject trivial or copy-pasted-dependency diffs.
4. **Temporal anomaly detection — defeats time-theft.** Statistical anomaly
   detection (e.g. Isolation Forests) on commit metadata. Claimed 8 hours but all
   commits pushed in a 14-minute window at 11:50 PM → flag temporal mismatch.

**Hardware / physical-work edge case.** Git is deterministic; sanding a 3D-printed
chassis isn't. For non-digital work, require a **physical receipt** — uploaded CAD
file, photo of the completed object, or literal material receipt. Run image analysis
on uploads (EXIF check, device fingerprint, reverse-image search) to catch stock
photos.

**24-hour transparency ledger — the failsafe.** AI will occasionally get tricked, so
the final layer is social, not algorithmic. Proposed daily slice allocation posts to
a transparent team dashboard before locking in. Every member gets a 24-hour
**Dispute** window. If a founder claims 10 hours of supplier calls but the team knows
they were on vacation, they can challenge it — disputed slices freeze in escrow until
the team reaches consensus.

**The technical moat.** A free Gemini prompt cannot replace this. A multi-agent
system that OAuths into GitHub/Jira, pulls commit hashes, runs AST complexity
analysis, detects temporal anomalies, and manages an escrow dispute ledger is a
large, defensible engineering effort.

Maps to `R_AND_D_STRUCTURE.md` §5.2 Daily Logs tab (`aiSummaryChips`,
"Proof of Effort verified" badge) and §5.5 Governance's `verificationStatus`
(`"verified" | "pending"`) field on `EscrowLedgerEntry` — those fields are the
frontend's static mock placeholders for this pipeline's real output.
