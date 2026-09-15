import type { Metadata } from "next";

import StudioSupportPage from "@/components/studio/support/studio-support-page";

// Permanently dynamic: the cases section reads the caller's session cookie.
export const instant = false;

/**
 * GRADUATED FROM `StudioPlannedPage`, and the stub was right until the backend moved.
 *
 * Its reason was `todo.md`'s: "There is no ticket API, and `/customer-service` is a directory for
 * exactly that reason. A support inbox means a real ticket domain AND somebody to read it." Both
 * now exist: `POST/GET /support/cases`, the reply route and the `/admin/support` queue shipped, so
 * a case opened here is read by a person. `todo.md` and `site-roadmap.ts` were corrected in the
 * same edit, the way `/studio/earn` corrected them when it graduated: a `kind: "planned"` entry
 * left behind would advertise a built page as unbuilt on `/roadmap`.
 *
 * NO `robots` HERE: `(studio)/layout.tsx` sets `noindex` for the whole group.
 */
export const metadata: Metadata = {
  title: "Support",
  description: "Where a seller's problem is already recorded, and the cases on your account",
};

export default function StudioSupport() {
  return <StudioSupportPage />;
}
