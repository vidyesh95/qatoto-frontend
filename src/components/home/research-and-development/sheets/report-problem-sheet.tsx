// TRANSPORT: client-query — "use client" island. Reads GET /research-categories to resolve
// the category id and writes POST /discovery/problem-reports. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet, {
  RndSheetConfirmation,
} from "@/components/home/research-and-development/sheets/rnd-sheet";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useCreateProblemReportMutation } from "@/hooks/rnd/discovery";
import { useResearchCategoriesQuery } from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";

/**
 * Report a problem to Civic Pulse.
 *
 * **IT DOES NOT ADD A PIN, AND IT MUST NOT SAY IT DID.** `POST /discovery/problem-reports`
 * answers `202` with a receipt whose `clusterId` is null by construction: clustering,
 * geocoding and scoring are jobs that run afterwards. The old version of this sheet
 * fabricated a pin client-side — `mapPosition: {50, 50}`, `reportCount: 1`,
 * `opportunityScore: 40` — and dropped it on the map as a clustered finding.
 *
 * A SUBMISSION IS NOT A REPORT COUNT EITHER. `distinctReporterCount` counts distinct
 * PEOPLE, so one person's submission can never become a pin on its own; it joins a cluster
 * with other people's or it does not.
 *
 * **THE LOCATION IS FREE TEXT AND THE CLIENT SENDS NO COORDINATES.** `locationText` is
 * geocoded server-side and the centroid is quantized before publication, so no single
 * report can be located from the pin it contributes to. There is no place picker here
 * because there must not be one.
 *
 * THE CATEGORY IS AN ID, so this reads the approved taxonomy rather than offering free
 * text. Unlike the project wizard there is no propose-a-category path: `categoryId` on
 * this body is `z.uuid()`, and a citizen report is not where new taxonomy should enter.
 */
export default function ReportProblemSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");

  const categoriesQuery = useResearchCategoriesQuery();
  const reportMutation = useCreateProblemReportMutation();

  const reportError =
    reportMutation.error instanceof ApiRequestError ? reportMutation.error.apiError : null;

  // Mirrors the server's own minimums so the button does not invite a 422 the user can
  // see coming. The server re-checks; this is courtesy, not validation.
  const isFormValid =
    title.trim().length >= 8 &&
    categoryId !== "" &&
    locationText.trim().length >= 2 &&
    description.trim().length >= 20;

  function closeSheet() {
    setIsSheetOpen(false);
    reportMutation.reset();
    setTitle("");
    setCategoryId("");
    setLocationText("");
    setDescription("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Report a problem
      </button>

      <RndSheet title="Report a problem" isOpen={isSheetOpen} onClose={closeSheet}>
        {reportMutation.isSuccess ? (
          <RndSheetConfirmation
            headline="Received — we are matching it to a cluster"
            detail="Your report is queued. It is not on the map yet: reports from separate people are grouped first, and where yours lands is decided by that job, not by this form."
            onDismiss={closeSheet}
          />
        ) : (
          <form
            className="flex flex-col gap-4 px-4 pb-6"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              if (!isFormValid) return;
              reportMutation.mutate({
                title: title.trim(),
                categoryId,
                description: description.trim(),
                locationText: locationText.trim(),
              });
            }}
          >
            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Title</span>
              <input
                type="text"
                value={title}
                onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                placeholder="e.g. No reliable cold storage at the market"
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Category</span>
              <select
                value={categoryId}
                onChange={(changeEvent) => setCategoryId(changeEvent.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Choose a category</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.displayLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Where is it?</span>
              <input
                type="text"
                value={locationText}
                onChange={(changeEvent) => setLocationText(changeEvent.target.value)}
                placeholder="City, region or country"
                className={INPUT_CLASS}
              />
              <span className="text-xs text-muted-foreground">
                In your own words. We resolve it to coordinates and blur them before anything is
                published, so no pin can be traced back to one report.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Description</span>
              <textarea
                value={description}
                onChange={(changeEvent) => setDescription(changeEvent.target.value)}
                placeholder="What's broken, who does it affect, how often?"
                rows={3}
                className={INPUT_CLASS}
              />
            </label>

            <button
              type="submit"
              disabled={!isFormValid || reportMutation.isPending}
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {reportMutation.isPending ? "Sending…" : "Send my report"}
            </button>

            {reportError !== null && <MutationErrorNotice error={reportError} />}
          </form>
        )}
      </RndSheet>
    </>
  );
}
