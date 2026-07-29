// TRANSPORT: client-query — "use client" island calling useApplyToProjectMutation.
// One write: POST /research-projects/:slug/applications, with an openRoleId.
"use client";

import { useState } from "react";

import CompensationBadges from "@/components/home/research-and-development/cards/compensation-badges";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet, {
  RndSheetConfirmation,
} from "@/components/home/research-and-development/sheets/rnd-sheet";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useApplyToProjectMutation } from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import {
  ROLE_COMMITMENTS,
  RoleCommitmentSchema,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";

/**
 * Apply to a SPECIFIC role.
 *
 * IT USED TO SEND NOTHING — the old version flipped `hasSentInterest` to "Interest sent"
 * while no request left the browser, which tells someone their application is with a team
 * it never reached.
 *
 * THE DIFFERENCE FROM THE HEADER'S BUTTON IS `openRoleId`. That one files an OPEN
 * application ("I'd like to help"); this one names the role, and the backend snapshots its
 * title onto the row so the application still reads correctly after the role is closed or
 * renamed.
 *
 * `selectedSkills` ARE THE ROLE'S OWN TAGS, chosen rather than typed. An applicant
 * inventing skill strings would produce rows nothing can match against the canonical
 * vocabulary.
 *
 * `expectedCompensationNote` IS THE APPLICANT'S OWN SENTENCE. The ledger never reads it and
 * no grant is computed from it; nothing downstream totals or compares these.
 */
export default function ApplyRoleSheet({ role }: { role: OpenRole }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [shortPitch, setShortPitch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [statedCommitment, setStatedCommitment] = useState<RoleCommitment>(role.commitment);
  const [expectedCompensationNote, setExpectedCompensationNote] = useState("");

  const applyMutation = useApplyToProjectMutation(role.projectSlug);
  const applyError =
    applyMutation.error instanceof ApiRequestError ? applyMutation.error.apiError : null;

  const isFormValid = shortPitch.trim() !== "";

  function closeSheet() {
    setIsSheetOpen(false);
    applyMutation.reset();
    setShortPitch("");
    setSelectedSkills([]);
    setExpectedCompensationNote("");
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((previousSkills) =>
      previousSkills.includes(skill)
        ? previousSkills.filter((selectedSkill) => selectedSkill !== skill)
        : [...previousSkills, skill],
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="mt-auto cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
      >
        Apply for this role
      </button>

      <RndSheet title={`Apply — ${role.roleTitle}`} isOpen={isSheetOpen} onClose={closeSheet}>
        {applyMutation.isSuccess ? (
          <RndSheetConfirmation
            headline="Application sent"
            detail="The team decides from here. You can follow it — and read their reply — on your applications page."
            onDismiss={closeSheet}
          />
        ) : (
          <form
            className="flex flex-col gap-4 px-4 pb-6"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              if (!isFormValid) return;
              applyMutation.mutate({
                openRoleId: role.id,
                shortPitch: shortPitch.trim(),
                selectedSkills: selectedSkills.length > 0 ? selectedSkills : undefined,
                statedCommitment,
                expectedCompensationNote:
                  expectedCompensationNote.trim().length > 0
                    ? expectedCompensationNote.trim()
                    : undefined,
              });
            }}
          >
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {role.projectName} · {role.slotsTotal - role.slotsFilledCount} of {role.slotsTotal}{" "}
                still open
              </p>
              {/* The badges render as a bare fragment, so the flex container is ours. */}
              {role.compensation.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <CompensationBadges strands={role.compensation} currency={role.currency} />
                </div>
              )}
            </div>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Why you</span>
              <textarea
                value={shortPitch}
                onChange={(changeEvent) => setShortPitch(changeEvent.target.value)}
                placeholder="What have you built that is relevant here?"
                rows={4}
                className={INPUT_CLASS}
              />
            </label>

            {role.skills.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className={LABEL_CLASS}>Which of these you have</span>
                <div className="flex flex-wrap gap-2">
                  {role.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      aria-pressed={selectedSkills.includes(skill)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ${
                        selectedSkills.includes(skill)
                          ? "bg-[#00696E] text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>What you can commit</span>
              <select
                value={statedCommitment}
                onChange={(changeEvent) => {
                  const parsed = RoleCommitmentSchema.safeParse(changeEvent.target.value);
                  if (parsed.success) setStatedCommitment(parsed.data);
                }}
                className={INPUT_CLASS}
              >
                {ROLE_COMMITMENTS.map((commitment) => (
                  <option key={commitment} value={commitment}>
                    {ROLE_COMMITMENT_LABELS[commitment]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>What you would hope for (optional)</span>
              <input
                type="text"
                value={expectedCompensationNote}
                onChange={(changeEvent) => setExpectedCompensationNote(changeEvent.target.value)}
                placeholder="In your own words"
                className={INPUT_CLASS}
              />
              <span className="text-xs text-muted-foreground">
                Read by the team, and by nothing else. No number here is priced, totalled or
                compared against anyone.
              </span>
            </label>

            <button
              type="submit"
              disabled={!isFormValid || applyMutation.isPending}
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {applyMutation.isPending ? "Sending…" : "Send my application"}
            </button>

            {applyError !== null && <MutationErrorNotice error={applyError} />}
          </form>
        )}
      </RndSheet>
    </>
  );
}
