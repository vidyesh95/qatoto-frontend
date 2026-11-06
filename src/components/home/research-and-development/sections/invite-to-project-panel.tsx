// TRANSPORT: client-query — "use client" island calling useMyProjectsQuery and
// useInviteToProjectMutation. One write: POST /research-projects/:slug/invites.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useInviteToProjectMutation, useMyProjectsQuery } from "@/hooks/rnd/projects";
import { useSession } from "@/lib/auth-client";
import { ApiRequestError } from "@/lib/http";

/**
 * Invite the person on this profile to one of the viewer's own projects.
 *
 * THIS IS HOW A FOUNDER REACHES SOMEBODY. The team tab's old form asked for a raw user id, and no
 * screen showed one. `profile.userId` is already on the talent read, so the id never has to be
 * typed.
 *
 * IT RENDERS NOTHING to a viewer with no published project, and on a viewer's own profile. Hiding it
 * is display only: the backend re-checks maintainer rights and refuses a self-invite.
 */
export default function InviteToProjectPanel({
  inviteeUserId,
  inviteeName,
}: {
  readonly inviteeUserId: string;
  readonly inviteeName: string;
}) {
  const { data: session } = useSession();
  const myProjectsQuery = useMyProjectsQuery("active");
  const myProjects = myProjectsQuery.data?.rows ?? [];

  const [chosenProjectSlug, setChosenProjectSlug] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const selectedProjectSlug = chosenProjectSlug || myProjects[0]?.slug || "";

  const inviteMutation = useInviteToProjectMutation(selectedProjectSlug);
  const inviteError =
    inviteMutation.error instanceof ApiRequestError ? inviteMutation.error.apiError : null;

  if (myProjects.length === 0 || session?.user.id === inviteeUserId) return null;

  if (inviteMutation.isSuccess) {
    return (
      <MutationSuccessNotice
        message={`Invite sent. ${inviteeName} will find it on their applications page.`}
      />
    );
  }

  return (
    <form
      className="max-w-md space-y-2 rounded-2xl border border-outline-variant/60 p-4"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        inviteMutation.mutate({
          inviteeUserId,
          message: inviteMessage.trim() || undefined,
        });
      }}
    >
      <h2 className="text-sm font-medium">Invite to project</h2>
      {myProjects.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Project</span>
          <select
            value={selectedProjectSlug}
            onChange={(changeEvent) => setChosenProjectSlug(changeEvent.target.value)}
            className={INPUT_CLASS}
          >
            {myProjects.map((project) => (
              <option key={project.slug} value={project.slug}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Message (optional)</span>
        <textarea
          rows={2}
          value={inviteMessage}
          onChange={(changeEvent) => setInviteMessage(changeEvent.target.value)}
          placeholder="Why them?"
          className={INPUT_CLASS}
        />
      </label>
      <button
        type="submit"
        disabled={inviteMutation.isPending}
        className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
      >
        {inviteMutation.isPending ? "Sending…" : "Send the invite"}
      </button>
      {inviteError !== null && <MutationErrorNotice error={inviteError} />}
    </form>
  );
}
