"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import CompensationBadges, {
  COMPENSATION_KIND_LABELS,
  summarizeCompensationKinds,
} from "@/components/home/research-and-development/cards/compensation-badges";
import type { OpenRole, RoleCommitment } from "@/types/research-and-development";

// Self-contained "express interest" trigger + bottom sheet for an open role
// (§8.4, skills-for-compensation). Mock phase: submitting flips the trigger to
// "Interest sent" in local state only — applications go to the Express
// backend later.

const COMMITMENT_OPTIONS: RoleCommitment[] = ["full-time", "part-time", "hobby"];

const COMMITMENT_LABELS: Record<RoleCommitment, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  hobby: "Hobby",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";
const LABEL_CLASS = "text-xs font-medium text-[#6F7979]";

type ApplyRoleSheetProps = {
  role: OpenRole;
};

export default function ApplyRoleSheet({ role }: ApplyRoleSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasSentInterest, setHasSentInterest] = useState(false);
  const [shortPitch, setShortPitch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<RoleCommitment>(role.commitment);
  const [compensationExpectation, setCompensationExpectation] = useState("");

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

  const isFormValid = shortPitch.trim() !== "";

  const toggleSkill = (skill: string) => {
    setSelectedSkills((previousSkills) =>
      previousSkills.includes(skill)
        ? previousSkills.filter((selectedSkill) => selectedSkill !== skill)
        : [...previousSkills, skill],
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${
          hasSentInterest
            ? "bg-[#00696E]/10 text-[#00696E]"
            : "border border-[#6F7979] text-[#00696E]"
        }`}
      >
        {hasSentInterest ? "Interest sent" : "Express interest"}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close apply role sheet"
            onClick={() => setIsSheetOpen(false)}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label={`Apply for ${role.roleTitle}`}
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            {/* Drag handle — mobile affordance only. */}
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-medium">{role.roleTitle}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {role.projectName} · {summarizeCompensationKinds(role.compensation)}
                </p>
              </div>
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
              {hasSentInterest ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
                    ✓
                  </span>
                  <p className="text-base font-medium">Interest sent</p>
                  <p className="text-sm text-muted-foreground">
                    The {role.projectName} team will review your pitch. Mock phase — nothing is
                    persisted.
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
                    if (isFormValid) setHasSentInterest(true);
                  }}
                >
                  <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3">
                    <span className={LABEL_CLASS}>What this role offers</span>
                    <div className="flex flex-wrap gap-1.5">
                      <CompensationBadges components={role.compensation} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Every payout is earned as Qatoto verifies your logged work — nothing upfront.
                      Equity is computed by Qatoto&apos;s Slicing Pie formula from your verified
                      effort.
                    </p>
                    {role.compensation.some((component) => component.earnedAsLabel) && (
                      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {role.compensation
                          .filter((component) => component.earnedAsLabel)
                          .map((component) => (
                            <li key={component.kind}>
                              <span className="font-medium text-foreground">
                                {COMPENSATION_KIND_LABELS[component.kind]}:
                              </span>{" "}
                              {component.earnedAsLabel}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Short pitch</span>
                    <textarea
                      value={shortPitch}
                      onChange={(changeEvent) => setShortPitch(changeEvent.target.value)}
                      placeholder="Why you, for this role?"
                      rows={3}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Your matching skills</span>
                    <div className="flex flex-wrap gap-2">
                      {role.skills.map((skill) => {
                        const isSkillSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={isSkillSelected}
                            onClick={() => toggleSkill(skill)}
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              isSkillSelected
                                ? "bg-[#00696E] text-white"
                                : "bg-muted text-foreground hover:bg-muted/70"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Commitment</span>
                    <select
                      value={commitment}
                      onChange={(changeEvent) => {
                        const nextCommitment = COMMITMENT_OPTIONS.find(
                          (commitmentOption) => commitmentOption === changeEvent.target.value,
                        );
                        if (nextCommitment) setCommitment(nextCommitment);
                      }}
                      className={INPUT_CLASS}
                    >
                      {COMMITMENT_OPTIONS.map((commitmentOption) => (
                        <option key={commitmentOption} value={commitmentOption}>
                          {COMMITMENT_LABELS[commitmentOption]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLASS}>Your compensation expectation</span>
                    <input
                      type="text"
                      value={compensationExpectation}
                      onChange={(changeEvent) =>
                        setCompensationExpectation(changeEvent.target.value)
                      }
                      placeholder={role.compensation
                        .map((component) => component.amountLabel)
                        .join(" + ")}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Send interest
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
