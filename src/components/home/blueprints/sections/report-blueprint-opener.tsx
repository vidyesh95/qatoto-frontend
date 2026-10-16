"use client";

// TRANSPORT: props-only — owns nothing but the open/closed bit, so a server component can offer the
// control without becoming a client component. Same split `ReportContentOpener` uses.

import { useState } from "react";

import ReportBlueprintSheet from "@/components/home/blueprints/sections/report-blueprint-sheet";
import type { BlueprintReportArm } from "@/lib/blueprints/reports.schemas";

/**
 * "Report this" — the reader's control.
 *
 * ⚠️ **NOT THE RIGHTS-CLAIM LINK.** A teardown page carries both, and they answer different
 * questions: the rights claim is an IP notice with sworn clauses and a named file, this is "this
 * looks wrong". The teardown's provenance block links to the first; this sits with the page's other
 * reader affordances.
 */
export default function ReportBlueprintOpener({
  arm,
  slug,
  targetTitle,
}: {
  readonly arm: BlueprintReportArm;
  readonly slug: string;
  readonly targetTitle: string;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(true);
        }}
        className="cursor-pointer text-xs font-medium text-outline-strong underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
      >
        Report this
      </button>
      {isSheetOpen ? (
        <ReportBlueprintSheet
          arm={arm}
          slug={slug}
          targetTitle={targetTitle}
          onClose={() => {
            setIsSheetOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
