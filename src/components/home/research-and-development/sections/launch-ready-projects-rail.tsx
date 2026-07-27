import ProjectCard from "@/components/home/research-and-development/cards/project-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import type { ResearchProject } from "@/types/research-and-development";

// Projects that reached the go-to-market stage — the ones with a build behind
// them and a listing ahead. Mirrors `GET /launch-ready-projects`, which is
// scoped to active projects at that stage and nothing else.
export default function LaunchReadyProjectsRail({ projects }: { projects: ResearchProject[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="Projects ready to launch" />
      {projects.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
