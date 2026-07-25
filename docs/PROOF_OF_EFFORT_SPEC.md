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

Launching all five pillars at once fails. Sequence to prove the model first and defer the heaviest
regulatory burden until there's capital to handle it.

> **The platform is free.** No take-rate, no subscription, no per-seat charge — not to a founder, an
> employee, an employer or an investor. This supersedes the two monetization lines this section used
> to carry ("B2B SaaS subscriptions" in Phase 1, "platform take-rate (5%)" in Phase 2). **No
> replacement revenue model is asserted here**, deliberately: that is a business decision, and
> inventing one in a product spec would be worse than leaving the question open.
>
> It is not only a pricing choice. Charging a percentage of a transaction is one of the hooks
> several US state money-transmitter definitions turn on, so free-and-non-custodial is a materially
> simpler legal position than free-and-custodial or paid-and-non-custodial. See
> [R_AND_D_BACKEND_STRUCTURE.md](R_AND_D_BACKEND_STRUCTURE.md) §7A.6.

1. **Phase 1 — AI Chief of Staff (Months 1–8).** Focus solely on the Daily Update Protocol — teams
   log EOD updates (video or text), AI extracts what was claimed, verification grounds it against
   digital artifacts, and a dynamic "sweat equity" ledger tracks contribution. **Its output is a
   month-end statement of what each member is owed in cash and in equity** (R&D §7A) — that
   statement, not the AI, is the product. Validates the model without touching physical supply
   chains or securities law.
2. **Phase 2 — Reward-based crowdfunding (Year 1), optional and flag-gated.** Kickstarter-style
   pre-sales once teams are building on the platform. Avoids Reg CF's overhead, but **Qatoto does
   not custody the money**: holding funds for later payout requires PSD2 authorisation in the EU,
   state money-transmitter licensing plus FinCEN registration in the US, and RBI payment-aggregator
   authorisation in India. A pledge on the platform today is a **recorded commitment**, not a
   charge, and `ENABLED_FUNDING_ROUND_TYPES` gates the whole surface at the API. Nothing in Phase 1
   depends on this phase existing.
3. **Phase 3 — Ecosystem partnerships (Year 2).** Instead of building a manufacturing
   pipeline from scratch, integrate with existing digital manufacturers — pass
   finalized CAD files to Fictiv / Xometry APIs for automated quoting and
   production.
4. **Phase 4 — True equity crowdfunding (Year 3+).** Securities, in every jurisdiction: SEC/FINRA
   registration or a licensed broker-dealer partner in the US; a prospectus or an applicable
   exemption under Regulation (EU) 2017/1129 in the EU; Companies Act 2013 compliance and, for a
   public issue, SEBI's regime in India. Stays API-disabled until that work is real.

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

**Records aren't instruments — and Qatoto issues neither.** An LLM outputting "Employee A earned 50
shares this week" has zero legal weight. Neither does a Slicing Pie percentage. Issuing real equity
requires corporate action nobody on this platform can perform: board approval and a 409A valuation
under a written Rule 701 plan in the US; a resolution plus PAS-3 on allotment under Companies Act
2013 §62(1)(b), or a registered-valuer report under §54 and Rule 8 for sweat equity, in India;
national company law plus the Prospectus Regulation's employee-scheme conditions in the EU.

So what Qatoto produces is an **equity entitlement record** — a deterministic, auditable,
hash-chained calculation of what each person has earned under an agreement they accepted — and, at
the bake, **draft instruments for the board and its counsel**, gated on a recorded board-approval
reference. Never a grant, never an allotment, never an option award.

> **The claim this paragraph used to make is withdrawn.** It said Qatoto "legally executes the
> equity distribution without a founder calling a lawyer every month." That is untrue in all three
> jurisdictions above, and making it is unauthorized-practice-of-law exposure in most US states.
> Every equity surface carries a standing "not legal or tax advice" notice, and the product's job is
> to make the lawyer's month cheap — not to replace them. See
> [R_AND_D_BACKEND_STRUCTURE.md](R_AND_D_BACKEND_STRUCTURE.md) §9.11 and §7A.6 item 4.

Takeaway: the value is a trustworthy record, team trust, and automation — not "AI analysis," and not
a promise about legal execution that cannot be kept.

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
4. **Statement layer (month end)** — the ledger says what someone has earned _so far_; a founder
   needs to know what to **pay this month**. A compensation period sums the member's verified
   minutes at their accepted cash rate (or prorates a flat retainer), takes the equity delta from
   the snapshots, freezes both, hash-chains the result, and requires a second person to countersign
   it. The founder then pays from their own bank or payroll provider and records it; the member
   confirms receipt. **Qatoto holds no money at any point.** Spec: R&D §7A.

    Two properties are load-bearing rather than incidental. Cash is **never** gated on a
    verification verdict — a flagged claim annotates the line and changes no number, because
    conditioning wages on an algorithm is unlawful under the FLSA, EU national wage law and India's
    Code on Wages 2019 §18. And the statement reports **gross only**: no withholding, no tax, no
    social contribution. Qatoto is not a payroll processor.

5. **Baking the pie (exit event)** — dynamic equity can't fluctuate forever. At
   cash-flow breakeven or a priced round, the pie **bakes**: dynamic calculation stops, percentages
   freeze, and the final math generates **draft instruments for the board and counsel** — gated on a
   recorded board-approval reference, and never an issuance in itself (§2).

Maps to `R_AND_D_STRUCTURE.md` §10 `TeamMember.equityShare` and §5.3 Team's equity
split bar — those are the frontend's static mock rendering of this formula's output.
`Milestone.escrowReleaseAmount` (renamed `plannedPayoutInCents`) and the §5.5 Governance
compensation table are the mock rendering of the ledger and statement layers.

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

**What extraction may never extract: affect.** Claims and artifacts only — what was said, what was
claimed, which URLs were cited. Never engagement, sentiment, mood, stress, motivation or confidence,
and never an inference about the speaker's emotional state from their voice, face or word choice.
Article 5(1)(f) of the EU AI Act **prohibits** emotion inference in the workplace outright — not
high-risk, prohibited, and in force since February 2025. The pipeline is already high-risk under
Annex III(4)(b) because it evaluates work performance; adding affect would move it from regulated to
banned.

**Hardware / physical-work edge case.** Git is deterministic; sanding a 3D-printed
chassis isn't. For non-digital work, require a **physical receipt** — uploaded CAD
file, photo of the completed object, or literal material receipt. Run image analysis
on uploads (EXIF check, device fingerprint, reverse-image search) to catch stock
photos.

**24-hour transparency ledger — the failsafe, and the legal control.** AI will occasionally get
tricked, so the final layer is social, not algorithmic. Proposed daily slice allocation posts to a
transparent team dashboard before locking in. Every member gets a 24-hour **Dispute** window. If a
founder claims 10 hours of supplier calls but the team knows they were on vacation, they can
challenge it — disputed slices **freeze outside the pool** until the team reaches consensus. (They
are held out of `totalSlices`, not held as money; the codebase calls this `escrowedSlices`, which
means a slice pool and never a bank account.)

This window is not only a product safeguard. For a member in the EU it is the GDPR Article 22 right
to human intervention, to express a point of view, and to contest a decision with legal or similarly
significant effects — and it is simultaneously the Article 14 human-oversight measure the EU AI Act
requires of a high-risk system. So it is **not configurable**: no setting may disable it, shorten it
to zero, or auto-resolve it, a human must be able to reach a real outcome, and the member must be
told the decision was automated and on what basis. A dispute path that only exists as an endpoint no
screen calls is not, in practice, human oversight.

And it reaches equity only. A disputed or flagged verdict never touches a cash line on a
compensation statement (§3 step 4).

**The technical moat.** A free Gemini prompt cannot replace this. A multi-agent
system that OAuths into GitHub/Jira, pulls commit hashes, runs AST complexity
analysis, detects temporal anomalies, manages a hash-chained dispute ledger, and turns all of it
into a countersigned month-end statement is a large, defensible engineering effort.

**Consent is the wrong lawful basis for an employee.** Everything above is worker monitoring, and
under the GDPR consent given by a worker to their employer is generally invalid — the power
imbalance makes it not freely given (EDPB Opinion 2/2017). The per-provider OAuth grant remains
exactly right as a technical and scope control, but the lawful basis must be contract or legitimate
interest with a documented assessment, and a DPIA is mandatory for systematic monitoring. India's
DPDP Act 2023 does run on notice-and-consent, so the same grant serves both models. Details:
[R_AND_D_BACKEND_STRUCTURE.md](R_AND_D_BACKEND_STRUCTURE.md) §9.10 and §7A.6 item 6.

Maps to `R_AND_D_STRUCTURE.md` §5.2 Daily Logs tab (`aiSummaryChips`,
"Proof of Effort verified" badge) and §5.5 Governance's `verificationStatus`
(`"verified" | "pending"`) — a field the mock hangs on `EscrowLedgerEntry`, which the backend
contract has since replaced with the §7A compensation statement. Those fields are the frontend's
static mock placeholders for this pipeline's real output.
