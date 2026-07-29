// TRANSPORT: client-query — "use client" island calling useApplyToProjectMutation.
// One write: POST /research-projects/:slug/applications.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { useApplyToProjectMutation } from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import {
  ROLE_COMMITMENTS,
  RoleCommitmentSchema,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";

/**
 * Apply to a project without picking a role.
 *
 * IT USED TO SEND NOTHING. The old version flipped `useState` to "Request sent ✓", which
 * is the most misleading control a page can carry: it tells someone their application is
 * with the team when no request left the browser.
 *
 * NO `openRoleId` HERE, on purpose — this is the open application, "I'd like to help".
 * Applying to a specific role happens on the role card, which knows which role it is.
 *
 * `expectedCompensationNote` IS THE APPLICANT'S OWN SENTENCE. It is never read by the
 * ledger and is never an input to any grant; nothing downstream totals it or compares it.
 */
export default function RequestToJoinButton({ projectSlug }: { projectSlug: string }) {
  const applyMutation = useApplyToProjectMutation(projectSlug);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [shortPitch, setShortPitch] = useState("");
  const [statedCommitment, setStatedCommitment] = useState<RoleCommitment>("part_time");
  const [expectedCompensationNote, setExpectedCompensationNote] = useState("");

  const applyError =
    applyMutation.error instanceof ApiRequestError ? applyMutation.error.apiError : null;

  if (applyMutation.isSuccess) {
    return <MutationSuccessNotice message="Sent. You can follow it on your applications page." />;
  }

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
      >
        Ask to join
      </button>
    );
  }

  return (
    <form
      className="w-full space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        applyMutation.mutate({
          shortPitch,
          statedCommitment,
          expectedCompensationNote:
            expectedCompensationNote.length > 0 ? expectedCompensationNote : undefined,
        });
      }}
    >
      <textarea
        required
        rows={3}
        value={shortPitch}
        onChange={(changeEvent) => setShortPitch(changeEvent.target.value)}
        placeholder="What would you bring to this?"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <select
        value={statedCommitment}
        onChange={(changeEvent) => {
          const parsed = RoleCommitmentSchema.safeParse(changeEvent.target.value);
          if (parsed.success) setStatedCommitment(parsed.data);
        }}
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      >
        {ROLE_COMMITMENTS.map((commitment) => (
          <option key={commitment} value={commitment}>
            {ROLE_COMMITMENT_LABELS[commitment]}
          </option>
        ))}
      </select>
      <input
        value={expectedCompensationNote}
        onChange={(changeEvent) => setExpectedCompensationNote(changeEvent.target.value)}
        placeholder="What you'd hope for, in your own words (optional)"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={applyMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {applyMutation.isPending ? "Sending…" : "Send my application"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      {applyError !== null && <MutationErrorNotice error={applyError} />}
    </form>
  );
}
