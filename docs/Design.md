---
name: Qatoto
description: A verifiable record for a skeptic. Dense typography, hairline structure, no ornament between the reader and the row.
colors:
  primary-imprint: "oklch(0.4736 0.0805 200.55)"
  primary-imprint-deep: "oklch(0.3133 0.0533 200.58)"
  primary-imprint-bright: "oklch(0.7278 0.1195 200.43)"
  on-imprint: "oklch(1 0 0)"
  surface-wash: "oklch(0.9109 0.0295 199.2757)"
  surface-wash-dark: "oklch(0.3351 0.033 198.7355)"
  accent-wash: "oklch(0.9552 0.0127 196.9434)"
  secondary-wash: "oklch(0.9147 0.0408 265.7133)"
  ground: "oklch(0.9761 0 0)"
  ground-dark: "oklch(0.2178 0 0)"
  surface: "oklch(1 0 0)"
  surface-dark: "oklch(0.252 0 0)"
  ink: "oklch(0.2178 0 0)"
  ink-quiet: "oklch(0.5452 0 0)"
  hairline: "oklch(0.9276 0.0058 264.5313)"
  hairline-dark: "oklch(0.36 0 0)"
  outline-strong: "oklch(0.5677 0.0120 196.82)"
  outline-variant: "oklch(0.8287 0.0178 308.22)"
  muted-field: "oklch(0.931 0 0)"
  destructive: "oklch(0.6368 0.2078 25.3313)"
  chart-1: "oklch(0.4203 0.0688 248.4323)"
  chart-2: "oklch(0.5632 0.073 236.7296)"
  chart-3: "oklch(0.6788 0.0765 238.3401)"
  chart-4: "oklch(0.7875 0.0715 234.0535)"
  chart-5: "oklch(0.8519 0.0561 240.2457)"
typography:
  display:
    fontFamily: "Roboto Serif, ui-serif, Georgia, Cambria, Times New Roman, Times, serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Geist, Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25rem
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Geist, Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: "0.18em"
  prose:
    fontFamily: "Roboto Serif, ui-serif, Georgia, Cambria, Times New Roman, Times, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  code:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25rem
    letterSpacing: "normal"
rounded:
  base: "0.5rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  3xl: "1.5rem"
  pill: "9999px"
spacing:
  hairspace: "0.25rem"
  tight: "0.5rem"
  snug: "0.75rem"
  panel: "1rem"
  roomy: "1.5rem"
  editorial: "2.5rem"
  section: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-imprint}"
    textColor: "{colors.on-imprint}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-imprint-deep}"
    textColor: "{colors.on-imprint}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-imprint}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1rem"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1rem"
  nav-item-active:
    backgroundColor: "{colors.surface-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  nav-item-emphasized:
    backgroundColor: "{colors.secondary-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  card-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "1rem"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.375rem 0.75rem"
  stat-readout:
    backgroundColor: "transparent"
    textColor: "{colors.ink-quiet}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0"
---

# Design System: Qatoto

## 1. Overview

**Creative North Star: "The Audit You Can Read", anchored by "The Bill of Materials"**

The interface is a verifiable record for a skeptic. Every surface exists so that someone
who does not trust the claim can check it, which means the reader must never be more than
one glance from the underlying value. Visually that produces tight typographic density,
flat hairline-delimited layouts and zero decorative ornament. Nothing sits between the
reader and the row.

Mechanically the system demands the precision of a spec sheet. Explicit units on every
value. Strict enforcement of null-is-not-zero, because null is the absence of an answer
and zero is an answer. Exact integer handling, because a bill of materials is quoted by a
manufacturer and an ambiguous figure is a wrong part in a crate. Tabular data that needs no
translation before it can be used. The design of a number is as much a part of this system
as the design of a button.

This system explicitly rejects the generic SaaS landing page: the hero metric with a big
number and a small label, three identical icon-and-heading cards, the gradient blob, the
testimonial row, the second call to action that repeats the first. That shape is what tells
a skeptical backer the product is a deck. Anything that reads as persuasion rather than
record is wrong here, however well it is made.

**Key Characteristics:**

- Dense by default. Body copy is 14px at medium weight; labels are 12px. The interface
  assumes a reader who is working, not browsing.
- Flat and delimited by hairline. Structure comes from 1px borders, not from shadow.
- Pill geometry for anything you press or that indicates state; soft rectangles for
  anything that holds content.
- Serif is reserved for editorial and long-form surfaces. Product chrome is sans, always.
- Dark mode is a peer theme, not a toggle. Every token ships with its `.dark` counterpart
  and both are contrast-checked before merge.
- Motion is confined to color and opacity. The system does not choreograph.

## 2. Colors: The Material 3 Split

The palette is Material 3 throughout, in a single teal-cyan hue family around 199 to 200
degrees, with untinted greys carrying every neutral. Its defining trait is not a colour, it
is a fracture: `src/app/globals.css` tokenized only the M3 **container** tones, while
components hardcode the M3 **base** tones of the same roles. `#D6E3FF` converts to
`oklch(0.9147 0.0408 265.71)`, which is byte-identical to `--secondary`. The two halves are
the same system, half of it written down.

### Primary

- **Primary Imprint** (`oklch(0.4736 0.0805 200.55)`, ships as `#00696E`): the authoritative
  action colour. Committed actions, submit and confirm controls, links inside product
  chrome, the wordmark on `(information)` and `(disclaimers)`. It is called Imprint rather
  than Ink precisely so that nobody reaches for it to style body text. It marks a decision,
  never a paragraph.
- **Primary Imprint Deep** (`oklch(0.3133 0.0533 200.58)`, ships as `#00393C`): the pressed
  and hover state under Primary Imprint. Also the dark-theme ground for imprinted surfaces.
- **Primary Imprint Bright** (`oklch(0.7278 0.1195 200.43)`, ships as `#1DBDC5`): the
  dark-theme counterpart of Primary Imprint, where the deep tone would fail contrast.

### Secondary

- **Surface Wash** (`oklch(0.9109 0.0295 199.2757)`, the `--primary` token): subtle chrome
  and structure. The active navigation pill, the search-field hairline, focus accents. It is
  a pale wash carrying dark text, not an accent, and it must never be asked to carry a
  call to action.
- **Secondary Wash** (`oklch(0.9147 0.0408 265.7133)`): the one place a second hue appears,
  used to emphasize a single featured navigation item. Sparing by definition; two emphasized
  items in one list means neither is emphasized.
- **Accent Wash** (`oklch(0.9552 0.0127 196.9434)`): tertiary callouts, where Surface Wash
  would still be too present.

### Neutral

- **Ink** (`oklch(0.2178 0 0)`): default text, and the foreground on every wash.
- **Ink Quiet** (`oklch(0.5452 0 0)`): secondary text, captions, unit suffixes, the readout
  labels beside a figure.
- **Ground** (`oklch(0.9761 0 0)`): the page. Painted explicitly on `body` in an
  `@layer base` rule, because the tokens existed for a long time before anything applied
  them and the page was white by browser default rather than by decision.
- **Surface** (`oklch(1 0 0)`): cards, popovers, the sidebar, and every raised panel.
- **Hairline** (`oklch(0.9276 0.0058 264.5313)`): the border that does all the structural
  work, used 639 times against 110 total shadow uses.
- **Outline Strong** (`oklch(0.5677 0.0120 196.82)`, ships as `#6F7979`): form-field borders
  and field labels. The one neutral heavy enough to bound an input.
- **Outline Variant** (`oklch(0.8287 0.0178 308.22)`, ships as `#CAC4D0`): the softer
  divider used inside R&D panels and dashed empty-state boundaries.

### Named Rules

**The Container Rule.** A wash is a container tone. It carries dark text and it never carries
a call to action. If a control needs to be pressed, it takes Primary Imprint at full strength.
If a control needs to show that it is current, it takes Surface Wash. Confusing the two
produces a pale mint button that reads as disabled.

**The One Hue Rule.** Every meaningful colour in this system lives between 196 and 201 degrees.
The blue at 265 is one emphasized nav item and the red at 25 is destruction. A fourth hue
requires a role that does not exist yet, not a preference.

**The Untinted Neutral Debt.** Every grey in the token scale is chroma 0, and `--card`,
`--input` and `--popover` are literally `oklch(1 0 0)`, pure white. This is a departure from
the tinting doctrine, not a decision. New neutrals should carry chroma 0.005 to 0.01 toward
199 degrees. Do not "fix" the existing 32 tokens as a side effect of unrelated work.

**The Dark Chart Regression.** `--chart-1` through `--chart-5` are an ordered blue ramp in
light mode and pure greyscale in dark mode. Any chart using them loses hue on theme switch,
so a series must never be identified by colour alone. Label the series or shape the mark.

## 3. Typography

**Display Font:** Roboto Serif (with `ui-serif`, Georgia, Cambria, Times New Roman fallbacks)
**Body Font:** Geist (with Roboto, `ui-sans-serif`, `system-ui` fallbacks)
**Label/Mono Font:** Geist Mono (with `ui-monospace`, SFMono-Regular, Menlo fallbacks)

All three load once in `src/app/layout.tsx` through `next/font/google` with `display: "swap"`,
and resolve as `--font-serif`, `--font-sans` and `--font-mono`.

**Character:** A working sans at small sizes carrying almost the entire product, with a serif
held in reserve for the two surfaces where reading is the task. The pairing is not decorative
contrast; it is a boundary. Serif signals that you are reading, sans signals that you are
working, and mono signals that the value is exact.

### Hierarchy

- **Display** (600, `clamp(3rem, 8vw, 6rem)`, line-height 1): marketing heroes on
  `(information)` only. Serif. Appears roughly 50 times in the entire codebase and should
  stay that rare.
- **Headline** (600, `clamp(1.875rem, 4vw, 2.25rem)`, line-height 1.15): section headers.
  Sans on product surfaces, serif on editorial.
- **Title** (500, `clamp(1.25rem, 2vw, 1.5rem)`, line-height 1.3): panel and card headings,
  subsection breaks.
- **Body** (500, `0.875rem`, line-height `1.25rem`): the real body size of this product,
  used 2,211 times. Cap running text at 65 to 75 characters.
- **Label** (500, `0.75rem`, line-height `1rem`): captions, units, metadata, stat readouts,
  and the second most common size in the codebase at 2,183 uses.
- **Eyebrow** (500, `0.75rem`, `letter-spacing: 0.18em`, uppercase): section kickers. Two to
  four words, never a sentence.
- **Prose** (400, `1.125rem`, line-height 1.625): serif long-form on blogs, press and
  disclaimers, in a `max-w-3xl` measure.
- **Code** (500, `0.875rem`): identifiers, slugs, enum values, cursor tokens, anything that
  must be copied exactly.

### Named Rules

**The Two-Size Rule.** This product is written at 14px and 12px. Between them they account for
4,394 of roughly 4,900 type-size declarations. A new size in product chrome is a claim that
the existing two cannot express the hierarchy, and that claim is almost always false. Reach
for weight, colour or spacing before reaching for a third size.

**The Medium-Default Rule.** The resting weight is 500, not 400. `font-medium` appears 1,986
times against 17 uses of `font-normal`. Emphasis is therefore 600, and there is effectively no
bold in this system: `font-bold` appears once.

**The Serif Boundary.** Serif never enters product chrome, and marketing voice never enters a
product screen. A serif heading inside `(home)`, `(studio)` or `(admin)` is a bug.

## 4. Elevation

This system is flat and delimited by hairline. Surfaces sit at rest on the page and are
separated from one another by a 1px `Hairline` border, not by a shadow. The evidence is
unambiguous: 639 `border-border` declarations against 110 total shadow uses across the whole
application. Depth is not a visual effect here, it is a structural claim, and a border makes
that claim without pretending the panel is a physical object.

Shadow is reserved for elements that genuinely float above the page and would otherwise be
ambiguous: popovers, dialogs, the PDF modal sheet, sticky bars. If an element is in the
document flow, it does not get a shadow.

### Shadow Vocabulary

- **Resting hairline** (`border: 1px solid var(--border)`): the default separator. Not a
  shadow at all, and named here because it is what a shadow would otherwise be doing.
- **shadow-sm** (`0 1px 3px 0 hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)`): a panel
  that has lifted slightly off the flow. The most-used shadow at 39 occurrences.
- **shadow-lg** (`0 1px 3px 0 hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1)`): floating
  menus, comboboxes, the popover layer.
- **shadow-2xl** (`0 1px 3px 0 hsl(0 0% 0% / 0.25)`): modal sheets over a scrim.

Note that the whole ladder shares the same `0 1px 3px` base and differs only in the second
layer. The vocabulary is deliberately narrow, and the shadow colour is pure black, which is
the same untinted-neutral debt recorded in section 2.

### Named Rules

**The Hairline-First Rule.** Before adding a shadow, ask whether a border would say the same
thing. It almost always will. A shadow is permitted only when the element leaves the document
flow.

**The Nested Panel Prohibition.** A bordered panel inside a bordered panel is forbidden. Two
hairlines with 16px between them read as a rendering error, not a hierarchy. Use spacing, an
eyebrow label or a rule, and never a second box.

## 5. Components

Components are dense, precise and instrument-like: small type, hairline borders, tight
tolerances. Controls behave like calibrated readouts rather than decorative affordances, and
they stay quiet until engaged. There is no skeuomorphism anywhere in this system. Precision is
expressed through alignment, explicit units, tabular values and unambiguous state, never
through visual machinery.

### Buttons

- **Shape:** fully rounded pill (`9999px`). `rounded-full` appears 1,110 times, more than every
  other radius combined; the pill is the single strongest signal in the visual language.
- **Primary:** `Primary Imprint` ground with white text, `0.625rem 1.25rem` padding, body type
  at weight 500. This is the committed action: submit, confirm, record, publish.
- **Hover / Focus:** ground steps to `Primary Imprint Deep` over 200ms `transition-colors`. No
  transform, no shadow, no scale.
- **Outline:** transparent ground, `Primary Imprint` text and a 1px `Primary Imprint` border at
  40 percent. The secondary of a paired action.
- **Quiet:** transparent ground, `Ink` text, `hover:bg-muted/50`. Toolbar and menu actions.
- **Disabled:** `opacity-40` with `cursor-not-allowed`. Never a colour change, because a
  desaturated teal reads as a different button rather than the same button unavailable.

### Chips

- **Style:** `Surface` ground at 70 percent, 1px `Hairline` border, pill radius, label type,
  `0.375rem 0.75rem` padding.
- **State:** selected chips take `Primary Imprint` ground with white text and a transparent
  border. Filter chips and metadata chips share the shape, so a filter chip must carry an
  affordance, a caret or a dismiss control, that a metadata chip does not.

### Cards / Containers

- **Corner Style:** `1rem` (`rounded-2xl`) is the working default, with `0.75rem` and `0.5rem`
  for tighter nested content. The `1.5rem` editorial card exists but is rare, 22 uses, and
  belongs to marketing surfaces.
- **Background:** `Surface` on `Ground`. In dark mode, `surface-dark` on `ground-dark`.
- **Shadow Strategy:** none. See section 4.
- **Border:** 1px `Hairline`, always. This is what makes the card a card.
- **Internal Padding:** `1rem` is the default and covers 279 of the panels in the codebase.
  `1.5rem` for a card that is the primary content of its region, `2.5rem` for editorial.

### Inputs / Fields

- **Style:** transparent ground, 1px `Outline Strong` border, `0.5rem` radius,
  `0.5rem 0.75rem` padding, body type. Labels are label type in `Outline Strong` above the
  field. The canonical recipe lives in `src/components/ui/field-classes.ts`.
- **Focus:** the border shifts to `Primary Imprint`. This is the current shipped behaviour and
  it is thin: `focus:` fires on mouse click as well as keyboard, and a border-colour change
  alone is a weak keyboard indicator against a WCAG 2.2 AA gate. New fields should add
  `focus-visible:outline-2 focus-visible:outline-offset-2` on top of it rather than replicate
  the bare border shift.
- **Error:** message in `Destructive` at label size beneath the field. The field border does
  not change colour alone, because colour alone is not an error signal.
- **Disabled:** `opacity-40`, and the label stays legible.

### Navigation

- **Style:** pill rows. `flex items-center gap-3 rounded-full px-4 py-3 text-sm
  transition-colors`, with a 24dp Material SVG icon and a sans label.
- **Default:** `Ink` text on transparent, `hover:bg-muted/50`.
- **Active:** `Surface Wash` ground with `Ink` text, plus `aria-current="page"`. The pill is
  never the only signal; the icon also switches from Material `FILL0` outline to `FILL1` solid.
- **Emphasized:** a single featured item takes `Secondary Wash` at `0.75rem` radius, which is
  the one place the square-ish corner appears in a nav list. When that item is also active it
  reverts to the pill so that active state stays one shape everywhere.
- **Shell geometry:** navbar is `sticky top-0 z-50` at 56px. The sidebar is
  `sticky top-14 h-[calc(100dvh-56px)]`, 320px expanded and 80px collapsed, with a right
  hairline. Below `md` the sidebar is replaced by a bottom nav whose items are 12px labels
  under a pill-backed icon.
- **Mobile:** the bottom nav is the primary navigation under `md`. It carries the same active
  treatment, a `Surface Wash` pill behind the icon only.

### Stat Readout

The signature component, and the one that carries the North Star. A stacked figure over a
label, in a fixed gutter, rendered as a `<span>` and never a `<button>`. It exists because
several counts in this product are display-only: they have no backing table, so a control that
implied you could increment one would be a lie about the system. `ShowcaseVoteBox` is a
40x44 caret-over-count gutter; `BlueprintStatReadout` renders three inert counts beside exactly
one real control.

- **Figure:** body type, weight 500, `Ink`, tabular alignment.
- **Label:** label type, `Ink Quiet`, with the unit spelled out.
- **Absent value:** renders nothing. Not a dash, not a zero.

### Named Rules

**The Inert Span Rule.** A count with no backing write renders as a `<span>`. The moment it
becomes a `<button>` it promises a mutation that the backend cannot honour.

**The Pill Means Pressable Rule.** Full-round geometry marks something you press or something
that reports state. Content containers take soft rectangles. A pill-shaped read-only card is a
false affordance.

## 6. Do's and Don'ts

### Do:

- **Do** write product body copy at `0.875rem` weight 500 and metadata at `0.75rem` weight 500.
  Two sizes carry this product.
- **Do** separate surfaces with a 1px `Hairline` border. Reach for a border before a shadow,
  every time.
- **Do** use `Primary Imprint` (`#00696E`, `oklch(0.4736 0.0805 200.55)`) for committed actions
  and `Surface Wash` (`oklch(0.9109 0.0295 199.2757)`) for active state. They are different
  jobs in the same hue.
- **Do** put `aria-current="page"` on the active nav item and switch the Material icon from
  `FILL0` to `FILL1`. The pill is a reinforcement, not the signal.
- **Do** spell out the unit next to every figure: `delayMs`, `priceInCents`, `widthPx`. A
  manufacturer quotes from these.
- **Do** render an absent value as nothing at all. No media, no section. No cost range, no band.
- **Do** ship every new token with its `.dark` counterpart and check contrast in both themes
  before merge.
- **Do** confine motion to `transition-colors` and `transition-opacity` at 200ms. If a
  transition is needed at all, that is almost certainly the one.
- **Do** label a chart series or shape its mark. `--chart-1` through `--chart-5` are greyscale
  in dark mode and colour cannot be the only identifier.

### Don't:

- **Don't** build the generic SaaS landing page. No hero metric with a big number and a small
  label, no three identical icon-and-heading cards, no gradient blob, no testimonial row, no
  second call to action that repeats the first. PRODUCT.md names this as the anti-reference
  because it is the shape that tells a skeptical backer the product is a deck.
- **Don't** use `border-left` or `border-right` greater than 1px as a coloured accent stripe on
  a card, list item, callout or alert. Rewrite the element with a full border, a background
  tint, a leading number, or nothing.
- **Don't** apply `background-clip: text` over a gradient. Emphasis comes from weight and size.
- **Don't** use blur or glass decoratively. If a surface is not floating over content that must
  remain partly visible, it is opaque.
- **Don't** nest a bordered panel inside a bordered panel.
- **Don't** repeat an identical card grid. If four cards share an icon, a heading and two lines
  of text, the content wanted a table or a list.
- **Don't** reach for a modal first. Exhaust inline and progressive alternatives.
- **Don't** put a serif face in `(home)`, `(studio)` or `(admin)` chrome.
- **Don't** add a fourth hue. Everything meaningful lives between 196 and 201 degrees, plus one
  blue for a single emphasized nav item and one red for destruction.
- **Don't** write a new hardcoded hex. There are 2,119 of them already and each one is a place
  the theme cannot reach. `#00696E` appears 636 times, `#6F7979` 567, `#CAC4D0` 551,
  `#191C1C` 288. New work uses the token; converting an existing file is its own change with
  its own dark-mode check.
- **Don't** animate width, height, or any other layout property. The sidebar's
  `transition-all duration-300` across a 320px to 80px collapse is existing debt, not a
  pattern to copy.
- **Don't** style body text with `Primary Imprint`. It marks a decision, never a paragraph.
  This is why the colour is named Imprint and not Ink.
- **Don't** ship a control whose write has no backing table, and don't turn an inert count into
  a button.
- **Don't** signal anything with colour alone: not a verdict, not a variance flag, not a branch
  signal, not a chart series.

**The audit test.** If a screen could be screenshotted into a pitch deck without looking out of
place, it is too persuasive. If a skeptic cannot find the number they came for within one
glance, it is too decorated. Both failures look like good design in isolation.
