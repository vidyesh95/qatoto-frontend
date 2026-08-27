// TRANSPORT: props-only — a client island over ids the server already fetched.
"use client";

// THE OPENER, SEPARATE FROM THE SHEET, so a server component can offer the control without becoming
// a client component. Same split `ChannelAboutOpener` uses, and for the same reason: this owns
// nothing but the open/closed bit.
//
// IT LIVES IN `channel/` BECAUSE THE SHEET DOES, not because it is channel-specific. A profile
// report is about a PERSON — `user_report.reported_user_id` — so it is equally at home on any
// surface that publishes that person's own words. `/research-and-development/talent/[handle]` is
// the second such surface and mounts this unchanged.

import { useState } from "react";

import ReportProfileSheet from "@/components/home/channel/report-profile-sheet";

export default function ReportProfileOpener({
  reportedUserId,
  displayName,
}: {
  readonly reportedUserId: string;
  readonly displayName: string;
}) {
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsReportSheetOpen(true)}
        className="cursor-pointer text-xs text-muted-foreground underline"
      >
        Report this profile
      </button>
      {isReportSheetOpen && (
        <ReportProfileSheet
          reportedUserId={reportedUserId}
          displayName={displayName}
          onClose={() => setIsReportSheetOpen(false)}
        />
      )}
    </>
  );
}
