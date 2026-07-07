import ProjectCard from "@/components/home/research-and-development/cards/project-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";

import type { ResearchProject } from "@/types/research-and-development";

// Horizontally scrolling feed of featured research projects — the main event
// of the landing page. Anchored so the hero and stage cards can deep-link here.
export default function ProjectsRail({ projects }: { projects: ResearchProject[] }) {
  return (
    <section id="featured-projects" className="scroll-mt-20 space-y-1">
      <SectionHeader title="Featured projects" />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
