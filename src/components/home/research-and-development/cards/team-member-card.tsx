// TRANSPORT: props-only — presentational server component. Fetches nothing; the
// member arrives as a prop from a parent that read GET /research-projects/:slug.
import Image from "next/image";

import { formatIsoInstant } from "@/lib/rnd/format";
import type { ProjectMemberRole, ProjectTeamMember } from "@/lib/rnd/projects.schemas";

const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  founder: "Founder",
  admin: "Admin",
  maintainer: "Maintainer",
  contributor: "Contributor",
};

/**
 * Roster tile for the Team tab.
 *
 * THE EQUITY AND EFFORT FOOTER IS GONE. `ProjectTeamMemberView` carries neither
 * `equityBasisPoints` nor `verifiedEffortMinutes`, deliberately — both are derived by
 * the §9 slice ledger, and printing a default for them would publish a fabricated
 * number as a member's share of a company.
 *
 * `roleTitle` is what the person does ("Thermal engineer"); `projectRole` is what they
 * may do (`maintainer`). They are different facts and the mock's single `role` string
 * conflated them. `isFounder` is computed from `projectRole` server-side, so the
 * contradictory founder-plus-contributor state cannot be represented.
 */
export default function TeamMemberCard({ member }: { member: ProjectTeamMember }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        {member.avatarImageUrl ? (
          <Image
            src={member.avatarImageUrl}
            width={48}
            height={48}
            alt={member.name}
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium">
            {member.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{member.name}</span>
            {member.isFounder && (
              <span className="shrink-0 rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
                Founder
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {member.roleTitle ?? PROJECT_MEMBER_ROLE_LABELS[member.projectRole]}
            {member.handle && ` · @${member.handle}`}
          </p>
        </div>
      </div>
      {member.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {member.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {skill}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
          {PROJECT_MEMBER_ROLE_LABELS[member.projectRole]}
        </span>
        <span>Joined {formatIsoInstant(member.joinedAt)}</span>
      </div>
    </div>
  );
}
