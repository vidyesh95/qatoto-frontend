# Remaining work — a register, not the inventory

Things found while building something else, deliberately **not** fixed at the time, written
here so they are not lost. Each entry names the file that proves it, so none of them has to be
taken on trust.

This is a short register. It is not a product roadmap — `src/lib/roadmap/site-roadmap.ts` is
the map of surfaces, and `todo.md` is the store-wiring log.

---

## 1. ~~The sidebar has no session gating at all~~ — STALE, this shipped

**Checked against the file on 2026-08-27: none of the below is true any more.**
`sidebar.tsx` imports `useViewerSignedIn`, takes an `isViewerSignedIn` prop describing what the
SERVER saw, filters every section on a per-item `requiresSession` flag and suppresses a section
whose items were all filtered out. `sidebar-slot.tsx` is the server wrapper that supplies the
boolean — and its own header narrates fixing precisely the defect described here, so this entry
outlived its fix by some margin. "Sign out" is not in the sidebar at all; a destination list holds
no actions, and it lives in the account menu.

The original text, kept because the REASONING below about not hoisting the cookie read is still
correct and still worth following:

> `src/components/home/layout/sidebar.tsx` contains no `useSession`, no `useViewerSignedIn` and
> no `hasCallerSession` — the whole file, every section. So an anonymous visitor is shown
> **Your account**, **Cart**, **Orders and returns**, **Listings**, **Sales** and **Wishlist**
> as though they were theirs.

**This is why "Sign out" rendering to signed-out visitors went unnoticed** for as long as that
row existed: there was nothing anywhere in the file that could have hidden it.

The fix already has a precedent to copy. `src/components/home/layout/navbar-account-slot.tsx`
awaits `hasCallerSession()` in a small server wrapper and passes the boolean down, so only that
subtree suspends and the layout stays synchronous — its header explains why the read must be
contained rather than hoisted into `(home)/layout.tsx`. The sidebar needs the same shape, plus
`useViewerSignedIn` on the client half so the first client render matches the server's.

Note what the fix must **not** do: awaiting the cookie in the layout would turn every
prerendered route in `(home)` from `◐ (Partial Prerender)` into `ƒ (Dynamic)`.

---

## 2. ~~Sixteen routes are stubs that render a bare `<h1>`~~ — SHIPPED

`rg -l "return <h1>" src/app` now finds **nothing**. It was fifteen, not sixteen: this file
already had the `(home)` count right at three, and `todo.md` did not.

- **Three under `(home)`** — `/customer-service`, `/advertise-with-us`, `/policies-and-safety` —
  are real pages now: authored content, `noindex` removed, `kind: "route"` on the roadmap, listed
  in `sitemap.ts`, and `/policies-and-safety` added to the sidebar's footer so it is reachable at
  all. None invents a capability the backend lacks; each is a directory or a hub over surfaces
  that already work.
- **Nine under `(studio)`** render `studio-planned-page.tsx` — the roadmap summary verbatim, what
  the page will do, and a link to the surface that does the job today WHERE ONE TRULY EXISTS. Six
  have no such link and say so rather than inventing one.

    **They stay `kind: "planned"`, and that is the point.** All nine have no backend at all, so
    explaining the absence well is not the same as filling it. A `route` on the roadmap is a claim
    the capability exists.

- **Two graduated: `/studio/analytics` and `/studio/comments`.** They were the only two of the
  twelve whose data already existed and simply had no reader — `creator_stats.total_view_count`
  and `published_video_count` were maintained by three services and selected NOWHERE, and the
  creator-may-delete-a-comment-on-their-own-video authorization had been correct all along with
  no route to list those comments. Both are `kind: "route"` now. See `todo.md` §25, including the
  two `published_video_count` drift sources they exposed — both fixed, with a reconciler.

**`/your-account` and `/settings` are GONE, and are not coming back** — they were the cheap
two named here, they were built as seventeen routes across two nested trees, and they were then
deleted. The entry's premise was wrong: the 8 identity panels and 3 preference panels were not
"trapped" in the 360px account dropdown, they were already the dropdown's contents, so the two
route trees became a second list of the same rows maintained in parallel. What replaced them is
a sub-panel of that dropdown — `components/home/account/menus/your-account-menu.tsx` — which
reads the account rather than commanding it: label on the left, current value on the right.
The preference persistence Part 1 added survives. See `todo.md` for the full reversal, including
why the Phone number row is permanently "Not set" until the backend grows a phone column.

Note the count: this heading said "Seventeen" and then listed six routes under a bullet
labelled "Five", so the real number before that work was **eighteen**. It is sixteen now.

---

## 3. Twenty-one of the twenty-four notification kinds are unproven against live data

The bell is wired end to end and a throwaway harness passed **156/156** live checks, but only
three kinds have ever met a real payload: `project_invite_received`, `project_invite_revoked`
and `research_program_rejected`.

Two specific holes, both structural rather than lazy:

- **The system-actor branch.** `actorName === null` — a nightly job or the verification
  pipeline, where `format.ts` must say "Your effort claim was verified" and never "Someone
  verified your claim" — is only ever produced by `effort_claim_verdict_reached`. Reaching it
  needs a full proof-of-effort run, not an HTTP call.
- **`project_invite_accepted` / `_declined`.** The invitee resolves the project by slug and a
  **draft** project is invisible to a non-member, so both answer `404 Project not found`.
  Proving them means publishing a project, which is public content.

Two backend behaviours worth knowing before writing another harness, both found by running one
rather than by reading a doc: only **one live invite per person** is allowed (a second is a
`409`), and `POST /notifications/read` is idempotent — re-marking the same id returns
`markedCount: 0` rather than an error.

---

## 4. The Playwright sidebar page object has drifted

`tests/pages/sidebar.po.ts`'s `SIDEBAR_ROUTES` lists four routes that **do not exist**:
`/create`, `/ai`, `/your-videos`, `/your-sales`. The sidebar links `/studio`, has no AI entry,
and uses `/sales`. `tests/specs/sidebar-navigation.spec.ts` iterates that map, so it is
asserting against a sidebar from an earlier shape of the app.

Left alone on purpose — CLAUDE.md says not to modify tests unless asked. Named here so the
next person to run the E2E suite knows the failures are the fixture, not the app.
