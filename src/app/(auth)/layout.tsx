import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * NO CHROME, ONE JOB: keep the four auth pages out of the index.
 *
 * This group had no layout at all, so `/sign-in`, `/sign-up`, `/sign-in-with-password` and
 * `/forgot-password` sat directly under the root layout — and since none of the four exports
 * `metadata` of its own, they inherited the site-wide default, which is "index everything". Four
 * fully crawlable sign-in forms.
 *
 * A sign-in page has no search intent behind it and nothing to rank for; what it can do is
 * outrank the page a visitor actually wanted. Adding a layout is one file against four page
 * edits, and it keeps working when a fifth auth route is added.
 *
 * IT RENDERS `{children}` AND NOTHING ELSE, deliberately. CLAUDE.md describes this group as
 * "no shared chrome", and that stays true — this is a metadata carrier, not a shell.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
