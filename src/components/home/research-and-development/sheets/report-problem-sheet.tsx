// TRANSPORT: props-only — the trigger and the sheet's frame. The form, and every read and write,
// load on first open from `report-problem-form.tsx`.
"use client";

import { useState } from "react";

import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { createLazySheetBody } from "@/components/home/shared/lazy-overlay";

const { LazyOverlay: LazyReportProblemForm, preload: preloadReportProblemForm } =
  createLazySheetBody(
    () => import("@/components/home/research-and-development/sheets/report-problem-form"),
  );

/**
 * Report a problem to Civic Pulse. What a submission may and may not claim is documented on the
 * form, in `report-problem-form.tsx`.
 */
type ReportProblemSheetProps = {
  /** Signed in with a real account — the precondition for `POST /research-categories`.
   *  False renders no create row rather than a control that 401s. */
  canCreateCategory: boolean;
  /**
   * Stretch the trigger to its container.
   *
   * The mobile sheet wants a full-width button because at the peek detent this is the one control a
   * reporter standing at the broken thing came for, and a centred pill in a wide row reads as
   * secondary. A prop rather than a class override from outside: the trigger's other styling is
   * this component's business, and a caller reaching in to widen it would be free to restyle it.
   */
  isTriggerFullWidth?: boolean;
};
export default function ReportProblemSheet({
  canCreateCategory,
  isTriggerFullWidth = false,
}: ReportProblemSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onPointerEnter={preloadReportProblemForm}
        onFocus={preloadReportProblemForm}
        onClick={() => setIsSheetOpen(true)}
        className={`cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ${
          isTriggerFullWidth ? "w-full" : ""
        }`}
      >
        Report a problem
      </button>

      <RndSheet title="Report a problem" isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        {isSheetOpen && (
          <LazyReportProblemForm
            canCreateCategory={canCreateCategory}
            onClose={() => setIsSheetOpen(false)}
          />
        )}
      </RndSheet>
    </>
  );
}
