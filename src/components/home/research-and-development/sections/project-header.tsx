// TRANSPORT: props-only — presentational server component. Fetches nothing; the
// project arrives as a prop from a parent that read GET /research-projects/:slug.
import Image from "next/image";

import RequestToJoinButton from "@/components/home/research-and-development/sections/request-to-join-button";
import WatchProjectButton from "@/components/home/research-and-development/sections/watch-project-button";
import EditProjectSheet from "@/components/home/research-and-development/sheets/edit-project-sheet";
import { formatIsoInstant } from "@/lib/rnd/format";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";

/** `coverImageUrl` is nullable on the wire; the mock field it replaced was not. */
const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

/**
 * Always-visible project header above the detail tabs.
 *
 * THE FUNDING LINE IS GONE. It used to read "{percentageFunded}% of {goalAmount}
 * raised" off the project's embedded rounds, but `GET /research-projects/:slug` carries
 * no rounds — they are a member-scoped read that lives on the Funding tab. Restating a
 * figure here would need a second request whose 404 this header cannot honestly render.
 *
 * The stats row reads the `stats` sidecar, which is job-computed and STORED. Every
 * figure on it is nullable and renders as an absence: a project whose stats job has not
 * run has no streak, which is not the same as a streak of zero.
 */
export default function ProjectHeader({ project }: { project: ResearchProjectDetail }) {
  const founder = project.team.find((teamMember) => teamMember.isFounder);
  const teamMemberCount = project.stats?.teamMemberCount ?? project.team.length;
  const dailyLogStreakDays = project.stats?.dailyLogStreakDays ?? null;

  return (
    <div className="space-y-4">
      <div className="relative mx-4 h-48 overflow-hidden rounded-2xl md:h-64 lg:mx-6">
        <Image
          src={project.coverImageUrl ?? FALLBACK_COVER_IMAGE_SRC}
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
            {project.category.label}
          </span>
          {project.targetRegion && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {project.targetRegion}
            </span>
          )}
        </div>
        {founder && (
          <div className="flex items-center gap-2">
            {founder.avatarImageUrl && (
              <Image
                src={founder.avatarImageUrl}
                width={32}
                height={32}
                alt={founder.name}
                className="size-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm">
              Founded by <span className="font-medium">{founder.name}</span>
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{teamMemberCount}</span> team member
            {teamMemberCount === 1 ? "" : "s"}
          </span>
          {dailyLogStreakDays !== null && (
            <span>
              <span className="font-semibold text-foreground">{dailyLogStreakDays}</span>
              -day log streak
            </span>
          )}
          {project.stats && (
            <span>
              <span className="font-semibold text-foreground">{project.stats.watchersCount}</span>{" "}
              watchers
            </span>
          )}
        </div>
        {/* A stored counter shown without its freshness bound reads as a live number. */}
        {project.stats?.statsComputedAt && (
          <p className="text-xs text-muted-foreground">
            Stats as of {formatIsoInstant(project.stats.statsComputedAt)}
          </p>
        )}
        {/* THE "BACK THIS PROJECT" BUTTON IS GONE FROM THE HEADER, deliberately. A pledge
            is recorded against a ROUND, and the header holds none — the old control was a
            sheet that flipped local state and posted nowhere. The real control lives on
            the Funding tab beside the round it commits to. */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <WatchProjectButton
            projectSlug={project.slug}
            isWatchedByViewer={project.isWatchedByViewer}
          />
          <RequestToJoinButton projectSlug={project.slug} />
          <EditProjectSheet project={project} />
        </div>
      </div>
    </div>
  );
}
