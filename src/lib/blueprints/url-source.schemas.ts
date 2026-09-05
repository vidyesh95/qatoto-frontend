// TRANSPORT: props-only — pure contract. No network of its own.
//
// The URL refinements every Blueprints surface shares, hoisted out of `hero.schemas.ts` where
// they were module-private. The hero carousel, a teardown's walkthrough poster and a document's
// `<embed src>` all take the same kind of value from the same backend and must reject the same
// things; two hand-written copies of a security refinement is one copy that silently drifts.
//
// WHY THE SECOND REFINEMENT IS NOT PARANOIA, kept verbatim from the hero contract because it is
// the reason this file exists: these values become a `next/image` src, an `<a href>` or an
// `<embed src>` on a public page. `//evil.tld/x` starts with "/" — so the obvious
// `startsWith("/")` check passes it — and a browser reads it as protocol-relative and leaves the
// site. `z.url()` alone would not help either: it accepts `javascript:alert(1)` as a well-formed
// URL, which React renders verbatim.
//
// THE BACKEND OWNS THIS RULE and re-validates it on every write (CLAUDE.md §1.1); this is the
// second line of defence. A bad row failing the contract, so the surface renders nothing, is the
// correct failure.

import { z } from "zod";

/** A protocol-relative path — `//evil.tld` or the backslash variant browsers also accept. */
function isProtocolRelative(source: string): boolean {
  return source.startsWith("//") || source.startsWith("/\\");
}

/**
 * An asset the browser will load: an https URL (anything uploaded, which Cloudinary serves) or a
 * SITE-RELATIVE path (the seeded rows and, for now, every fixture).
 */
export function createHttpsOrSiteRelativeUrlSchema(maximumLength: number) {
  return z
    .string()
    .min(1)
    .max(maximumLength)
    .refine(
      (source) => source.startsWith("https://") || source.startsWith("/"),
      "An asset must be an https URL or a path on this site.",
    )
    .refine((source) => !isProtocolRelative(source), "A protocol-relative path leaves the site.");
}

/** Same rule minus the https arm — for a destination that must stay on this site. */
export function createSitePathSchema(maximumLength: number) {
  return z
    .string()
    .min(1)
    .max(maximumLength)
    .refine((path) => path.startsWith("/"), "A destination must start with a slash.")
    .refine((path) => !isProtocolRelative(path), "A protocol-relative path leaves the site.");
}

/**
 * A link that may leave the site — a launch's call to action, a case study's further reading.
 *
 * https ONLY, never bare http and never a bare scheme-less host. An off-site link is a different
 * decision from an on-site one and gets its own schema rather than a loosened flag on the one
 * above, so no caller can widen an image source by passing an argument.
 */
export function createExternalHttpsUrlSchema(maximumLength: number) {
  return z
    .string()
    .min(1)
    .max(maximumLength)
    .refine((url) => url.startsWith("https://"), "An external link must be an https URL.");
}
