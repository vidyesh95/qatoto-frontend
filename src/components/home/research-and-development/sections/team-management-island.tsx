// TRANSPORT: client-query — "use client" island. Reads GET …/applications and
// GET …/invites, and writes the application decisions, the invite, role CRUD, member role
// changes, removals and "leave this project".
"use client";

import { useState } from "react";

import RoleCompensationComposer, {
  buildCompensationStrands,
  EMPTY_ROLE_COMPENSATION_DRAFT,
  type RoleCompensationDraft,
} from "@/components/home/research-and-development/sections/role-compensation-composer";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useDecideApplicationMutation,
  useInviteToProjectMutation,
  useOpenRoleMutation,
  useProjectApplicationsQuery,
  useProjectInvitesQuery,
  useProjectMemberMutation,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import { formatIsoInstant } from "@/lib/rnd/format";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import {
  ROLE_COMMITMENTS,
  RoleCommitmentSchema,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";

/** Maintainer and above see the inbox and the role controls. */
const MAINTAINER_ROLES = ["founder", "admin", "maintainer"];

function isMaintainer(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && MAINTAINER_ROLES.includes(viewerProjectRole);
}

/**
 * Everything a maintainer does with people.
 *
 * FOUR SURFACES THAT SHARE ONE AUDIENCE: the application inbox, the invites this project
 * has sent, the open-role editor, and the roster's role/removal controls. They live
 * together because they are one job — deciding who is on the team — and apart from the
 * public roster because a visitor has no business seeing who applied.
 *
 * **THE ROLE DROPDOWN OFFERS TWO OPTIONS, NOT FOUR.** `UpdateMemberSchema`'s enum is
 * `maintainer | contributor`. `founder` is absent because it is written exactly once, by
 * the create transaction — a project cannot gain a second founder or transfer the first —
 * and `admin` is absent because its purpose is co-signing and pre-seeding admins before
 * that flow exists is risk bought for nothing.
 *
 * **CLOSING A ROLE IS NOT DELETING IT**, and the UI prefers closing: `DELETE` is refused
 * once the role has applications, because the people who applied are a record.
 *
 * **LEAVING IS ITS OWN ENDPOINT.** `DELETE …/members/me` rather than removing yourself by
 * id: anyone may leave, while removing someone else needs maintainer, and the two must not
 * share a control.
 */
export default function TeamManagementIsland({
  projectSlug,
  currency,
  team,
  openRoles,
  viewerProjectRole,
}: {
  projectSlug: string;
  /** The PROJECT's currency. A role never carries a client-chosen one. */
  currency: string;
  team: ProjectTeamMember[];
  openRoles: OpenRole[];
  viewerProjectRole: string | null;
}) {
  const canManage = isMaintainer(viewerProjectRole);
  const isMember = viewerProjectRole !== null;

  const applicationsQuery = useProjectApplicationsQuery(projectSlug, "pending");
  const invitesQuery = useProjectInvitesQuery(projectSlug);
  const decideMutation = useDecideApplicationMutation(projectSlug);
  const inviteMutation = useInviteToProjectMutation(projectSlug);
  const roleMutation = useOpenRoleMutation(projectSlug);
  const memberMutation = useProjectMemberMutation(projectSlug);

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [inviteeUserId, setInviteeUserId] = useState("");
  const [inviteRoleTitle, setInviteRoleTitle] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleCommitment, setNewRoleCommitment] = useState<RoleCommitment>("part_time");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [compensationDraft, setCompensationDraft] = useState<RoleCompensationDraft>(
    EMPTY_ROLE_COMPENSATION_DRAFT,
  );
  /** `null` when a ticked strand is half-filled — the submit guard, not an error. */
  const compensationStrands = buildCompensationStrands(compensationDraft);

  const firstError = [
    decideMutation.error,
    inviteMutation.error,
    roleMutation.error,
    memberMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  if (!isMember) return null;

  return (
    <div className="space-y-6 border-t border-[#CAC4D0]/40 pt-6">
      {canManage && (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">
              People who want to join
            </h3>
            {renderApplications()}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Invites you have sent</h3>
            {renderInvites()}
            {renderInviteForm()}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Roles you advertise</h3>
            {renderRoleControls()}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">The roster</h3>
            {renderRosterControls()}
          </section>
        </>
      )}

      {viewerProjectRole !== "founder" && (
        <section className="space-y-2">
          <button
            type="button"
            disabled={memberMutation.isPending}
            onClick={() => memberMutation.mutate({ action: "leave" })}
            className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Leave this project
          </button>
          <p className="text-xs text-muted-foreground">
            Your slices stay in the ledger. Leaving stops new effort accruing; it does not undo what
            you already earned.
          </p>
        </section>
      )}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </div>
  );

  function renderApplications() {
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
          <li key={application.id} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
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

            {/* Their own sentence. Nothing reads it but you — it is not a rate and it
                is not an input to any grant. */}
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
                className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
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
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function renderInvites() {
    if (invitesQuery.isPending || invitesQuery.isError) return null;
    if (invitesQuery.data.length === 0) {
      return <p className="text-sm text-muted-foreground">You have not invited anyone yet.</p>;
    }
    return (
      <ul className="space-y-1 text-sm">
        {invitesQuery.data.map((invite) => (
          <li key={invite.id} className="text-muted-foreground">
            {invite.inviteeName}
            {invite.roleTitle !== null && ` — ${invite.roleTitle}`} · {invite.status}
            {invite.respondedAt !== null && ` · ${formatIsoInstant(invite.respondedAt)}`}
          </li>
        ))}
      </ul>
    );
  }

  function renderInviteForm() {
    return (
      <form
        className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          inviteMutation.mutate(
            {
              inviteeUserId: inviteeUserId.trim(),
              roleTitle: inviteRoleTitle.trim() || undefined,
              message: inviteMessage.trim() || undefined,
            },
            {
              onSuccess: () => {
                setInviteeUserId("");
                setInviteRoleTitle("");
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
        <input
          value={inviteRoleTitle}
          onChange={(changeEvent) => setInviteRoleTitle(changeEvent.target.value)}
          placeholder="Role title (optional)"
          className={INPUT_CLASS}
        />
        <textarea
          rows={2}
          value={inviteMessage}
          onChange={(changeEvent) => setInviteMessage(changeEvent.target.value)}
          placeholder="Why them? (optional)"
          className={INPUT_CLASS}
        />
        <button
          type="submit"
          disabled={inviteMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {inviteMutation.isPending ? "Sending…" : "Send the invite"}
        </button>
        {inviteMutation.isSuccess && (
          <p className="text-xs text-[#00696E]">
            Sent. They will see it on their own applications page — that is the only place an
            invitee can find it.
          </p>
        )}
      </form>
    );
  }

  function renderRoleControls() {
    return (
      <div className="space-y-3">
        {openRoles.length > 0 && (
          <ul className="space-y-2">
            {openRoles.map((role) => (
              <li
                key={role.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
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
                    className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {role.status === "open" ? "Close" : "Reopen"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            roleMutation.mutate(
              {
                action: "create",
                input: {
                  roleTitle: newRoleTitle.trim(),
                  commitment: newRoleCommitment,
                  description: newRoleDescription.trim() || undefined,
                  // An EMPTY array is a legitimate answer — the unpaid role — so it is sent
                  // rather than omitted. `null` from the builder means a ticked strand is
                  // half-filled, and the submit button is already disabled for it.
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
          <textarea
            rows={2}
            value={newRoleDescription}
            onChange={(changeEvent) => setNewRoleDescription(changeEvent.target.value)}
            placeholder="What would they do?"
            className={INPUT_CLASS}
          />
          <RoleCompensationComposer
            draft={compensationDraft}
            currency={currency}
            onDraftChange={(patch) => {
              setCompensationDraft((current) => ({ ...current, ...patch }));
            }}
          />
          <button
            type="submit"
            // `null` means a ticked strand is incomplete — an equity band with no minimum, a
            // maximum below its minimum. Refusing here is friendlier than sending something
            // `open_role_compensation_ranges_ck` would refuse anyway.
            disabled={roleMutation.isPending || compensationStrands === null}
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Advertise it
          </button>
          {compensationStrands === null && (
            <p className="text-xs text-muted-foreground">
              Finish the amounts you ticked — a range needs a starting number, and a maximum cannot
              be below it.
            </p>
          )}
        </form>
      </div>
    );
  }

  function renderRosterControls() {
    return (
      <ul className="space-y-2">
        {team.map((member) => (
          <li
            key={member.memberId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
          >
            <span>
              {member.name}
              <span className="block text-xs text-muted-foreground">
                {member.projectRole}
                {member.roleTitle !== null && ` · ${member.roleTitle}`}
              </span>
            </span>

            {/* The founder's row has no controls: the role is written once by the create
                transaction and cannot be changed or removed. */}
            {!member.isFounder && (
              <span className="flex flex-wrap items-center gap-2">
                <select
                  value={member.projectRole === "maintainer" ? "maintainer" : "contributor"}
                  onChange={(changeEvent) =>
                    memberMutation.mutate({
                      action: "update",
                      memberId: member.memberId,
                      projectRole:
                        changeEvent.target.value === "maintainer" ? "maintainer" : "contributor",
                    })
                  }
                  className="rounded-xl border border-[#CAC4D0] p-1.5 text-xs"
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
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
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
}
