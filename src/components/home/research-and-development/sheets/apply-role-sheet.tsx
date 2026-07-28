// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import CompensationBadges, {
  COMPENSATION_KIND_LABELS,
  summarizeCompensationKinds,
} from "@/components/home/research-and-development/cards/compensation-badges";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import { COMPENSATION_EARNED_AS_POLICY_LABELS } from "@/lib/rnd/labels";
import type { RoleCommitment } from "@/lib/rnd/shared.schemas";

import { COMMITMENT_LABELS, COMMITMENT_OPTIONS } from "./sheet-shared";

// Self-contained "express interest" trigger + bottom sheet for an open role
// (§8.4, skills-for-compensation). Mock phase: submitting flips the trigger to
// "Interest sent" in local state only — applications go to the Express
// backend later.

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
                      <CompensationBadges strands={role.compensation} currency={role.currency} />
                    </div>
                    {/* Equity is COMPUTED, never asserted: it comes from the Slicing
                        Pie ledger and no endpoint sets a share from a request body. So
                        the range above is an offer, and this says so. Cash is paid by
                        the company and reported on Qatoto — Qatoto holds no funds. */}
                    <p className="text-xs text-muted-foreground">
                      Equity is computed by Qatoto&apos;s Slicing Pie formula from your verified
                      effort — the range above is what the project is offering, not an allocated
                      stake.
                    </p>
                    {/* The policy per strand, from the enum rather than prose a founder
                        typed, so a role cannot advertise a mechanism that does not exist. */}
                    <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {role.compensation.map((strand) => (
                        <li key={strand.kind}>
                          <span className="font-medium text-foreground">
                            {COMPENSATION_KIND_LABELS[strand.kind]}:
                          </span>{" "}
                          {COMPENSATION_EARNED_AS_POLICY_LABELS[strand.earnedAsPolicy]}
                          {strand.earnedAsNote !== null && ` — ${strand.earnedAsNote}`}
                        </li>
                      ))}
                    </ul>
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
                      placeholder={summarizeCompensationKinds(role.compensation)}
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
