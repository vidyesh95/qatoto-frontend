// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET /research-projects.
import Image from "next/image";
import Link from "next/link";

import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { ResearchProjectListRow } from "@/lib/rnd/projects.schemas";

// A project has no cover until its founder uploads one, and the backend returns null
// rather than inventing a placeholder URL.
const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

/**
 * Project tile for the featured-projects rail and the stage-filtered rails.
 *
 * NO FUNDING BAR AND NO AVATAR STACK, and that is the backend's shape rather than an
 * omission: `GET /research-projects` returns counts, not rounds and not member rows.
 * A funding bar here would mean one `/funding-rounds` request per card — an N+1 on a
 * rail — and an avatar stack would mean a second one for the roster. The row carries
 * `teamMemberCount`, `openRoleCount` and `watchersCount`, so the card shows those and
 * the detail page shows the rest.
 */
export default function ProjectCard({ project }: { project: ResearchProjectListRow }) {
  return (
    <Link
      href={`/research-and-development/project/${project.slug}`}
      className="group relative flex w-72 shrink-0 flex-col sm:w-80"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors group-hover:bg-gray-100" />
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={project.coverImageUrl ?? FALLBACK_COVER_IMAGE_SRC}
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
        <p className="text-xs text-muted-foreground">{project.categoryLabel}</p>
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <span className="text-muted-foreground">
            {project.teamMemberCount} on the team · {project.watchersCount} watching
          </span>
          {project.openRoleCount > 0 && (
            <span className="font-medium text-[#00696E]">
              {project.openRoleCount} open role{project.openRoleCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
