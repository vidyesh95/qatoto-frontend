// TRANSPORT: client-query — "use client" island. Reads GET /research-categories to resolve
// the category id and writes POST /discovery/problem-reports. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet, {
  RndSheetConfirmation,
} from "@/components/home/research-and-development/sheets/rnd-sheet";
import CreatableCombobox, { type ComboboxOption } from "@/components/ui/creatable-combobox";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useCreateProblemReportMutation } from "@/hooks/rnd/discovery";
import {
  useCreateResearchCategoryMutation,
  useResearchCategoriesQuery,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { ResearchCategory } from "@/lib/rnd/catalog.schemas";
import { RESEARCH_CATEGORY_STATUS_LABELS } from "@/lib/rnd/labels";

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
 * text — `categoryId` on this body is `z.uuid()`, and there is no "other" bucket.
 *
 * A CATEGORY CAN BE PROPOSED FROM HERE, BUT NEVER ADOPTED FROM HERE. `POST
 * /research-categories` lands the row `pending`, and `POST /discovery/problem-reports` calls
 * `checkCategoryUsable`, which demands `approved` and otherwise answers `422
 * CATEGORY_NOT_APPROVED`. So a category created in this field joins the list GREYED and
 * unpickable, and the report is filed under one that already exists.
 *
 * THAT ASYMMETRY IS NOT AN OVERSIGHT TO ROUTE AROUND. `research_category` is one shared
 * table — the founder wizard, the map's chips, cluster facets and market insights all read
 * it — and this is its most public, least authenticated entry point. Three of its four
 * writers demand `approved`; only project create/update accept `pending`. Selecting a fresh
 * proposal here to save a step would arm a 422 the reporter cannot see coming.
 *
 * The proposal is not lost: `POST /discovery/admin/categories/:categoryId/decide` exists, so
 * a `moderate_taxonomy` holder settles it and it is selectable next time.
 */

type ReportProblemSheetProps = {
  /** Signed in with a real account — the precondition for `POST /research-categories`.
   *  False renders no create row rather than a control that 401s. */
  canCreateCategory: boolean;
};
export default function ReportProblemSheet({ canCreateCategory }: ReportProblemSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  /**
   * Categories proposed during this session.
   *
   * Every read of this taxonomy asks for `?status=approved`, so a row that just landed
   * `pending` appears in no query. Holding it here is what lets the field SHOW it — greyed,
   * unpickable — instead of silently forgetting it and offering "Create" again on the next
   * keystroke, which the backend answers with a 409.
   */
  const [proposedCategories, setProposedCategories] = useState<ResearchCategory[]>([]);

  const categoriesQuery = useResearchCategoriesQuery();
  const reportMutation = useCreateProblemReportMutation();
  const createCategoryMutation = useCreateResearchCategoryMutation();

  const approvedCategories = categoriesQuery.data ?? [];
  const categoryOptions: ComboboxOption[] = [
    ...approvedCategories.map((category) => ({
      optionId: category.id,
      optionName: category.displayLabel,
    })),
    // Dropped the moment the approved list carries one, so an entry cannot appear twice if a
    // moderator approves it while the sheet is open.
    ...proposedCategories
      .filter((proposed) => !approvedCategories.some((category) => category.id === proposed.id))
      .map((proposed) => ({
        optionId: proposed.id,
        optionName: proposed.displayLabel,
        unavailableReason: RESEARCH_CATEGORY_STATUS_LABELS[proposed.status],
      })),
  ];

  // Whichever write failed first. The proposal and the report are separate requests with
  // separate refusals — a 409 on a duplicate name and a 422 on the report are both worth
  // reading verbatim, and showing only the report's would swallow half of them.
  const firstError = [createCategoryMutation.error, reportMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const categoryHelpText = createCategoryMutation.isPending
    ? "Creating…"
    : proposedCategories.length > 0
      ? "Created — a moderator reviews it before it can be used. Pick an approved category for this report."
      : canCreateCategory
        ? "Type a name that does not exist yet to propose it."
        : undefined;

  // Mirrors the server's own minimums so the button does not invite a 422 the user can
  // see coming. The server re-checks; this is courtesy, not validation.
  const isFormValid =
    title.trim().length >= 8 &&
    categoryId !== "" &&
    locationText.trim().length >= 2 &&
    description.trim().length >= 20;

  /**
   * Proposes the category the user typed — and does NOT select it.
   *
   * That is the whole rule of this surface. The row lands `pending` and
   * `POST /discovery/problem-reports` refuses anything but `approved`, so selecting it here
   * would arm a 422 the user cannot see coming. It joins the list greyed instead, and the
   * report goes in under a category that already exists.
   */
  function handleCategoryCreateRequest(typedCategoryLabel: string): void {
    createCategoryMutation.mutate(
      { displayLabel: typedCategoryLabel },
      {
        onSuccess: (createdCategory) => {
          setProposedCategories((previousCategories) => [...previousCategories, createdCategory]);
        },
      },
    );
  }

  function closeSheet() {
    setIsSheetOpen(false);
    reportMutation.reset();
    createCategoryMutation.reset();
    setTitle("");
    setCategoryId("");
    setLocationText("");
    setDescription("");
    setProposedCategories([]);
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

            <CreatableCombobox
              labelText="Category"
              placeholderText="Search or create a category"
              selectedOptionId={categoryId}
              options={categoryOptions}
              onOptionSelect={setCategoryId}
              {...(canCreateCategory ? { onCreateRequest: handleCategoryCreateRequest } : {})}
              helpText={categoryHelpText}
            />

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

            {firstError && <MutationErrorNotice error={firstError.apiError} />}
          </form>
        )}
      </RndSheet>
    </>
  );
}
