# Remaining work — a register, not the inventory

Things found while building something else, deliberately **not** fixed at the time, written
here so they are not lost. Each entry names the file that proves it, so none of them has to be
taken on trust.

This is a short register. It is not a product roadmap — `src/lib/roadmap/site-roadmap.ts` is
the map of surfaces, and `todo.md` is the store-wiring log.

---

## 1. The sidebar has no session gating at all

`src/components/home/layout/sidebar.tsx` contains no `useSession`, no `useViewerSignedIn` and
no `hasCallerSession` — the whole file, every section. So an anonymous visitor is shown
**Your account**, **Cart**, **Orders and returns**, **Listings**, **Sales** and **Wishlist**
as though they were theirs.

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

## 2. Sixteen routes are stubs that render a bare `<h1>`

`rg -l "return <h1>" src/app` finds them. All are marked `kind: "planned"` in
`src/lib/roadmap/site-roadmap.ts`, so the public roadmap is honest about them — they are
unbuilt, not broken.

- **Twelve under `(studio)`**: analytics, comments, subtitles, copyright, customize, earn,
  funding, pitches, team, learn, support, feedback
- **Four under `(home)`**: `/customer-service`, `/advertise-with-us`, `/report-history`,
  `/policies-and-safety`

**`/your-account` and `/settings` are DONE** — they were the cheap two named here, and the
entry said why: all 8 identity panels and the 6 preference panels already existed and were
already wired (`PATCH /users/me`, `/users/me/handle`, `/users/me/photo`,
`GET /users/me/linked-accounts`, better-auth passkeys, phone and multi-session), just trapped
inside the 360px account dropdown. They needed a host, not a feature, and they now have one:
seventeen routes across two nested trees, plus the preference persistence the dropdown never
had. See `todo.md` for the two follow-up parts.

Note the count: this heading said "Seventeen" and then listed six routes under a bullet
labelled "Five", so the real number before that work was **eighteen**. It is sixteen now.

---

## 3. Twenty-two of the twenty-five notification kinds are unproven against live data

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
