"use client";

// TRANSPORT: client-query — `POST /blueprints/<arm>/:slug/reports`.
//
// ⚠️ **THIS IS NOT THE RIGHTS-CLAIM FORM AND THE TWO MUST NOT BE MERGED.**
// `/blueprints/teardowns/[slug]/report` builds a legal notice and a `mailto:`: three sworn clauses,
// a named right, a claimant with standing, and one specific file chosen from `claim-targets`. It is
// also quarantine-tolerant BY DESIGN, because a second rights holder may have an entirely different
// objection from the first. This sheet is a reader saying "this looks wrong". Merging them would
// mean a form that swears legal statements on behalf of somebody reporting spam.
//
// ⚠️ **A 201 IS NOT A VERDICT, AND NOTHING ON THIS SURFACE HIDES AUTOMATICALLY.** `flagged` is in
// every gate on both arms, so even a moderator's flag changes nothing a visitor sees — an automatic
// one would only stamp an unreviewed accusation on somebody's work. The confirmation says a person
// will look; it never says "removed", "taken down" or "we've dealt with it".
//
// ⚠️ **NO THRESHOLD IS PRINTED, BECAUSE NONE EXISTS.** The commerce sheet withholds its number
// because publishing "three reports hides this" is a griefing recipe; here there is no number to
// withhold, and saying so plainly is the honest version of the same rule.

import { useEffect, useRef, useState } from "react";

import { useReportBlueprintMutation } from "@/hooks/blueprints/reports";
import {
  BLUEPRINT_REPORT_REASONS,
  BLUEPRINT_REPORT_REASON_LABELS,
  type BlueprintReportArm,
  type BlueprintReportReason,
} from "@/lib/blueprints/reports.schemas";

const DETAIL_MAXIMUM_CHARACTERS = 2000;

export default function ReportBlueprintSheet({
  arm,
  slug,
  targetTitle,
  onClose,
}: {
  readonly arm: BlueprintReportArm;
  /** The PUBLIC slug — this route is addressed the way the reader's URL is. */
  readonly slug: string;
  readonly targetTitle: string;
  readonly onClose: () => void;
}) {
  const [reason, setReason] = useState<BlueprintReportReason | null>(null);
  const [detailText, setDetailText] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isFiled, setIsFiled] = useState(false);
  const reportBlueprint = useReportBlueprintMutation();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason === null || reportBlueprint.isPending) return;

    setRefusal(null);
    const result = await reportBlueprint.mutateAsync({
      arm,
      slug,
      reason,
      detailText: detailText.trim() === "" ? null : detailText.trim(),
    });

    if (result.success) {
      setIsFiled(true);
      return;
    }
    // The server's own sentence: a 409 says "you have already reported this", a 403 says "you
    // cannot report your own work". Both are more useful than anything this component could invent.
    setRefusal(result.error.message);
  }

  return (
    <>
      {/*
        ⚠️ A BACKDROP BUTTON, NOT `role="dialog"`, following `ReportContentSheet`. The repo's a11y
        rule maps that role to the `<dialog>` TAG, which needs an imperative `showModal()` and a
        different close path; a labelled panel behind a real dismiss control is the shape this
        codebase already uses for exactly this sheet.
      */}
      <button
        type="button"
        aria-label="Close report"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />
      <div
        ref={dialogRef}
        aria-label={`Report ${targetTitle}`}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-xl bg-background p-5 shadow-xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        {isFiled ? (
          <>
            <h2 className="text-base font-medium text-foreground">Thanks — that is with us</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A moderator will read it. Nothing is hidden automatically, so this page has not
              changed and will not until a person decides it should.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 cursor-pointer rounded-md bg-primary-imprint px-3 py-1.5 text-sm font-medium text-primary-imprint-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <h2 className="text-base font-medium text-foreground">Report this</h2>
            <p className="mt-1 text-sm text-muted-foreground">{targetTitle}</p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-foreground">
                What is wrong with it?
              </legend>
              <div className="mt-2 space-y-1.5">
                {BLUEPRINT_REPORT_REASONS.map((candidate) => (
                  <label
                    key={candidate}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm text-foreground hover:bg-foreground/3"
                  >
                    <input
                      type="radio"
                      name="blueprint-report-reason"
                      value={candidate}
                      checked={reason === candidate}
                      onChange={() => {
                        setReason(candidate);
                      }}
                      className="mt-0.5"
                    />
                    <span>{BLUEPRINT_REPORT_REASON_LABELS[candidate]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="blueprint-report-detail" className="mt-4 block text-sm font-medium">
              Anything that would help a moderator check it{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="blueprint-report-detail"
              value={detailText}
              onChange={(event) => {
                setDetailText(event.target.value.slice(0, DETAIL_MAXIMUM_CHARACTERS));
              }}
              rows={3}
              className="mt-1 w-full resize-y rounded-md border border-outline-variant/60 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
            />

            {refusal === null ? null : (
              <output className="mt-3 block text-sm text-destructive">{refusal}</output>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reason === null || reportBlueprint.isPending}
                className="cursor-pointer rounded-md bg-primary-imprint px-3 py-1.5 text-sm font-medium text-primary-imprint-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-default disabled:opacity-50"
              >
                {reportBlueprint.isPending ? "Sending…" : "Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
