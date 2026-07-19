"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";

import type { ProblemReport } from "@/types/research-and-development";

import CreatableCombobox, { appendOptionNameIfNew } from "@/components/ui/creatable-combobox";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

// Self-contained "report a problem" trigger + bottom sheet (§8.2, Civic Pulse).
// Mock phase: the built report is handed to the optional callback (the problem
// map appends it to its page-local list — lost on refresh) and a confirmation
// is shown. Real reports go to the Express backend later.

const PROBLEM_CATEGORIES = [
  "Water",
  "Power",
  "Transport",
  "Healthcare",
  "Housing",
  "Connectivity",
  "Waste",
];

type ReportProblemSheetProps = {
  onReportSubmitted?: (report: ProblemReport) => void;
};

export default function ReportProblemSheet({ onReportSubmitted }: ReportProblemSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  // Categories invented this session. Held here, not inside the sheet panel,
  // because that subtree unmounts on close while this component does not — so a
  // created category survives closing and reopening. It does not survive a
  // reload; that needs the backend. Deliberately NOT reset by handleSheetClose.
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...PROBLEM_CATEGORIES]);

  // useCallback here is for effect-dependency stability, not memoization — the
  // keydown effect below depends on it, and an unstable identity would re-wire
  // the listener and thrash document.body.style.overflow on every render.
  // Every useState setter is referentially stable, so [] is correct.
  const handleSheetClose = useCallback(() => {
    setIsSheetOpen(false);
    setIsSubmitted(false);
    setTitle("");
    setCategory("");
    setLocationText("");
    setDescription("");
    // categoryOptions survives on purpose — see its declaration.
  }, []);

  useEffect(() => {
    if (!isSheetOpen) return undefined;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      // A nested popup preventDefaults Escape when it consumes it, so one press
      // closes the category list and a second closes the sheet. Checking
      // defaultPrevented rather than relying on stopPropagation because in the
      // App Router the React root container is `document` — this listener sits
      // on the same node as React's, where stopPropagation cannot reach it.
      if (keyEvent.key === "Escape" && !keyEvent.defaultPrevented) handleSheetClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetOpen, handleSheetClose]);

  const isFormValid = title.trim() !== "" && category.trim() !== "" && locationText.trim() !== "";

  const handleCategoryCommit = (committedCategoryName: string) => {
    setCategoryOptions((previousCategoryOptions) =>
      appendOptionNameIfNew(previousCategoryOptions, committedCategoryName),
    );
    setCategory(committedCategoryName);
  };

  const handleSubmit = () => {
    const newReport: ProblemReport = {
      id: `local-report-${Date.now()}`,
      title: title.trim(),
      category,
      locationLabel: locationText.trim(),
      countryCode: "",
      mapPosition: { leftPercent: 50, topPercent: 50 },
      reportCount: 1,
      opportunityScore: 40,
      description: description.trim(),
      reportedDate: "Just now",
    };
    onReportSubmitted?.(newReport);
    setIsSubmitted(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Report a problem
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close report problem sheet"
            onClick={handleSheetClose}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label="Report a problem"
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            {/* Drag handle — mobile affordance only. */}
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 text-base font-medium">Report a problem</h2>
              <button
                type="button"
                onClick={handleSheetClose}
                aria-label="Close"
                className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
              >
                <Image
                  src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {isSubmitted ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
                    ✓
                  </span>
                  <p className="text-base font-medium">Report added to the map</p>
                  <p className="text-sm text-muted-foreground">
                    Reports raise the opportunity signal for builders. This one is session-local in
                    the mock phase.
                  </p>
                  <button
                    type="button"
                    onClick={handleSheetClose}
                    className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  className="flex flex-col gap-4 px-4 pb-6"
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    if (isFormValid) handleSubmit();
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
                    selectedOptionName={category}
                    optionNames={categoryOptions}
                    onOptionCommit={handleCategoryCommit}
                    helpText="Pick a category or type a new one — press Enter to create it."
                  />

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Location</span>
                    <input
                      type="text"
                      value={locationText}
                      onChange={(changeEvent) => setLocationText(changeEvent.target.value)}
                      placeholder="City, region or country"
                      className={INPUT_CLASS}
                    />
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
                    disabled={!isFormValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Add report
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
