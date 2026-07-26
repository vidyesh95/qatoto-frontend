"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import {
  COMMITMENT_LABELS,
  COMMITMENT_OPTIONS,
} from "@/components/home/research-and-development/sheets/sheet-shared";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { RoleCommitment, TalentAvailability } from "@/types/research-and-development";

// Talent profile editing (§14.6). The /talent grid could be browsed and its
// people invited, but nobody could edit their own entry — so the marketplace
// only ever described people as they were the day the fixture was written.
// Saves nothing this phase.

const AVAILABILITY_OPTIONS: TalentAvailability[] = [
  "open-to-work",
  "open-to-offers",
  "unavailable",
];

const AVAILABILITY_LABELS: Record<TalentAvailability, string> = {
  "open-to-work": "Open to work",
  "open-to-offers": "Open to offers",
  unavailable: "Unavailable",
};

export default function EditTalentProfileSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [draftHeadlineRole, setDraftHeadlineRole] = useState("");
  const [draftLocationLabel, setDraftLocationLabel] = useState("");
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftSkillInput, setDraftSkillInput] = useState("");
  const [draftCommitment, setDraftCommitment] = useState<RoleCommitment>("part-time");
  const [draftAvailability, setDraftAvailability] = useState<TalentAvailability>("open-to-offers");

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

  const handleAddSkill = () => {
    const trimmedSkill = draftSkillInput.trim();
    if (trimmedSkill === "" || draftSkills.includes(trimmedSkill)) return;
    setDraftSkills((currentSkills) => [...currentSkills, trimmedSkill]);
    setDraftSkillInput("");
  };

  const isDraftValid = draftHeadlineRole.trim() !== "" && draftSkills.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
      >
        {hasSaved ? "Profile updated ✓" : "Edit my profile"}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close edit profile sheet"
            onClick={() => setIsSheetOpen(false)}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label="Edit my talent profile"
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 truncate text-base font-medium">Edit my profile</h2>
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
                  <p className="text-base font-medium">Profile captured</p>
                  <p className="text-sm text-muted-foreground">
                    Mock phase: nothing was saved and the grid still shows the fixtures.
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
                    <span className={LABEL_CLASS}>Headline role</span>
                    <input
                      type="text"
                      value={draftHeadlineRole}
                      onChange={(changeEvent) => setDraftHeadlineRole(changeEvent.target.value)}
                      placeholder="Refrigeration engineer"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Location</span>
                    <input
                      type="text"
                      value={draftLocationLabel}
                      onChange={(changeEvent) => setDraftLocationLabel(changeEvent.target.value)}
                      placeholder="Nairobi, Kenya"
                      className={INPUT_CLASS}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Skills</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draftSkillInput}
                        onChange={(changeEvent) => setDraftSkillInput(changeEvent.target.value)}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === "Enter") {
                            keyEvent.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Add a skill and press Enter"
                        className={INPUT_CLASS}
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="cursor-pointer rounded-full border border-[#6F7979] px-4 text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                    {draftSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {draftSkills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              setDraftSkills((currentSkills) =>
                                currentSkills.filter((candidateSkill) => candidateSkill !== skill),
                              )
                            }
                            className="cursor-pointer rounded-full bg-[#00696E]/10 px-3 py-1 text-xs font-medium text-[#00696E]"
                          >
                            {skill} ✕
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Commitment</span>
                    <div className="flex flex-wrap gap-2">
                      {COMMITMENT_OPTIONS.map((commitment) => (
                        <button
                          key={commitment}
                          type="button"
                          aria-pressed={draftCommitment === commitment}
                          onClick={() => setDraftCommitment(commitment)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            draftCommitment === commitment
                              ? "bg-[#00696E] text-white"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {COMMITMENT_LABELS[commitment]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Availability</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABILITY_OPTIONS.map((availability) => (
                        <button
                          key={availability}
                          type="button"
                          aria-pressed={draftAvailability === availability}
                          onClick={() => setDraftAvailability(availability)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            draftAvailability === availability
                              ? "bg-[#00696E] text-white"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {AVAILABILITY_LABELS[availability]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground">
                    Verified effort hours and completed projects are not editable — they come from
                    the Proof of Effort ledger, not from a profile form.
                  </p>

                  <button
                    type="submit"
                    disabled={!isDraftValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Save profile
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
