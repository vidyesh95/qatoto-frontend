// TRANSPORT: props-only — a client island over ids the server already fetched.
"use client";

// THE OPENER, SEPARATE FROM THE SHEET, so a server component can offer the control without becoming
// a client component. Same split `ReportProfileOpener` uses against `ReportProfileSheet`, and for
// the same reason: this owns nothing but the open/closed bit.
//
// ONE OPENER FOR ALL FIVE COMMERCE TARGET KINDS. It mounts on the product page (a server
// component), and inside three already-client sections — a review card, a question row, an answer
// block — plus the company storefront. The `variant` exists because those are not the same kind of
// space: the product page has a centred standalone row, while the other four are dot-separated
// metadata lines beside "Mark helpful" and "Withdraw".
//
// ⚠️ **THIS IS NOT THE FORUM'S REPORT CONTROL AND THE TWO MUST NOT BE MERGED.**
// `forum-thread-conversation.tsx` reports a `forum_thread` or `forum_reply` to
// `POST /community/reports` under `moderate_content`, over a different reason enum entirely. Same
// word, different module, different queue, different moderator shift.

import { useState } from "react";

import ReportContentSheet from "@/components/home/store/shared/report-content-sheet";
import type { CommerceContentTargetKind } from "@/lib/store/content-reports.schemas";

export default function ReportContentOpener({
  targetKind,
  targetId,
  targetLabel,
  variant = "inline",
}: {
  readonly targetKind: CommerceContentTargetKind;
  /** The INTERNAL id — never a public slug. See the sheet's prop docs. */
  readonly targetId: string;
  readonly targetLabel: string;
  readonly variant?: "inline" | "standalone";
}) {
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  const buttonClassName =
    variant === "standalone"
      ? "flex cursor-pointer items-center gap-1 text-xs font-medium text-[#6F7979]"
      : "cursor-pointer text-xs text-muted-foreground underline";

  return (
    // `relative` so the sheet's `sm:absolute` positioning anchors to this control rather than to
    // whatever ancestor happens to be positioned — the shape the video sheet's opener relies on.
    <span className="relative inline-flex">
      <button type="button" onClick={() => setIsReportSheetOpen(true)} className={buttonClassName}>
        Report
      </button>
      {isReportSheetOpen && (
        <ReportContentSheet
          targetKind={targetKind}
          targetId={targetId}
          targetLabel={targetLabel}
          onClose={() => setIsReportSheetOpen(false)}
        />
      )}
    </span>
  );
}
