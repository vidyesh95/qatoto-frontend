import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import TeamMemberCard from "@/components/home/research-and-development/cards/team-member-card";
import type { ResearchProject } from "@/types/research-and-development";

const EQUITY_SEGMENT_COLORS = ["#00696E", "#1DBDC5", "#4A6363", "#7DA0A2", "#B4D2D4"];

// Team tab: stacked equity-split bar with legend, the member roster, and open
// equity-for-skills roles. Equity figures are display-only mocks — the split
// math is backend-owned later.
export default function TeamTab({ project }: { project: ResearchProject }) {
  const equitySegments = project.teamMembers.map((teamMember, memberIndex) => ({
    member: teamMember,
    widthPercent: parseFloat(teamMember.equityShare),
    color: EQUITY_SEGMENT_COLORS[memberIndex % EQUITY_SEGMENT_COLORS.length],
  }));
  const allocatedPercent = equitySegments.reduce(
    (runningTotal, segment) => runningTotal + segment.widthPercent,
    0,
  );
  const unallocatedPercent = Math.round((100 - allocatedPercent) * 10) / 10;

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Equity split</h3>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {equitySegments.map((segment) => (
            <div
              key={segment.member.id}
              style={{ width: `${segment.widthPercent}%`, backgroundColor: segment.color }}
            />
          ))}
          <div className="flex-1 bg-muted" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {equitySegments.map((segment) => (
            <span key={segment.member.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              {segment.member.name} — {segment.member.equityShare}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-muted" />
            Unallocated {unallocatedPercent}%
          </span>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Team roster</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {project.teamMembers.map((teamMember) => (
            <TeamMemberCard key={teamMember.id} member={teamMember} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Open roles</h3>
        {project.openRoles.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {project.openRoles.map((openRole) => (
              <OpenRoleCard key={openRole.id} role={openRole} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No open roles right now.</p>
        )}
      </section>
    </div>
  );
}
