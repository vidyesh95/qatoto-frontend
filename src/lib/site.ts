// TRANSPORT: props-only — three authored constants. No network, no React, no DOM.
//
// THE SITE'S OWN IDENTITY, in the one place three files can share it.
//
// These lived as module-locals in `src/app/layout.tsx` and were not exported, which was fine while
// the root metadata was their only reader. `robots.ts` and `sitemap.ts` are the second and third,
// and both need the origin — so the choice was one shared module or the same literal typed three
// times, drifting the first time the domain changes.

/**
 * The canonical public origin, with no trailing slash.
 *
 * `NEXT_PUBLIC_SITE_URL` IS DEFINED IN NO COMMITTED FILE. The repo's only `.env` is a single
 * commented-out line and `.gitignore` ignores `.env*` wholesale, so there is no `.env.example` to
 * discover the key from — in practice this resolves to the fallback unless the deploy platform
 * injects it.
 *
 * That is correct for `sitemap.ts`, which must publish production URLs and would be useless
 * advertising `localhost`. It also means a preview deploy emits a sitemap and a `robots.txt`
 * naming production, which is the right trade but worth knowing before you read one.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qatoto.com";

export const SITE_TITLE = "Qatoto : Product Research, Development & Support";

export const SITE_DESCRIPTION =
  "Qatoto is a B2B platform for product research, development, and support — from idea to funded, market-ready product.";

/**
 * Where data-subject requests go — access, export, correction and deletion.
 *
 * IT IS SHARED BECAUSE TWO SURFACES MUST NOT DISAGREE. `disclaimers/privacy-policy.tsx` names this
 * address as the channel for "access, update, or delete", and the account panels
 * `account/panels/data-and-privacy-panel.tsx` and `account/panels/delete-account-panel.tsx` are the
 * controls that actually send someone there. A policy promising one mailbox while the button opens
 * another is worse than having no button.
 *
 * THIS ADDRESS HAS TO BE REAL AND MONITORED. Under GDPR Art. 12 a manual channel is a valid way to
 * answer a data-subject request; an unread inbox is not.
 *
 * THE CLAIM THAT USED TO SIT HERE — that the backend has no deletion or export endpoint and that
 * `PATCH /users/me`, `/photo` and `/handle` are its whole write surface — IS NO LONGER TRUE on
 * either count. `POST /users/me/deletion-request` and `POST|GET /users/me/export` both ship, and
 * `/users/me/channel-profile` joined the write surface with the channel description. The mailbox is
 * still the residual-rights channel and the fallback when a flag is off, which is why it stays.
 *
 * IT WAS `privacy@qatoto.com` UNTIL 2026-08-19 AND THAT MAILBOX DOES NOT EXIST, which made every
 * control routed through it a more elaborate dead stub than the inert button it replaced. It is the
 * live support address now. If a dedicated privacy mailbox is ever created, change it here and both
 * surfaces follow. Note that `security@`, `careers@` and `press@` are still hardcoded in four other
 * files and have not been verified the same way — see `todo.md`.
 */
export const PRIVACY_CONTACT_EMAIL = "support@qatoto.com";

// ─── Who Qatoto legally IS ────────────────────────────────────────────────────────────────────
//
// PLACEHOLDERS ON PURPOSE, AND THEY ARE MEANT TO LOOK LIKE ONES. The privacy policy and the terms
// both have to name a controller, an address and a governing law — GDPR Art. 13(1)(a) requires the
// first two, and a terms document whose governing-law clause reads "the country in which Qatoto
// operates" (which is what it said until this change) decides nothing at all.
//
// The entity is not incorporated yet, so the documents carry the STRUCTURE now and the facts later.
// Each value below is visibly unfilled rather than a plausible-looking guess: a reader must be able
// to tell at a glance that this is pending, and a wrong-but-believable company name in a legal
// document is worse than an obvious blank. Fill all four in one edit when incorporation completes,
// and nothing else needs to change.

export const LEGAL_ENTITY_NAME = "[TO BE CONFIRMED — legal entity not yet incorporated]";

export const LEGAL_ENTITY_REGISTERED_ADDRESS = "[TO BE CONFIRMED — registered address]";

/** The country or state whose law governs the terms. */
export const GOVERNING_LAW_JURISDICTION = "[TO BE CONFIRMED — governing law]";

/** Where disputes are heard, e.g. "the courts of <city>". */
export const GOVERNING_LAW_COURTS = "[TO BE CONFIRMED — competent courts]";
