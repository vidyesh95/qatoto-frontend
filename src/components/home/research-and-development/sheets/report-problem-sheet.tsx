// TRANSPORT: client-query — "use client" island. Reads GET /research-categories to resolve
// the category id and writes POST /discovery/problem-reports (photos go through
// ProblemPhotoPicker first). Needs QueryProvider, which (home)/layout.tsx mounts.
"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import ContactDetailAdvisory from "@/components/home/research-and-development/sheets/contact-detail-advisory";
import RndSheet, {
  RndSheetConfirmation,
} from "@/components/home/research-and-development/sheets/rnd-sheet";
import CreatableCombobox, { type ComboboxOption } from "@/components/ui/creatable-combobox";
import PlacePicker from "@/components/home/research-and-development/sheets/place-picker";
import ProblemPhotoPicker, {
  type ProblemPhotoTile,
} from "@/components/home/research-and-development/sheets/problem-photo-picker";
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
function buildCategoryOptions(
  approvedCategories: readonly ResearchCategory[],
  proposedCategories: readonly ResearchCategory[],
): ComboboxOption[] {
  return [
    ...approvedCategories.map((category) => ({
      optionId: category.id,
      optionName: category.displayLabel,
    })),
    ...proposedCategories
      .filter((proposed) => !approvedCategories.some((category) => category.id === proposed.id))
      .map((proposed) => ({
        optionId: proposed.id,
        optionName: proposed.displayLabel,
        ...(proposed.status === "approved"
          ? {}
          : { optionNote: RESEARCH_CATEGORY_STATUS_LABELS[proposed.status] }),
      })),
  ];
}

function buildCategoryHelpText(
  isCreatingCategory: boolean,
  hasProposedCategories: boolean,
  canCreateCategory: boolean,
): string | undefined {
  if (isCreatingCategory) return "Creating…";
  if (hasProposedCategories) {
    return "Created and selected. A moderator reviews the name later; your report is not held up by it.";
  }
  if (canCreateCategory) return "Type a name that does not exist yet to create it.";
  return undefined;
}

function ReportProblemSuccessView({ onDismiss }: { onDismiss: () => void }) {
  return (
    <>
      <RndSheetConfirmation
        headline="Received — we are matching it to a cluster"
        detail="Your report is queued. It is not on the map yet: reports from separate people are grouped first, and where yours lands is decided by that job, not by this form."
        onDismiss={onDismiss}
      />
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
  );
}

function ReportProblemSubmitButton({
  isPending,
  isAnyPhotoUploading,
  isFormValid,
}: {
  isPending: boolean;
  isAnyPhotoUploading: boolean;
  isFormValid: boolean;
}) {
  const buttonLabel = isPending
    ? "Sending…"
    : isAnyPhotoUploading
      ? "Waiting for photos…"
      : "Send my report";

  return (
    <button
      type="submit"
      disabled={!isFormValid || isAnyPhotoUploading || isPending}
      className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-40"
    >
      {buttonLabel}
    </button>
  );
}

function ReportProblemForm({
  canCreateCategory,
  onClose,
}: {
  canCreateCategory: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState<ApproximatePin | null>(null);
  const [proposedCategories, setProposedCategories] = useState<ResearchCategory[]>([]);
  const [photoTiles, setPhotoTiles] = useState<ProblemPhotoTile[]>([]);

  const titleAdvisoryId = useId();
  const descriptionAdvisoryId = useId();

  const categoriesQuery = useResearchCategoriesQuery();
  const reportMutation = useCreateProblemReportMutation();
  const createCategoryMutation = useCreateResearchCategoryMutation();

  const approvedCategories = categoriesQuery.data ?? [];
  const categoryOptions = buildCategoryOptions(approvedCategories, proposedCategories);
  const categoryHelpText = buildCategoryHelpText(
    createCategoryMutation.isPending,
    proposedCategories.length > 0,
    canCreateCategory,
  );

  const firstError = [createCategoryMutation.error, reportMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isFormValid =
    title.trim().length >= 8 &&
    categoryId !== "" &&
    locationText.trim().length >= 2 &&
    description.trim().length >= 20;

  const isAnyPhotoUploading = photoTiles.some((tile) => tile.status === "uploading");
  const uploadedPhotoIds = photoTiles.flatMap((tile) =>
    tile.status === "uploaded" ? [tile.photo.photoId] : [],
  );

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

  if (reportMutation.isSuccess) {
    return <ReportProblemSuccessView onDismiss={onClose} />;
  }

  const handleFormSubmit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!isFormValid || isAnyPhotoUploading) return;
    reportMutation.mutate({
      title: title.trim(),
      categoryId,
      description: description.trim(),
      locationText: locationText.trim(),
      ...(pin === null
        ? {}
        : {
            approxLatitudeMicrodegrees: pin.latitudeMicrodegrees,
            approxLongitudeMicrodegrees: pin.longitudeMicrodegrees,
          }),
      ...(uploadedPhotoIds.length === 0 ? {} : { photoIds: uploadedPhotoIds }),
    });
  };

  return (
    <form className="flex flex-col gap-4 px-4 pb-6" onSubmit={handleFormSubmit}>
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder="e.g. No reliable cold storage at the market"
            aria-describedby={titleAdvisoryId}
            className={INPUT_CLASS}
          />
        </label>
        <ContactDetailAdvisory id={titleAdvisoryId} text={title} />
      </div>

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

      <PlacePicker pin={pin} onPinChange={setPin} />

      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Description</span>
          <textarea
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            placeholder="What's broken, who does it affect, how often?"
            rows={3}
            aria-describedby={descriptionAdvisoryId}
            className={INPUT_CLASS}
          />
        </label>
        <ContactDetailAdvisory id={descriptionAdvisoryId} text={description} />
      </div>

      <ProblemPhotoPicker tiles={photoTiles} onTilesChange={setPhotoTiles} />

      <ReportProblemSubmitButton
        isPending={reportMutation.isPending}
        isAnyPhotoUploading={isAnyPhotoUploading}
        isFormValid={isFormValid}
      />

      {firstError && <MutationErrorNotice error={firstError.apiError} />}
    </form>
  );
}

export default function ReportProblemSheet({
  canCreateCategory,
  isTriggerFullWidth = false,
}: ReportProblemSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

      <RndSheet title="Report a problem" isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        {isSheetOpen && (
          <ReportProblemForm
            canCreateCategory={canCreateCategory}
            onClose={() => setIsSheetOpen(false)}
          />
        )}
      </RndSheet>
    </>
  );
}
