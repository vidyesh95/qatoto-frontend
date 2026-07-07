import Image from "next/image";

import type { TeamMember } from "@/types/research-and-development";

// Roster tile for the Team tab: avatar, name with founder marker, role, top
// skills, and an equity / effort / joined footer. All figures are display-only
// mocks — equity and compensation math is backend-owned later.
export default function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        <Image
          src={member.avatarImageSrc}
          width={48}
          height={48}
          alt={member.name}
          className="size-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{member.name}</span>
            {member.isFounder && (
              <span className="shrink-0 rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
                Founder
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {member.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {skill}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 font-medium text-[#191C1C]">
          {member.equityShare} equity
        </span>
        <span>{member.effortHoursLogged} hrs logged</span>
        <span>Joined {member.joinedDate}</span>
      </div>
    </div>
  );
}
