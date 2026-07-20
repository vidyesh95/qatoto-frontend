# Design.md

The Qatoto design system. This is a living mirror of what currently ships in code — not aspirational. If a token, recipe, or pattern is documented here, you can grep for it in the repo and find it. If you change the code, update this file.

Source files referenced throughout:

- `src/app/globals.css` — token source of truth
- `src/app/layout.tsx` — font loading
- `src/components/home/navbar.tsx`, `src/components/home/sidebar.tsx` — shell + nav recipes
- `src/components/information/about/*` — marketing type-scale reference
- `src/components/information/press/[slug]/*`, `src/components/information/blogs/[slug]/*` — long-form prose recipe
- `src/state/sidebar-context.tsx` — shell state

---

## 1. Principles

- **Editorial over UI-chrome.** Marketing surfaces lead with serif headlines and long-form rhythm. Product surfaces stay quiet so content can speak.
- **Tokens, not hex.** Every color goes through a CSS custom property in `globals.css`. Hardcoded hex values are bugs.
- **Pill geometry.** Rounded-full nav items, rounded-full buttons, rounded-3xl cards. Sharp corners are reserved for inputs and the editor canvas.
- **Dark mode is a peer, not a toggle.** Every token has a `.dark` override; new tokens must add both.
- **Generous whitespace.** Marketing sections breathe (`py-24`, `max-w-6xl`). Don't compress to fit more above the fold.
- **Semantic HTML before ARIA.** Reach for `<nav>`, `<aside>`, `<main>`, `<article>` first. ARIA fills the gaps.

---

## 2. Foundations

### 2.1 Color tokens

Defined in `src/app/globals.css` under `:root` (light) and `.dark` (dark). Exposed to Tailwind via `@theme inline` (lines 100–148) as `--color-*` so utilities like `bg-primary`, `text-muted-foreground`, `border-border` resolve automatically.

| Token                                        | Role                                       |
| -------------------------------------------- | ------------------------------------------ |
| `--background` / `--foreground`              | Page surface and default text              |
| `--card` / `--card-foreground`               | Elevated surfaces (cards, dialogs)         |
| `--popover` / `--popover-foreground`         | Floating menus, tooltips                   |
| `--primary` / `--primary-foreground`         | CTAs, active nav, focus accents            |
| `--secondary` / `--secondary-foreground`     | Emphasized sidebar items                   |
| `--muted` / `--muted-foreground`             | Secondary text, subtle hover surfaces      |
| `--accent` / `--accent-foreground`           | Tertiary highlights                        |
| `--destructive` / `--destructive-foreground` | Errors, irreversible actions               |
| `--border`, `--input`, `--ring`              | Hairlines, form fields, focus rings        |
| `--sidebar`, `--sidebar-*`                   | Sidebar shell (parallel scale)             |
| `--chart-1` … `--chart-5`                    | Data viz, ordered light→dark in light mode |

All colors use **OKLCH** for perceptual uniformity. When adding a token, match this format — do not introduce `hsl()` or `#hex`.

### 2.2 Radius

`--radius: 0.5rem` is the base. Derived in `@theme inline`:

- `--radius-sm` = `calc(var(--radius) - 4px)`
- `--radius-md` = `calc(var(--radius) - 2px)`
- `--radius-lg` = `var(--radius)`
- `--radius-xl` = `calc(var(--radius) + 4px)`

In practice, common values used by recipes: `rounded-full` (pills, buttons), `rounded-xl` (emphasized nav), `rounded-3xl` (cards), `rounded-md` (inputs).

### 2.3 Shadow

Ladder from `--shadow-2xs` through `--shadow-2xl` in `globals.css:53–60`. Most surfaces are flat; reach for shadow only for floating elements (popovers, modals, sticky bars).

### 2.4 Spacing

`--spacing: 0.25rem` (Tailwind default). Use the Tailwind scale (`gap-2/3/4/6`, `p-4/6/10`). Don't introduce arbitrary `[7px]` values without reason.

### 2.5 Dark mode

Activated via `.dark` class on a root element. Every `:root` token has a `.dark` counterpart. **Never hardcode a hex** — if dark mode looks wrong, fix the token, not the consumer.

### 2.6 Known gaps

- Brand teal `#00696E` appears hardcoded in `src/components/home/navbar.tsx`. It should resolve to a token. Tracked, not fixed in this doc.

---

## 3. Typography

### 3.1 Families

Loaded once in `src/app/layout.tsx` via `next/font/google` with `display: "swap"`, exposed as CSS variables:

| Variable       | Family                                     | Use                               |
| -------------- | ------------------------------------------ | --------------------------------- |
| `--font-sans`  | **Geist** (with Roboto + system fallbacks) | Default UI, body                  |
| `--font-serif` | **Roboto Serif**                           | Marketing heroes, long-form prose |
| `--font-mono`  | **Geist Mono**                             | Code, fixed-width data            |

Fallback stacks live in `globals.css:37–44`.

### 3.2 Scale recipes

These are the recurring Tailwind patterns. Reuse them; don't invent new sizes.

| Role            | Recipe                                                      |
| --------------- | ----------------------------------------------------------- |
| Marketing hero  | `text-5xl sm:text-7xl md:text-8xl font-serif font-semibold` |
| Section header  | `text-3xl md:text-4xl font-semibold`                        |
| Subsection      | `text-xl md:text-2xl`                                       |
| Body lead       | `text-lg text-muted-foreground`                             |
| Body            | `text-base`                                                 |
| Eyebrow / label | `text-xs font-medium uppercase tracking-[0.18em]`           |
| Long-form prose | `font-serif text-lg leading-relaxed`                        |

UI text is sans, marketing headlines and article bodies are serif, code is mono. Don't mix serif into product chrome.

---

## 4. Color usage

- **Primary teal** → CTAs, active nav state, focus accents, links in product chrome.
- **Secondary purple** → emphasized sidebar items only (e.g., a featured surface). Sparing.
- **Muted** → secondary text (`text-muted-foreground`) and subtle hover surfaces (`hover:bg-muted/50`).
- **Destructive** → errors and irreversible actions only. Never for "warning" or "info."
- **Accent** → tertiary callouts where primary would be too loud.
- **Borders** → `border-border` everywhere; do not use raw gray classes.

---

## 5. Spacing & layout

### 5.1 Containers

- Section content: `max-w-6xl mx-auto`.
- Long-form article body: `max-w-3xl mx-auto` (see press and blog detail pages).
- Forms: `max-w-md` or narrower.

### 5.2 Section rhythm

- Standard section padding: `px-6 py-24`.
- Hero blocks: `pt-24 pb-32`.
- Between adjacent sections, prefer the section's own padding over outer margins.

### 5.3 Shell (route group `(home)`)

- Navbar: `sticky top-0 z-50`, height ≈ 64px.
- Sidebar: `h-[calc(100vh-64px)]`, `w-80` expanded / `w-20` collapsed. State from `useSidebar()` in `src/state/sidebar-context.tsx`. `useSidebar` only exists under `(home)`.
- Main: `flex-1` fills remaining viewport.

### 5.4 Gaps

Default to `gap-2`, `gap-3`, `gap-4`, `gap-6`. Mixed-direction layouts use `gap-x-* gap-y-*`.

---

## 6. Component recipes

These are utility patterns, not exported React components. If you find yourself copy-pasting one more than three times, raise extracting it for review — don't extract preemptively.

### Pill nav item (sidebar / nav)

```
flex items-center gap-3 rounded-full px-4 py-3
```

- Active: `bg-primary text-primary-foreground`
- Emphasized (featured item): `rounded-xl bg-secondary text-secondary-foreground font-medium`
- Hover (inactive): `hover:bg-muted/50`
- Set `aria-current="page"` on the active link.

### Button

```
inline-flex items-center justify-center rounded-full h-12 px-6
```

Variants are background/border combinations against the token palette:

- Primary: `bg-primary text-primary-foreground`
- Surface: `bg-card text-card-foreground border border-border`
- Quiet: `bg-transparent hover:bg-muted/50`

### Card

```
rounded-3xl border border-border bg-card p-10
```

Grid layouts of cards typically use `grid sm:grid-cols-2 lg:grid-cols-4 gap-6`.

### Badge / pill chip

```
inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm
```

### Search input (focus-expanding)

```
transition-[width] focus:w-[428px] rounded-full border border-input bg-input px-4 py-2
```

Used in the navbar; the width transition is intentional — keep it.

### Long-form prose

```
prose prose-neutral font-serif text-lg leading-relaxed
```

Headings nested inside take their cue from the section/subsection recipes above.

---

## 7. Iconography

- **Library:** Material Design SVGs in `public/icons/`, sized at 24dp.
- **Active vs inactive:** Material's `FILL0` (outline) for inactive states, `FILL1` (filled) for active. Pattern lives in `src/components/home/sidebar.tsx`.
- **Rendering:** Next.js `<Image>` with explicit `width`/`height`.
- **Alt text:** required. Decorative-only icons use `alt=""`. Don't omit the attribute.
- **Not in use:** `lucide-react`, `framer-motion`. Don't add these without a design discussion — the visual language is icon-and-typography, not animation-driven.

---

## 8. Accessibility

- **Landmarks:** `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`, `<footer>`. One `<main>` per page.
- **Active page:** `aria-current="page"` on active nav links.
- **Decorative layers:** `aria-hidden="true"` on gradient backdrops, blur overlays, and other ornamental wrappers.
- **Keyboard:** all interactive elements must be reachable and operable by keyboard. Don't kill the default focus ring without providing a visible replacement (`focus-visible:ring-2 ring-ring`).
- **Color contrast:** when introducing a new token, check WCAG AA in both light and dark before merging.

---

## 9. Route-group chrome

Visual conventions per App Router group (see CLAUDE.md for the architectural side):

| Group           | Chrome                                 | Tone                                          |
| --------------- | -------------------------------------- | --------------------------------------------- |
| `(home)`        | Navbar + Sidebar via `SidebarProvider` | Product. Quiet sans UI.                       |
| `(information)` | Marketing chrome, no sidebar           | Editorial. Serif heroes, generous whitespace. |
| `(disclaimers)` | Minimal navbar only                    | Reading. Long-form text dominates.            |
| `(auth)`        | No shared chrome                       | Focused. Single-column form, full-screen.     |

Don't import shell pieces across groups (e.g., no `Sidebar` in `(information)`).

---

## 10. Voice

- Confident and declarative. Show, don't hedge.
- Buttons and nav: **sentence case** ("Sign in", "Your videos").
- Page H1s: title case is acceptable for marketing pages; sentence case for product pages.
- Eyebrow labels: **UPPERCASE** with `tracking-[0.18em]`. Keep them short (2–4 words).
- Avoid product jargon in marketing copy. Avoid marketing copy in product UI.

---

## 11. Updating this doc

- **New color, radius, or shadow** → update §2 and add the `.dark` override.
- **New recurring utility recipe** (used in 3+ places) → add it to §6.
- **New route group or layout shell** → update §9.
- **One-off styles** → do not document. The doc only covers patterns.
- When in doubt, prefer reusing an existing recipe over inventing a new one. If the existing recipe doesn't fit, raise it before adding to this file.
