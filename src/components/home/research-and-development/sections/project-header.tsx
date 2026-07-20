import Image from "next/image";

import RequestToJoinButton from "@/components/home/research-and-development/sections/request-to-join-button";
import BackProjectSheet from "@/components/home/research-and-development/sheets/back-project-sheet";
import { PROJECT_STAGE_LABELS } from "@/mocks/research-and-development-mocks";
import type { ResearchProject } from "@/types/research-and-development";

// Always-visible project header above the detail tabs: cover band, name +
// tagline, stage/category badges, founder row, stats row, and the join/back
// actions. All figures are display-only mocks — backend-owned later.
export default function ProjectHeader({ project }: { project: ResearchProject }) {
  const founder = project.teamMembers.find((teamMember) => teamMember.isFounder);
  const openFundingRound = project.fundingRounds.find(
    (fundingRound) => fundingRound.status === "open",
  );
  const teamSize = project.teamMembers.length;

  return (
    <div className="space-y-4">
      <div className="relative mx-4 h-48 overflow-hidden rounded-2xl md:h-64 lg:mx-6">
        <Image
          src={project.coverImageSrc}
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          alt={project.name}
          className="object-cover"
        />
      </div>
      <div className="space-y-3 px-4 lg:px-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#00696E]/10 px-3 py-1 text-xs font-medium text-[#00696E]">
            {PROJECT_STAGE_LABELS[project.stage]}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {project.category}
          </span>
        </div>
        {founder && (
          <div className="flex items-center gap-2">
            <Image
              src={founder.avatarImageSrc}
              width={32}
              height={32}
              alt={founder.name}
              className="size-8 rounded-full object-cover"
            />
            <span className="text-sm">
              Founded by <span className="font-medium">{founder.name}</span>
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {openFundingRound && (
            <span>
              <span className="font-semibold text-foreground">
                {openFundingRound.percentageFunded}%
              </span>{" "}
              of {openFundingRound.goalAmount} raised
            </span>
          )}
          <span>
            <span className="font-semibold text-foreground">{teamSize}</span> team member
            {teamSize === 1 ? "" : "s"}
          </span>
          <span>
            <span className="font-semibold text-foreground">{project.dailyLogStreakDays}</span>
            -day log streak
          </span>
          <span>
            <span className="font-semibold text-foreground">{project.watchersCount}</span> watchers
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <RequestToJoinButton />
          <BackProjectSheet projectName={project.name} />
        </div>
      </div>
    </div>
  );
}
