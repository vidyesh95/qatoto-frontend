"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import type { ProblemReport } from "@/types/research-and-development";

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

const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";
const LABEL_CLASS = "text-xs font-medium text-[#6F7979]";

type ReportProblemSheetProps = {
  onReportSubmitted?: (report: ProblemReport) => void;
};

export default function ReportProblemSheet({ onReportSubmitted }: ReportProblemSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(PROBLEM_CATEGORIES[0]);
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isSheetOpen) return undefined;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") setIsSheetOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetOpen]);

  const isFormValid = title.trim() !== "" && locationText.trim() !== "";

  const handleClose = () => {
    setIsSheetOpen(false);
    setIsSubmitted(false);
    setTitle("");
    setCategory(PROBLEM_CATEGORIES[0]);
    setLocationText("");
    setDescription("");
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
            onClick={handleClose}
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
                onClick={handleClose}
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
                    onClick={handleClose}
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

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Category</span>
                    <select
                      value={category}
                      onChange={(changeEvent) => setCategory(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    >
                      {PROBLEM_CATEGORIES.map((categoryOption) => (
                        <option key={categoryOption} value={categoryOption}>
                          {categoryOption}
                        </option>
                      ))}
                    </select>
                  </label>

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
