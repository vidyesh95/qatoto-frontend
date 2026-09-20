import type { Metadata } from "next";

import MyProblemReportsPanel from "@/components/home/research-and-development/sections/my-problem-reports-panel";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Your problem reports · R&D",
  description: "What you reported to Civic Pulse, and what happened to it",
  // NOINDEX: signed-in only. A crawler gets nothing, which indexes as a soft 404. The same reason
  // `/research-and-development/applications` carries it.
  robots: { index: false, follow: false },
};

/**
 * The reporter's own Civic Pulse submissions.
 *
 * ⚠️ **THIS PANEL USED TO LIVE UNDER THE PROBLEM MAP AND CANNOT ANY MORE.** The map became a
 * non-scrolling instrument that fills the viewport, and a personal, signed-in, polling list has
 * nowhere to sit under a page with no scroll — but it also never belonged there: it is about the
 * reader's own submissions, not about what is on the map, and a cluster on the map is other
 * people's reports as much as it is theirs.
 *
 * A route rather than an embed in the report sheet's success state, which was the other candidate:
 * `RndSheetConfirmation` takes no children and is shared with `apply-role-sheet.tsx`, so a list
 * inside it would widen a component two flows depend on. The sheet links here instead.
 *
 * The panel renders NOTHING when signed out or when there are no reports, so this page is
 * deliberately thin — there is no sign-in wall to write, because the one honest thing to say to a
 * signed-out visitor here is nothing at all.
 */
export default function MyProblemReports() {
  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Your reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What you reported to Civic Pulse, and what happened to it.
        </p>
      </div>
      <MyProblemReportsPanel />
    </div>
  );
}
