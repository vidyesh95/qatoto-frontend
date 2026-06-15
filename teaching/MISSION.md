# Mission: Build the Qatoto Express auth backend

## Why

The Qatoto frontend is built but fakes login with a `localStorage` flag. You're new to
programming and you're going to build the **real** Express backend behind it — starting
with auth, because nothing else (your videos, cart, library) can be trusted until the
server knows who the user is. The win: a running API your own frontend can sign up and
log in against.

## Success looks like

- An Express server running locally that the Next.js frontend can call.
- Working email-OTP **signup**, password **login**, **logout**, and a `GET /auth/me`
  session check — consumed from the frontend with TanStack Query.
- Working **forgot-password** reset using the same OTP system.
- You can explain _why_ the server re-checks everything the client sends (the thin,
  untrusted-client rule) and why the session lives in an httpOnly cookie, not localStorage.

## Constraints

- New to programming — keep it **simple REST**, few dependencies, no premature abstractions.
- TypeScript (same language as the frontend), run with `tsx` so there's no build step.
  SQLite first (not Postgres). OTP printed to the console (not real email). All upgradeable later.
- Frontend uses TanStack Query — design endpoints that are easy to call from it.

## Out of scope (for now — protects focus)

- Google / Apple OAuth.
- Real email delivery, rate-limiting infrastructure, deployment, Postgres.
- Any non-auth endpoints (videos, store, cart) until auth is solid.

---

_Reference contract: [../BACKEND_STRUCTURE.md](../BACKEND_STRUCTURE.md)_
