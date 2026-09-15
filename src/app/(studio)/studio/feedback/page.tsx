import type { Metadata } from "next";

import StudioFeedbackPage from "@/components/studio/feedback/studio-feedback-page";

// Permanently dynamic: the list section reads the caller's session cookie.
export const instant = false;

/**
 * GRADUATED FROM `StudioPlannedPage`, and unlike `/studio/support` the stub's reasoning was
 * still CURRENT when it was replaced rather than stale.
 *
 * `todo.md` listed "wiring `/studio/feedback`'s placeholder page to the same hook" under
 * things that were "a decision rather than an oversight", because feedback already had a real
 * control in the Studio navbar. That was true of the WRITE. It was never true of the rest:
 * `POST /feedback` was the entire domain, so there was no way to read back what you sent and
 * no way for a staff member to move the status column the table had shipped with.
 *
 * `GET /feedback/mine` and `POST /admin/feedback/:feedbackId/decisions` landed with this page,
 * which is what turns the route from a second door onto one form into the only place the other
 * half of the domain is visible. `todo.md` and `site-roadmap.ts` were corrected in the same
 * edit, the way `/studio/earn` and `/studio/support` corrected them when they graduated.
 *
 * NO `robots` HERE: `(studio)/layout.tsx` sets `noindex` for the whole group.
 */
export const metadata: Metadata = {
  title: "Feedback",
  description: "Tell us what is broken, and see what was done with what you sent",
};

export default function StudioFeedback() {
  return <StudioFeedbackPage />;
}
