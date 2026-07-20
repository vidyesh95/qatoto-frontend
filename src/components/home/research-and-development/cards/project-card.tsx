import Image from "next/image";
import Link from "next/link";

import { PROJECT_STAGE_LABELS } from "@/mocks/research-and-development-mocks";
import type { ResearchProject } from "@/types/research-and-development";

// Project tile for the featured-projects rail: cover with a stage badge, funding
// progress toward the open (or most recent) round, team avatar stack, and
// open-roles count. The whole card links to the project detail page.
export default function ProjectCard({ project }: { project: ResearchProject }) {
  const displayedFundingRound =
    project.fundingRounds.find((round) => round.status === "open") ?? project.fundingRounds.at(-1);
  const openRolesCount = project.openRoles.length;

  return (
    <Link
      href={`/research-and-development/project/${project.id}`}
      className="group relative flex w-72 shrink-0 flex-col sm:w-80"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors group-hover:bg-gray-100" />
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={project.coverImageSrc}
          fill
          sizes="(min-width: 640px) 320px, 288px"
          alt={project.name}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[#191C1C]">
          {PROJECT_STAGE_LABELS[project.stage]}
        </span>
      </div>
      <div className="mt-1.5 space-y-1 px-0.5">
        <p className="truncate text-sm font-semibold">{project.name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{project.tagline}</p>
        {displayedFundingRound && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#00696E]"
                style={{ width: `${displayedFundingRound.percentageFunded}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {displayedFundingRound.percentageFunded}% of {displayedFundingRound.goalAmount} raised
            </p>
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex -space-x-2">
            {project.teamMembers.slice(0, 3).map((teamMember) => (
              <Image
                key={teamMember.id}
                src={teamMember.avatarImageSrc}
                width={24}
                height={24}
                alt={teamMember.name}
                className="size-6 rounded-full object-cover ring-2 ring-background"
              />
            ))}
          </div>
          {openRolesCount > 0 && (
            <span className="text-xs font-medium text-[#00696E]">
              {openRolesCount} open role{openRolesCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
