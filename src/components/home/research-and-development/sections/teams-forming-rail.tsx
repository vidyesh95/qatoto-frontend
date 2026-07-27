import ProjectCard from "@/components/home/research-and-development/cards/project-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import type { ResearchProject } from "@/types/research-and-development";

// Projects currently in the team-building stage — the ones actively assembling
// a founding team rather than merely carrying a leftover open role. Mirrors
// `GET /research-projects?stage=team_building`, so the rail is as narrow as the
// query is and is not padded with projects at other stages.
export default function TeamsFormingRail({ projects }: { projects: ResearchProject[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="Teams forming right now" />
      {projects.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="px-4 text-sm text-muted-foreground lg:px-6">
          No project is in the team-building stage today. Roles from later stages are still open
          above.
        </p>
      )}
    </section>
  );
}
