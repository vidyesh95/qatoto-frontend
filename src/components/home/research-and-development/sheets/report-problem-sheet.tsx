// TRANSPORT: client-query — "use client" island. Reads GET /research-categories to resolve
// the category id and writes POST /discovery/problem-reports. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import Link from "next/link";
import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet, {
  RndSheetConfirmation,
} from "@/components/home/research-and-development/sheets/rnd-sheet";
import CreatableCombobox, { type ComboboxOption } from "@/components/ui/creatable-combobox";
import PlacePicker from "@/components/home/research-and-development/sheets/place-picker";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useCreateProblemReportMutation } from "@/hooks/rnd/discovery";
import {
  useCreateResearchCategoryMutation,
  useResearchCategoriesQuery,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { ResearchCategory } from "@/lib/rnd/catalog.schemas";
import { RESEARCH_CATEGORY_STATUS_LABELS } from "@/lib/rnd/labels";
import type { ApproximatePin } from "@/lib/rnd/report-pin";

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
 * **`locationText` IS REQUIRED AND IS STILL WHAT DECIDES THE GEOGRAPHY.** It is geocoded
 * server-side for the country and the region — which feed the opportunity score — and the
 * resulting centroid is quantized before publication, so no single report can be located
 * from the pin it contributes to.
 *
 * ⚠️ **THIS BLOCK USED TO END "THERE IS NO PLACE PICKER HERE BECAUSE THERE MUST NOT BE ONE."
 * THERE IS ONE NOW, AND THE RULE IT WAS PROTECTING DID NOT CHANGE.** What changed is that the
 * pin is rounded to ~110 m IN THE BROWSER before it is sent, so the precise point the old
 * comment was refusing to collect is still never collected — see `report-pin.ts`. The pin is
 * OPTIONAL, it refines position only, and it cannot supply a country: there is no reverse
 * geocoder, so a report whose free text does not resolve still fails geocoding however
 * precisely it was pinned.
 *
 * THE CATEGORY IS AN ID, so this reads the approved taxonomy rather than offering free
 * text — `categoryId` on this body is `z.uuid()`, and there is no "other" bucket.
 *
 * A CATEGORY CAN BE CREATED FROM HERE AND USED IMMEDIATELY. `POST /research-categories`
 * lands the row `pending`, and every writer of `research_category` — this report, projects,
 * market insights, discovery skills — refuses only `rejected`. `pending` is a real row with
 * a real id, so it is a usable foreign key; the name is what is unsettled, not the row.
 *
 * The three surfaces that once demanded `approved` were the reason a proposal could be made
 * and then not used, on the one table the founder wizard, the map's chips, cluster facets
 * and market insights all read. One table now has one rule.
 *
 * MODERATION STILL DECIDES, it just no longer blocks. `POST
 * /discovery/admin/categories/:categoryId/decide` settles the name, and a `rejected` verdict
 * bites everywhere — so the list tags a `pending` entry "Awaiting review" rather than
 * pretending it is already vocabulary.
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
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  /**
   * The optional coarse pin.
   *
   * ⚠️ **ONE PIECE OF STATE HOLDING BOTH COORDINATES, NEVER TWO.** Both or neither is refined by
   * the request schema and CHECKed by the database; holding them together is what makes a half pin
   * unconstructible here rather than merely refused later.
   */
  const [pin, setPin] = useState<ApproximatePin | null>(null);
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
        // No tag once a moderator approves it — at that point it is an ordinary entry in the
        // vocabulary and saying anything about it would be noise.
        ...(proposed.status === "approved"
          ? {}
          : { optionNote: RESEARCH_CATEGORY_STATUS_LABELS[proposed.status] }),
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
      ? "Created and selected. A moderator reviews the name later; your report is not held up by it."
      : canCreateCategory
        ? "Type a name that does not exist yet to create it."
        : undefined;

  // Mirrors the server's own minimums so the button does not invite a 422 the user can
  // see coming. The server re-checks; this is courtesy, not validation.
  const isFormValid =
    title.trim().length >= 8 &&
    categoryId !== "" &&
    locationText.trim().length >= 2 &&
    description.trim().length >= 20;

  /**
   * Proposes the category the user typed, then selects it.
   *
   * It lands `pending` and that is fine: every writer of `research_category` refuses only
   * `rejected`, so a category minted a second ago is a usable foreign key. The row is tagged
   * "Awaiting review" in the list rather than hidden — the reporter should know a moderator
   * has not settled the name yet, without being blocked on it.
   */
  function handleCategoryCreateRequest(typedCategoryLabel: string): void {
    createCategoryMutation.mutate(
      { label: typedCategoryLabel },
      {
        onSuccess: (createdCategory) => {
          setProposedCategories((previousCategories) => [...previousCategories, createdCategory]);
          setCategoryId(createdCategory.id);
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
    setPin(null);
    setProposedCategories([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className={`cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ${
          isTriggerFullWidth ? "w-full" : ""
        }`}
      >
        Report a problem
      </button>

      <RndSheet title="Report a problem" isOpen={isSheetOpen} onClose={closeSheet}>
        {reportMutation.isSuccess ? (
          <>
            <RndSheetConfirmation
              headline="Received — we are matching it to a cluster"
              detail="Your report is queued. It is not on the map yet: reports from separate people are grouped first, and where yours lands is decided by that job, not by this form."
              onDismiss={closeSheet}
            />
            {/* Where the answer actually appears. The receipt carries `clusterId: null` by
                construction, so without somewhere to look a reporter files something and never
                hears about it again. The list used to sit under the map; the map is now a
                non-scrolling instrument and it moved to its own route. */}
            <p className="px-4 pb-6 text-center text-xs text-muted-foreground">
              <Link
                href="/research-and-development/my-reports"
                className="font-medium text-primary-imprint underline underline-offset-2"
              >
                See your reports
              </Link>{" "}
              to find out where it landed.
            </p>
          </>
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
                // Spread so an absent pin sends NO key at all rather than two `undefined`s. The
                // body is `.strict()` and the pair is refined as both-or-neither, so spreading the
                // whole object is also what makes half a pin unsendable.
                ...(pin === null
                  ? {}
                  : {
                      approxLatitudeMicrodegrees: pin.latitudeMicrodegrees,
                      approxLongitudeMicrodegrees: pin.longitudeMicrodegrees,
                    }),
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

            {/* Optional, and deliberately AFTER the required field rather than instead of it: the
                text is what the country and region are derived from, and the pin only says where
                inside that place the problem is. */}
            <PlacePicker pin={pin} onPinChange={setPin} />

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
              className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-40"
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
