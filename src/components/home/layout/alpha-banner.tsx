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
const ALPHA_FEEDBACK_MAILTO_HREF = `mailto:${SUPPORT_CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Qatoto alpha feedback",
)}`;

/**
 * The standing "this is an alpha" notice, directly under the `(home)` navbar.
 *
 * IT NO LONGER SCROLLS AWAY, AND IT IS STILL NOT `sticky`. Both halves matter.
 *
 * This used to say it scrolls away deliberately, because a sticky banner of height H pushes every
 * offset below it down by H — and that number was written literally in eight places
 * (`layout/sidebar.tsx`, `studio/studio-sidebar.tsx` and `admin/admin-sidebar.tsx` twice each,
 * plus `store/product-detail.tsx`'s `lg:top-16` and `account/menus/account-menu.tsx`'s mobile
 * `fixed top-15`). That reasoning was right and the conclusion is now reached a different way:
 * `(home)/layout.tsx` is a fixed-height flex column whose SCROLL CONTAINER is `<main>`, and this
 * sits above it. So the banner stays on screen without `sticky`, and because nothing below it is
 * positioned against the viewport any more, not one of those eight offsets moved.
 *
 * ⚠️ **ITS HEIGHT IS NOT A CONSTANT AND MUST NEVER BE WRITTEN DOWN AS ONE.** Measured: 36px at
 * 1440px and 56px at 500px, because the copy wraps — see below, where wrapping is required. An
 * earlier attempt at the shell put `calc(100dvh - 56px - 36px)` on the full-height surfaces and was
 * 20px wrong on a phone. The column sizes this element by its content instead; nothing computes
 * around it.
 *
 * IT IS AN `<aside>`, NOT `role="alert"`. This is context that is true for the whole alpha, not an
 * event that just happened — the repo's other `role="alert"` nodes are all refused-write notices,
 * which is a different thing. An alert here would interrupt every screen reader on every page load.
 *
 * The copy wraps rather than truncating. Its only control is the last four words, so a `truncate`
 * that ate the tail would leave an informational sentence with no way to act on it.
 */
export default function AlphaBanner() {
  return (
    <aside
      aria-label="Alpha notice"
      className="shrink-0 bg-primary-imprint px-4 py-2 text-center text-sm text-primary-imprint-foreground lg:px-6"
    >
      {/* Decorative. Announced it would read "rocket" before the sentence it decorates. */}
      <span aria-hidden="true">🚀</span> Qatoto is currently in Alpha: the site is incomplete and
      data may be wiped before launch. Encountered an issue?{" "}
      {/* A plain anchor, not `next/link`. `mailto:` is handed to the OS, not routed — the same
          choice `information/careers.tsx` and `disclaimers/privacy-policy.tsx` already make. */}
      <a href={ALPHA_FEEDBACK_MAILTO_HREF} className="font-medium underline underline-offset-2">
        Let us know.
      </a>
    </aside>
  );
}
