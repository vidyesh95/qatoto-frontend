# Remaining work — a register, not the inventory

Things found while building something else, deliberately **not** fixed at the time, written here so
they are not lost. Each entry names the file that proves it, so none has to be taken on trust.

This is a short register — one entry short, at the moment, and that is the honest state rather than
a sign the file needs padding. It is not a product roadmap: `src/lib/roadmap/site-roadmap.ts` is the
map of surfaces, and `todo.md` is the open-work log.

> **Pruned 2026-08-27.** §1 (sidebar session gating), §2 (sixteen stub routes) and §4 (the Playwright
> sidebar fixture) all shipped or were fixed, so they are gone — this file is for what is REMAINING,
> and an entry describing solved work is one a reader can act on wrongly. Nothing was deleted until
> its reasoning was confirmed to survive elsewhere: §1's argument against hoisting the cookie read
> into `(home)/layout.tsx` is in `sidebar-slot.tsx:4-5` verbatim, including the consequence that
> matters ("would read cookies above every route in the group and turn all of them `ƒ (Dynamic)`").

---

## 3. Twenty-one of the twenty-six notification kinds are unproven against live data

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
