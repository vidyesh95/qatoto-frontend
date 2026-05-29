# GEMINI.md

Instructions for Gemini working in this repository. The core principle below is mirrored in `CLAUDE.md` and `AGENTS.md` — keep all three in sync. For full project context (stack, commands, architecture, conventions), read `CLAUDE.md`.

## Core principle: thin client, untrusted frontend (NON-NEGOTIABLE)

This is a frontend repository. It is a **thin, untrusted presentation layer**. The backend is the single source of truth and does all heavy and all security-sensitive work.

### Trust boundary — the client is hostile

- The shipped frontend is fully visible and editable by anyone: users can read all client JS, edit it in DevTools, and forge, replay, or tamper with any request to the backend. **Treat every byte from a client as attacker-controlled.**
- **Never** enforce authentication, authorization, validation, pricing, inventory, rate limits, or any business rule on the frontend _alone_. Client-side checks are for fast UX feedback only. The backend **must independently re-validate and re-authorize every request** and is the only authority.
- **Never trust client-supplied identity, role, permissions, price, quantity, totals, or location/country.** The server derives or re-verifies these. Example: the browse-location/country selector is a **display preference only** — the backend must not trust a client-claimed country for fraud signals, geo-restriction, tax, or pricing; re-derive server-side (IP, verified account region, payment country).
- **No secrets in the frontend** — no API keys, private tokens, or confidential business logic in client code or the bundle. Only short-lived, scoped session credentials.
- All mutations: the server validates input schema, ownership, permissions, and rate limits before acting.

### Performance — keep the client light and ultrafast

- Push heavy or expensive work to the Express backend: large-list sorting & filtering, aggregation, ranking, recommendations, search over big datasets, media processing, anything CPU- or data-heavy. The client renders results; it does not compute them.
- This repo is a pure frontend (Next.js) that talks to a **separate Express REST API** — do not introduce Server Actions or Next.js API routes for business logic. All data mutations go through the Express backend via `fetch()`.
- Keep `"use client"` components small and focused on interaction. Ship the minimal client JS needed.
- When adding a feature, ask: _does this logic need to be trusted, or is it heavy?_ If yes to either, it belongs in the Express backend. The frontend gets only render + light interaction.
