// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import ProjectCard from "@/components/home/research-and-development/cards/project-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import type { ResearchProjectListRow } from "@/lib/rnd/projects.schemas";

// Projects currently in the team-building stage — the ones actively assembling
// a founding team rather than merely carrying a leftover open role. Mirrors
// `GET /research-projects?stage=team_building`, so the rail is as narrow as the
// query is and is not padded with projects at other stages.
export default function TeamsFormingRail({ projects }: { projects: ResearchProjectListRow[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="Teams forming right now" />
      {/* SNAPS TO A CARD, so a swipe or a trackpad flick never rests with a card cut in half.
          `scroll-px-*` matches the `px-*` gutter so the snapped card keeps that gutter instead of
          landing flush against the edge, and `*:snap-start` sets the alignment from here, so the
          card is unchanged everywhere else it renders. */}
      {projects.length > 0 ? (
        <div className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-2 pb-2 *:snap-start lg:scroll-px-6 lg:px-6">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
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
