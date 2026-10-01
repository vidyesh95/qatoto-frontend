// TRANSPORT: client-query — "use client" island. Reads GET …/applications and
// GET …/invites, and writes the application decisions, the invite, role CRUD, member role
// changes, removals and "leave this project".
"use client";

import {
  TeamApplicationsList,
  TeamInvitesSection,
  TeamOpenRolesSection,
  TeamRosterSection,
} from "@/components/home/research-and-development/sections/team-management-sections";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useDecideApplicationMutation,
  useInviteToProjectMutation,
  useOpenRoleMutation,
  useProjectMemberMutation,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";

/** Maintainer and above see the inbox and the role controls. */
const MAINTAINER_ROLES = ["founder", "admin", "maintainer"];

function isMaintainer(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && MAINTAINER_ROLES.includes(viewerProjectRole);
}

export default function TeamManagementIsland({
  projectSlug,
  currency,
  team,
  openRoles,
  viewerProjectRole,
}: {
  readonly projectSlug: string;
  readonly currency: string;
  readonly team: readonly ProjectTeamMember[];
  readonly openRoles: readonly OpenRole[];
  readonly viewerProjectRole: string | null;
}) {
  const canManage = isMaintainer(viewerProjectRole);
  const isMember = viewerProjectRole !== null;

  const decideMutation = useDecideApplicationMutation(projectSlug);
  const inviteMutation = useInviteToProjectMutation(projectSlug);
  const roleMutation = useOpenRoleMutation(projectSlug);
  const memberMutation = useProjectMemberMutation(projectSlug);

  const firstError = [
    decideMutation.error,
    inviteMutation.error,
    roleMutation.error,
    memberMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  if (!isMember) return null;

  return (
    <div className="space-y-6 border-t border-outline-variant/40 pt-6">
      {canManage && (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">
              People who want to join
            </h3>
            <TeamApplicationsList projectSlug={projectSlug} decideMutation={decideMutation} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Invites you have sent</h3>
            <TeamInvitesSection
              projectSlug={projectSlug}
              openRoles={openRoles}
              inviteMutation={inviteMutation}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Roles you advertise</h3>
            <TeamOpenRolesSection
              openRoles={openRoles}
              currency={currency}
              roleMutation={roleMutation}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">The roster</h3>
            <TeamRosterSection team={team} memberMutation={memberMutation} />
          </section>
        </>
      )}

      {viewerProjectRole !== "founder" && (
        <section className="space-y-2">
          <button
            type="button"
            disabled={memberMutation.isPending}
            onClick={() => memberMutation.mutate({ action: "leave" })}
            className="cursor-pointer rounded-full border border-outline-variant px-4 py-2 text-sm font-medium disabled:opacity-50"
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
}
