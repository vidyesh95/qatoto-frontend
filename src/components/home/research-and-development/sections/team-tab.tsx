// TRANSPORT: props-only — presentational server component. Fetches nothing; the
// roster arrives embedded on the project detail read and the roles as their own
// view state from GET …/roles. The management island nested below IS a client-query
// island — it reads the application inbox and writes every people decision.
import Link from "next/link";

import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import TeamManagementIsland from "@/components/home/research-and-development/sections/team-management-island";
import TeamMemberCard from "@/components/home/research-and-development/cards/team-member-card";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";
import type { MemberScopedListViewState } from "@/lib/view-state";

type TeamTabProps = {
  project: ResearchProjectDetail;
  /** `…/roles` is public, so `restricted` is unreachable — handled for exhaustiveness. */
  openRolesState: MemberScopedListViewState<OpenRole>;
};

/**
 * Team tab: the roster, and this project's open equity-for-skills roles.
 *
 * THE EQUITY SPLIT BAR IS DELETED, and this is the important part of the change.
 * `ProjectTeamMemberView` carries no `equityBasisPoints` and no `verifiedEffortMinutes`
 * — the backend omits both DELIBERATELY, because they are derived by the §9 slice
 * ledger and returning a default would render a fabricated number as fact on a Slicing
 * Pie surface. The old bar was driven by `parseFloat("68%")` over an authored string.
 * There is no honest substitute: the real cap table is the Proof-of-Effort equity
 * snapshot, which is phase 4.
 *
 * OPEN ROLES ARE NOW REAL. `GET …/roles` returns the same row shape as the
 * cross-project `/open-roles`, which could never substitute here — its query schema is
 * `.strict()` and has no `projectSlug` facet.
 */
export default function TeamTab({ project, openRolesState }: TeamTabProps) {
  function renderOpenRoles() {
    switch (openRolesState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load this project's open roles." />;
      case "restricted":
        return <RndErrorPanel message="Couldn't load this project's open roles." />;
      case "empty":
        return (
          <p className="text-sm text-muted-foreground">
            No open roles right now.{" "}
            <Link
              href="/research-and-development/team-building"
              className="font-medium text-[#00696E] underline"
            >
              Browse every open role
            </Link>
          </p>
        );
      case "ready":
        return (
          <div className="flex flex-wrap gap-3">
            {openRolesState.rows.map((openRole) => (
              <OpenRoleCard key={openRole.id} role={openRole} />
            ))}
          </div>
        );
      default: {
        const exhaustiveCheck: never = openRolesState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Team roster</h3>
        {project.team.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {project.team.map((teamMember) => (
              <TeamMemberCard key={teamMember.memberId} member={teamMember} />
            ))}
          </div>
        ) : (
          <RndStatusPanel message="Nobody has joined this project yet." />
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Equity split</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          Equity here is earned, not assigned: verified effort mints slices at a locked rate and the
          slices decide the split. The ledger that computes it is not on this page — nothing on this
          tab is a share of the company.
        </p>
        {project.stats?.allocatedEquityBasisPoints === null && (
          <p className="text-xs text-muted-foreground">
            No slices have been allocated on this project yet.
          </p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Open roles</h3>
        {renderOpenRoles()}
      </section>
      <TeamManagementIsland
        projectSlug={project.slug}
        currency={project.currency}
        team={project.team}
        openRoles={openRolesState.status === "ready" ? openRolesState.rows : []}
        viewerProjectRole={project.viewerProjectRole}
      />
    </div>
  );
}
