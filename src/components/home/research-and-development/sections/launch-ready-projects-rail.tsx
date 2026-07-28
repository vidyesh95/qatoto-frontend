// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET /launch-ready-projects.
import Image from "next/image";
import Link from "next/link";

import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import { formatEffortFromMinutes, formatEquityFromBasisPoints } from "@/lib/rnd/format";
import type { LaunchReadyProject } from "@/lib/rnd/suppliers.schemas";

const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

/**
 * Projects that reached the go-to-market stage — a build behind them, a listing ahead.
 *
 * NOT `ProjectCard`. `GET /launch-ready-projects` returns its own projection: the
 * project's identity plus **what it actually listed**, joined through
 * `product.researchProjectId`. That last part is the whole point of the rail — the
 * generic project card has nowhere to show it — so this renders its own tile rather
 * than discarding the field to reuse a component.
 *
 * Both stats are NULL until §9's jobs have run and are rendered as absences. Coercing
 * them to 0 would assert "this project has no verified effort" about a project that is
 * shipping.
 */
export default function LaunchReadyProjectsRail({ projects }: { projects: LaunchReadyProject[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="Projects ready to launch" />
      {projects.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
          {projects.map((project) => (
            <Link
              key={project.projectSlug}
              href={`/research-and-development/project/${project.projectSlug}`}
              className="group flex w-72 shrink-0 flex-col sm:w-80"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={project.projectCoverImageUrl ?? FALLBACK_COVER_IMAGE_SRC}
                  fill
                  sizes="(min-width: 640px) 320px, 288px"
                  alt={project.projectName}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-1.5 space-y-1 px-0.5">
                <p className="truncate text-sm font-semibold">{project.projectName}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {project.projectTagline}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project.verifiedEffortMinutesTotal === null
                    ? "Verified effort not computed yet"
                    : `${formatEffortFromMinutes(project.verifiedEffortMinutesTotal)} verified`}
                  {project.allocatedEquityBasisPoints !== null &&
                    ` · ${formatEquityFromBasisPoints(project.allocatedEquityBasisPoints)} allocated`}
                </p>
                {project.launchedProducts.length > 0 && (
                  <p className="text-xs font-medium text-[#00696E]">
                    {project.launchedProducts.length} listing
                    {project.launchedProducts.length === 1 ? "" : "s"} live
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-4 text-sm text-muted-foreground lg:px-6">
          No project has reached this stage yet.
        </p>
      )}
    </section>
  );
}
