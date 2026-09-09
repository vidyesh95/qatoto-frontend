# Product

Strategic context for design work on the Qatoto frontend. Companion to `docs/Design.md`,
which covers how it looks; this file covers who it is for and why. Both are read by
`$impeccable` before any design task.

Sibling docs worth reading before a big surface: `docs/PROJECT_IDEA.md` (the strategic
snapshot and the five-businesses tension), `CLAUDE.md` (the thin-client invariant and the
architecture rules), `docs/R_AND_D_STRUCTURE.md` (the eight pillars).

## Register

product

The default register is `product`: design serves the work, it is not the work. The
`(home)`, `(studio)` and `(admin)` shells are the bulk of the surface and set the house
tone — quiet sans chrome, content-forward, no decoration that does not carry information.

`(information)` and `(disclaimers)` are the standing exception. Those are `brand` /
editorial surfaces (serif heroes, `py-24`, long-form rhythm) and a task that targets them
should override the register per task rather than drag them toward app chrome. The
override is per surface in focus, not per session.

## Users

Five personas, all of whom meet on the same pipeline and none of whom can be designed away
in favour of another. The pipeline is only walkable if every one of them can do their part.

**Founder with an idea.** Has a concept and the drive to execute, and lacks capital, a
team and a supply chain. Non-expert in manufacturing, securities, customs and compliance —
which is the entire premise, so a screen may never assume that vocabulary. Job to be done:
get from a posted concept to a team and a funded, tracked build without needing to already
know how any of it works.

**Engineer or specialist joining a team.** Technically fluent, applies to roles, logs
end-of-day effort, reads teardowns and blueprints. Wants density and no hand-holding; an
explanatory tone that helps the founder actively costs this persona time. Job to be done:
evaluate whether a project is real and worth their equity, then contribute and have that
contribution recorded accurately.

**Backer or investor.** Reads the update wall, funding rounds and the governance ledger.
Skeptical by default and correct to be — the whole category is full of claims nobody can
check. Job to be done: verify that work actually happened before and after committing
money. This persona is the reason the honesty rules below are non-negotiable rather than
tasteful.

**Seller or creator on store and studio.** Lists products, uploads videos, tracks orders
and earnings, arrives with a YouTube-Studio-shaped mental model. Job to be done: get a
listing or a video live, and understand what it earned.

**Manufacturer, supplier or ODM.** Pillar 8 of the eight, and the persona the marketing
narrative most often skips. Receives a design and a bill of materials, quotes against it,
and is the counterparty that makes "and then it ships" true. Job to be done: read a spec
precisely enough to quote it. Ambiguity here is not a UX blemish, it is a wrong part in a
crate. This persona is why costs are integer cents and never display strings, and why
`null` on a cost range must render as "nobody costed it" and never as a number.

**The tension between them is real and stays visible.** Founder-legibility and
engineer-density pull opposite ways on the same screen. Resolve it with progressive
disclosure — plain language on the surface, precision one layer in — not by averaging the
two into copy that serves neither.

## Product Purpose

Qatoto is a B2B pipeline that carries a physical product from an idea to a shipped unit:
pitch, form a team, raise, build under a daily-update protocol, ship through the platform's
store and logistics. One identity, one ledger, one audience across all five stages.

Two things follow that are not obvious from the pitch:

- **The frontend is a thin, untrusted presentation layer.** The Express backend is the sole
  source of truth and does all security-sensitive and all heavy work. Every byte from a
  client is attacker-controlled. This is an architecture rule (`CLAUDE.md`), and it is also
  a design rule: a control that implies the client decided something is a lie about the
  system. It is why `upvoteCount`, `commentCount`, `saveCount` and `likeCount` render as
  inert spans and not buttons — the tables they would write to do not exist.
- **The platform holds no money and charges nothing today.** No custody, no escrow in this
  codebase. Money moves off-platform or through a licensed third party. No copy anywhere
  may say "paid", "collected" or "escrowed" about a commitment.

**Success for this stretch: the pipeline is walkable end to end by one real project.**
Idea to team to funding to logged build to shipped unit, however rough at each stop. That
target ranks depth over breadth. A stage that is beautiful but severs the chain is worth
less than a plain one that connects. When a design decision trades polish against
continuity, continuity wins.

## Brand Personality

**Serious, plain, verifiable.**

Money, equity and consent are on the line, so the tone is an audit you can read. Confident
and declarative, never loud. No hype, no exclamation marks, no urgency theatre. Every claim
on screen traces back to a row that exists.

Voice, extending `docs/Design.md` §10:

- Say what happened, not what it means for you. "Submitted, we are checking" beats
  "You're all set!"
- Name the source of a number. An unattributed figure reads as invented on this product,
  because on comparable products it usually is.
- No em dashes in UI copy. Commas, colons, semicolons, periods, parentheses.
- Sentence case for buttons and nav. Uppercase eyebrows, `tracking-[0.18em]`, two to four
  words.
- Marketing voice stays out of product chrome, and product jargon stays out of marketing.

## Anti-references

**The generic SaaS landing page.** Hero metric with a big number and a small label, three
identical icon-and-heading cards, a gradient blob, a testimonial row, a second CTA that
repeats the first. This is the shape a platform like this defaults into, and it is the shape
that tells a skeptical backer the product is a deck. Rework the element with different
structure rather than tuning the template.

Carrying with it, the cross-register bans from the impeccable shared laws, which apply here
in full: side-stripe borders, gradient text, decorative glassmorphism, identical card grids,
modal as the first thought.

## Design Principles

**1. An unverified control is a lie.** Never ship a button whose write has no backing table,
and never ship a number the server did not return. Display-only state renders as a span. The
repo already enforces this by audit — an uncalled hook and an unrendered field are treated as
defects, not as loose ends.

**2. Absence renders nothing.** No media, no section. No cost range, no band. `null` is the
absence of an answer; zero is an answer. Never fabricate a value the server returned as
`null`, and never fill an empty state with a placeholder that could be mistaken for data.

**3. A pending write is not a result.** Claim submits, receipt uploads, dispute raises and
re-verifications answer `202`: the row exists, the verdict does not. Render "we are checking"
and poll. Nothing here is optimistic — these writes are attestations about money, equity and
consent, and an optimistic verdict is an optimistic equity split.

**4. Legibility for the founder, density for the engineer, precision for the manufacturer.**
Layer it. Plain language on the surface, exact figures and units one layer in. Never average
the three into a middle register.

**5. Continuity over polish.** The pipeline has to connect end to end. A rough stage that
hands off correctly outranks a refined one that dead-ends.

**6. No illegal visual states.** UI state is a discriminated union rendered by an exhaustive
`switch` with a `never` default, never a bag of optional fields and loose booleans. A new
variant is a compile error until the UI handles it. Loader-and-error-at-once is not a bug to
fix, it is a state that cannot be constructed.

## Accessibility & Inclusion

**WCAG 2.2 AA**, in both light and dark, as a merge gate rather than an aspiration. Dark mode
is a peer theme, not a toggle, so a new token ships with its `.dark` override and both are
contrast-checked before merge.

Standing requirements, matching `docs/Design.md` §8:

- Semantic landmarks before ARIA. `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`,
  `<footer>`. One `<main>` per page.
- `aria-current="page"` on the active nav link. `aria-hidden="true"` on gradient backdrops,
  blur layers and other ornament.
- Every interactive element reachable and operable by keyboard. Never remove the focus ring
  without a visible replacement (`focus-visible:ring-2 ring-ring`).
- Never encode meaning in color alone. A verification verdict, a variance flag or a branch
  signal carries a label or a shape as well as a tint.
- Non-text alternatives are required, not optional. Decorative icons take `alt=""`; the
  attribute is never omitted.

Two surfaces need extra care because they are the ones that break these rules by default:
the teardown 3D engine (`src/components/home/blueprints/teardowns/engine/`), which must stay
operable and comprehensible without the canvas, and the focus-expanding navbar search, whose
width transition must not move focus or hide the field's own affordance.
