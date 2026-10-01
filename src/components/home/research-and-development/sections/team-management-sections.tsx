"use client";

import { useState } from "react";
import RoleCompensationComposer from "@/components/home/research-and-development/sections/role-compensation-composer";
import {
  buildCompensationStrands,
  EMPTY_ROLE_COMPENSATION_DRAFT,
  type RoleCompensationDraft,
} from "@/lib/rnd/compensation-draft";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useDecideApplicationMutation,
  useInviteToProjectMutation,
  useOpenRoleMutation,
  useProjectApplicationsQuery,
  useProjectInvitesQuery,
  useProjectMemberMutation,
} from "@/hooks/rnd/projects";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import { formatIsoInstant } from "@/lib/rnd/format";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import {
  ROLE_COMMITMENTS,
  RoleCommitmentSchema,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";

export function TeamApplicationsList({
  projectSlug,
  decideMutation,
}: {
  readonly projectSlug: string;
  readonly decideMutation: ReturnType<typeof useDecideApplicationMutation>;
}) {
  const applicationsQuery = useProjectApplicationsQuery(projectSlug, "pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  if (applicationsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (applicationsQuery.isError) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load applications.</p>;
  }
  if (applicationsQuery.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No applications waiting.</p>;
  }

  return (
    <ul className="space-y-3">
      {applicationsQuery.data.map((application) => (
        <li
          key={application.id}
          className="space-y-2 rounded-2xl border border-outline-variant/60 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{application.applicantName}</p>
              <p className="text-xs text-muted-foreground">
                {application.roleTitleSnapshot ?? "Open application"} ·{" "}
                {ROLE_COMMITMENT_LABELS[application.statedCommitment]} ·{" "}
                {formatIsoInstant(application.createdAt)}
              </p>
            </div>
          </div>

          <p className="text-sm">{application.shortPitch}</p>

          {application.selectedSkills.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Says they have: {application.selectedSkills.join(", ")}
            </p>
          )}

          {application.expectedCompensationNote !== null && (
            <p className="text-xs text-muted-foreground">
              What they hope for: {application.expectedCompensationNote}
            </p>
          )}

          <input
            value={reviewNotes[application.id] ?? ""}
            onChange={(changeEvent) =>
              setReviewNotes((previousNotes) => ({
                ...previousNotes,
                [application.id]: changeEvent.target.value,
              }))
            }
            aria-label={`Note back to ${application.applicantName}`}
            placeholder="A note back to them (they will read this)"
            className={INPUT_CLASS}
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate({
                  applicationId: application.id,
                  decision: "accept",
                  reviewNote: reviewNotes[application.id],
                })
              }
              className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
            >
              Accept and add to the team
            </button>
            <button
              type="button"
              disabled={decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate({
                  applicationId: application.id,
                  decision: "decline",
                  reviewNote: reviewNotes[application.id],
                })
              }
              className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TeamInvitesSection({
  projectSlug,
  openRoles,
  inviteMutation,
}: {
  readonly projectSlug: string;
  readonly openRoles: readonly OpenRole[];
  readonly inviteMutation: ReturnType<typeof useInviteToProjectMutation>;
}) {
  const invitesQuery = useProjectInvitesQuery(projectSlug);
  const [inviteeUserId, setInviteeUserId] = useState("");
  const [inviteOpenRoleId, setInviteOpenRoleId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  return (
    <>
      {invitesQuery.data && invitesQuery.data.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {invitesQuery.data.map((invite) => (
            <li key={invite.id} className="text-muted-foreground">
              {invite.inviteeName}
              {invite.roleTitle !== null && ` — ${invite.roleTitle}`} · {invite.status}
              {invite.respondedAt !== null && ` · ${formatIsoInstant(invite.respondedAt)}`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">You have not invited anyone yet.</p>
      )}

      <form
        className="space-y-2 rounded-2xl border border-outline-variant/60 p-4"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          inviteMutation.mutate(
            {
              inviteeUserId: inviteeUserId.trim(),
              openRoleId: inviteOpenRoleId || undefined,
              message: inviteMessage.trim() || undefined,
            },
            {
              onSuccess: () => {
                setInviteeUserId("");
                setInviteOpenRoleId("");
                setInviteMessage("");
              },
            },
          );
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Invite someone by user id</span>
          <input
            required
            value={inviteeUserId}
            onChange={(changeEvent) => setInviteeUserId(changeEvent.target.value)}
            placeholder="Their user id, from their profile"
            className={INPUT_CLASS}
          />
        </label>
        {openRoles.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Against an open role (optional)</span>
            <select
              value={inviteOpenRoleId}
              onChange={(changeEvent) => setInviteOpenRoleId(changeEvent.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">No particular role</option>
              {openRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.roleTitle}
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
            placeholder="Why them? (optional)"
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
        {inviteMutation.isSuccess && (
          <p className="text-xs text-primary-imprint">
            Sent. They will see it on their own applications page — that is the only place an
            invitee can find it.
          </p>
        )}
      </form>
    </>
  );
}

export function TeamOpenRolesSection({
  openRoles,
  currency,
  roleMutation,
}: {
  readonly openRoles: readonly OpenRole[];
  readonly currency: string;
  readonly roleMutation: ReturnType<typeof useOpenRoleMutation>;
}) {
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleCommitment, setNewRoleCommitment] = useState<RoleCommitment>("part_time");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [compensationDraft, setCompensationDraft] = useState<RoleCompensationDraft>(
    EMPTY_ROLE_COMPENSATION_DRAFT,
  );
  const compensationStrands = buildCompensationStrands(compensationDraft);

  return (
    <div className="space-y-3">
      {openRoles.length > 0 && (
        <ul className="space-y-2">
          {openRoles.map((role) => (
            <li
              key={role.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant/60 p-3 text-sm"
            >
              <span>
                {role.roleTitle}
                <span className="block text-xs text-muted-foreground">
                  {role.slotsFilledCount} of {role.slotsTotal} filled · {role.status}
                </span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={roleMutation.isPending}
                  onClick={() =>
                    roleMutation.mutate({
                      action: role.status === "open" ? "close" : "reopen",
                      roleId: role.id,
                    })
                  }
                  className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {role.status === "open" ? "Close" : "Reopen"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-2 rounded-2xl border border-outline-variant/60 p-4"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          roleMutation.mutate(
            {
              action: "create",
              input: {
                roleTitle: newRoleTitle.trim(),
                commitment: newRoleCommitment,
                description: newRoleDescription.trim() || undefined,
                ...(compensationStrands === null || compensationStrands.length === 0
                  ? {}
                  : { compensation: compensationStrands }),
              },
            },
            {
              onSuccess: () => {
                setNewRoleTitle("");
                setCompensationDraft(EMPTY_ROLE_COMPENSATION_DRAFT);
              },
            },
          );
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Advertise a role</span>
          <input
            required
            value={newRoleTitle}
            onChange={(changeEvent) => setNewRoleTitle(changeEvent.target.value)}
            placeholder="e.g. Embedded firmware engineer"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Commitment</span>
          <select
            value={newRoleCommitment}
            onChange={(changeEvent) => {
              const parsed = RoleCommitmentSchema.safeParse(changeEvent.target.value);
              if (parsed.success) setNewRoleCommitment(parsed.data);
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
          <span className={LABEL_CLASS}>Role description (optional)</span>
          <textarea
            rows={2}
            value={newRoleDescription}
            onChange={(changeEvent) => setNewRoleDescription(changeEvent.target.value)}
            placeholder="What would they do?"
            className={INPUT_CLASS}
          />
        </label>
        <RoleCompensationComposer
          draft={compensationDraft}
          currency={currency}
          onDraftChange={(patch) => {
            setCompensationDraft((current) => ({ ...current, ...patch }));
          }}
        />
        <button
          type="submit"
          disabled={roleMutation.isPending || compensationStrands === null}
          className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
        >
          Advertise it
        </button>
        {compensationStrands === null && (
          <p className="text-xs text-muted-foreground">
            Finish the amounts you ticked — a range needs a starting number, and a maximum cannot be
            below it.
          </p>
        )}
      </form>
    </div>
  );
}

export function TeamRosterSection({
  team,
  memberMutation,
}: {
  readonly team: readonly ProjectTeamMember[];
  readonly memberMutation: ReturnType<typeof useProjectMemberMutation>;
}) {
  return (
    <ul className="space-y-2">
      {team.map((member) => (
        <li
          key={member.memberId}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant/60 p-3 text-sm"
        >
          <span>
            {member.name}
            <span className="block text-xs text-muted-foreground">
              {member.projectRole}
              {member.roleTitle !== null && ` · ${member.roleTitle}`}
            </span>
          </span>

          {!member.isFounder && (
            <span className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Project role for ${member.name}`}
                value={member.projectRole === "maintainer" ? "maintainer" : "contributor"}
                onChange={(changeEvent) =>
                  memberMutation.mutate({
                    action: "update",
                    memberId: member.memberId,
                    projectRole:
                      changeEvent.target.value === "maintainer" ? "maintainer" : "contributor",
                  })
                }
                className="rounded-xl border border-outline-variant p-1.5 text-xs"
              >
                <option value="contributor">Contributor</option>
                <option value="maintainer">Maintainer</option>
              </select>
              <button
                type="button"
                disabled={memberMutation.isPending}
                onClick={() =>
                  memberMutation.mutate({ action: "remove", memberId: member.memberId })
                }
                className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Remove
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
