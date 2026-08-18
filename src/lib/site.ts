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
 * THIS ADDRESS HAS TO BE REAL AND MONITORED. Every request control in this app is a mailto, because
 * the Express backend has no deletion or export endpoint yet — `PATCH /users/me`, `/users/me/photo`
 * and `/users/me/handle` are its whole write surface. Under GDPR Art. 12 a manual channel is a valid
 * way to answer a data-subject request; an unread inbox is not.
 */
export const PRIVACY_CONTACT_EMAIL = "privacy@qatoto.com";
