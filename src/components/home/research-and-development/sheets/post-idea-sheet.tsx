"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

// Self-contained "post your idea" trigger + bottom sheet (§8.1). Mock phase:
// submitting shows a confirmation only — nothing is persisted and no card is
// appended to the featured rail. The real submission goes to the Express
// backend later.

const IDEA_CATEGORIES = [
  "Agriculture",
  "Clean Energy",
  "Healthcare",
  "Housing",
  "Logistics",
  "Manufacturing",
  "Water",
];

const ROLES_NEEDED_OPTIONS = [
  "Engineer",
  "Designer",
  "Hardware",
  "Marketing",
  "Operations",
  "Finance",
];

const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";
const LABEL_CLASS = "text-xs font-medium text-[#6F7979]";

type PostIdeaSheetProps = {
  triggerLabel?: string;
  triggerClassName?: string;
};

export default function PostIdeaSheet({
  triggerLabel = "Post your idea",
  triggerClassName = "cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
}: PostIdeaSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ideaName, setIdeaName] = useState("");
  const [oneLinePitch, setOneLinePitch] = useState("");
  const [category, setCategory] = useState(IDEA_CATEGORIES[0]);
  const [problemItSolves, setProblemItSolves] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);

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

  const isFormValid = ideaName.trim() !== "" && oneLinePitch.trim() !== "";

  const handleClose = () => {
    setIsSheetOpen(false);
    setIsSubmitted(false);
    setIdeaName("");
    setOneLinePitch("");
    setCategory(IDEA_CATEGORIES[0]);
    setProblemItSolves("");
    setRolesNeeded([]);
  };

  const toggleRoleNeeded = (roleOption: string) => {
    setRolesNeeded((previousRoles) =>
      previousRoles.includes(roleOption)
        ? previousRoles.filter((selectedRole) => selectedRole !== roleOption)
        : [...previousRoles, roleOption],
    );
  };

  return (
    <>
      <button type="button" onClick={() => setIsSheetOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close post idea sheet"
            onClick={handleClose}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label="Post your idea"
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            {/* Drag handle — mobile affordance only. */}
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 text-base font-medium">Post your idea</h2>
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
                  <p className="text-base font-medium">Idea posted — team matching begins</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll surface people trading skills for equity who fit your roles.
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
                    if (isFormValid) setIsSubmitted(true);
                  }}
                >
                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Idea name</span>
                    <input
                      type="text"
                      value={ideaName}
                      onChange={(changeEvent) => setIdeaName(changeEvent.target.value)}
                      placeholder="e.g. Solar-powered cold storage"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>One-line pitch</span>
                    <input
                      type="text"
                      value={oneLinePitch}
                      onChange={(changeEvent) => setOneLinePitch(changeEvent.target.value)}
                      placeholder="What it does, in one sentence"
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
                      {IDEA_CATEGORIES.map((categoryOption) => (
                        <option key={categoryOption} value={categoryOption}>
                          {categoryOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Problem it solves</span>
                    <textarea
                      value={problemItSolves}
                      onChange={(changeEvent) => setProblemItSolves(changeEvent.target.value)}
                      placeholder="Who has this problem, and how bad is it?"
                      rows={3}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Roles needed</span>
                    <div className="flex flex-wrap gap-2">
                      {ROLES_NEEDED_OPTIONS.map((roleOption) => {
                        const isRoleSelected = rolesNeeded.includes(roleOption);
                        return (
                          <button
                            key={roleOption}
                            type="button"
                            aria-pressed={isRoleSelected}
                            onClick={() => toggleRoleNeeded(roleOption)}
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              isRoleSelected
                                ? "bg-[#00696E] text-white"
                                : "bg-muted text-foreground hover:bg-muted/70"
                            }`}
                          >
                            {roleOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Post idea
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
