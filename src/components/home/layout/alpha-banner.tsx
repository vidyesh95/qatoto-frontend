// NOT `"use client"`, DELIBERATELY. There is no state, no handler and no close button here, so the
// banner ships zero client JS — and the `(home)` layout that mounts it is itself a synchronous
// server component (see the note at the top of `app/(home)/layout.tsx`). A client banner would not
// break that, but it would put a hydration boundary above every route in the group for a sentence
// that never changes.

import { SUPPORT_CONTACT_EMAIL } from "@/lib/site";

/**
 * The subject the visitor's mail client opens with, so a reply lands in a filterable thread rather
 * than an untitled one. `encodeURIComponent` for the same reason `lib/privacy-request.ts` uses it:
 * a `mailto:` query is a URL, and a raw space ends the href in some clients.
 */
const BETA_FEEDBACK_MAILTO_HREF = `mailto:${SUPPORT_CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Qatoto beta feedback",
)}`;

/**
 * The standing "this is a beta" notice, directly under the `(home)` navbar.
 *
 * IT SCROLLS AWAY RATHER THAN STICKING, and that is the whole reason this is a three-file change.
 * The navbar's 56px height has no height class — it is emergent from `py-2` plus a 40px content
 * row — and that number is written literally in six places (`layout/sidebar.tsx`,
 * `studio/studio-sidebar.tsx` and `admin/admin-sidebar.tsx`, twice each), plus
 * `store/product-detail.tsx`'s `lg:top-16` and `account/menus/account-menu.tsx`'s mobile
 * `fixed top-15`. A sticky banner of height H is wrong in all eight until every one is edited.
 * In normal document flow it is wrong in none of them.
 *
 * IT IS AN `<aside>`, NOT `role="alert"`. This is context that is true for the whole beta, not an
 * event that just happened — the repo's other `role="alert"` nodes are all refused-write notices,
 * which is a different thing. An alert here would interrupt every screen reader on every page load.
 *
 * The copy wraps rather than truncating. Its only control is the last four words, so a `truncate`
 * that ate the tail would leave an informational sentence with no way to act on it.
 */
export default function BetaBanner() {
  return (
    <aside
      aria-label="Beta notice"
      className="bg-[#00696E] px-4 py-2 text-center text-sm text-white lg:px-6"
    >
      {/* Decorative. Announced it would read "rocket" before the sentence it decorates. */}
      <span aria-hidden="true">🚀</span> Qatoto is currently in Beta: We&apos;re actively building
      and rolling out new features. Encountered an issue?{" "}
      {/* A plain anchor, not `next/link`. `mailto:` is handed to the OS, not routed — the same
          choice `information/careers.tsx` and `disclaimers/privacy-policy.tsx` already make. */}
      <a href={BETA_FEEDBACK_MAILTO_HREF} className="font-medium underline underline-offset-2">
        Let us know.
      </a>
    </aside>
  );
}
