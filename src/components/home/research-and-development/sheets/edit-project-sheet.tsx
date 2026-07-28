// TRANSPORT: props-only — client island. Holds draft-form state only; the project
// arrives as a prop from a server parent that read GET /research-projects/:slug.
"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";
import { PROJECT_STAGES, type ProjectStage } from "@/lib/rnd/shared.schemas";

// Project edit entry point (§14.6). Until now a project could be posted through
// the /new wizard and never changed again — a stage that moves, a tagline that
// was wrong on day one, and no way to fix either.
//
// THE FORM READS REAL DATA AND STILL SAVES NOTHING. `PATCH /research-projects/:slug`
// and `PATCH …/stage` both exist and are founder-scoped, but this pass is reads-only,
// so submitting captures the draft locally and the page keeps showing the server's
// values. It is also shown to every visitor, which the real edit path will not be.

const STAGE_ORDER: readonly ProjectStage[] = PROJECT_STAGES;

export default function EditProjectSheet({ project }: { project: ResearchProjectDetail }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [draftTagline, setDraftTagline] = useState(project.tagline);
  // `description` is nullable on the wire; a controlled textarea needs a string.
  const [draftDescription, setDraftDescription] = useState(project.description ?? "");
  const [draftCategory, setDraftCategory] = useState(project.category.label);
  const [draftStage, setDraftStage] = useState<ProjectStage>(project.stage);

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

  const isDraftValid = draftName.trim() !== "" && draftTagline.trim() !== "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
      >
        {hasSaved ? "Edited ✓" : "Edit project"}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close edit project sheet"
            onClick={() => setIsSheetOpen(false)}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label={`Edit ${project.name}`}
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 truncate text-base font-medium">Edit project</h2>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
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
              {hasSaved ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
                    ✓
                  </span>
                  <p className="text-base font-medium">Changes captured</p>
                  <p className="text-sm text-muted-foreground">
                    Nothing was sent — this surface reads the backend and does not write to it yet,
                    so the page still shows the saved values.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSheetOpen(false)}
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
                    if (isDraftValid) setHasSaved(true);
                  }}
                >
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Project name</span>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(changeEvent) => setDraftName(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>One-line pitch</span>
                    <input
                      type="text"
                      value={draftTagline}
                      onChange={(changeEvent) => setDraftTagline(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Description</span>
                    <textarea
                      rows={4}
                      value={draftDescription}
                      onChange={(changeEvent) => setDraftDescription(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Category</span>
                    <input
                      type="text"
                      value={draftCategory}
                      onChange={(changeEvent) => setDraftCategory(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Pipeline stage</span>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_ORDER.map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          aria-pressed={draftStage === stage}
                          onClick={() => setDraftStage(stage)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            draftStage === stage
                              ? "bg-[#00696E] text-white"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {PROJECT_STAGE_LABELS[stage]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground">
                    Equity, slices and compensation are not editable here and never will be — they
                    are computed from verified effort, not typed in by a founder.
                  </p>

                  <button
                    type="submit"
                    disabled={!isDraftValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Save changes
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
