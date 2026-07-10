import ProjectImmortalContributors from "@/components/home/research-and-development/sections/project-immortal-contributors";
import ProjectImmortalDiscussion from "@/components/home/research-and-development/sections/project-immortal-discussion";
import ProjectImmortalHero from "@/components/home/research-and-development/sections/project-immortal-hero";
import ProjectImmortalInformalPosts from "@/components/home/research-and-development/sections/project-immortal-informal-posts";
import ProjectImmortalPapers from "@/components/home/research-and-development/sections/project-immortal-papers";
import ProjectImmortalProducts from "@/components/home/research-and-development/sections/project-immortal-products";
import ResearchBranchMap from "@/components/home/research-and-development/sections/research-branch-map";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import {
  MOCK_IMMORTAL_CONTRIBUTORS,
  MOCK_IMMORTAL_IDEAS,
  MOCK_IMMORTAL_INFORMAL_POSTS,
  MOCK_IMMORTAL_PRODUCT_OPPORTUNITIES,
  MOCK_IMMORTAL_PROGRAM_STATS,
  MOCK_IMMORTAL_RESEARCH_BRANCHES,
  MOCK_IMMORTAL_RESEARCH_PAPERS,
} from "@/lib/project-immortal-mocks";

// Project Immortal page body. Server component — the moonshot story top to
// bottom: what the program is, the crowd's research map, what it can ship,
// the two paper tracks (formal + informal), who is building it and how they
// get paid, and the open discussion.
export default function ProjectImmortalPage() {
  return (
    <div className="space-y-8 pb-8">
      <ProjectImmortalHero stats={MOCK_IMMORTAL_PROGRAM_STATS} />

      <section className="space-y-4">
        <SectionHeader title="Research branch map" />
        <ResearchBranchMap branches={MOCK_IMMORTAL_RESEARCH_BRANCHES} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Products this research can unlock" />
        <ProjectImmortalProducts opportunities={MOCK_IMMORTAL_PRODUCT_OPPORTUNITIES} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Formal research papers" />
        <ProjectImmortalPapers initialPapers={MOCK_IMMORTAL_RESEARCH_PAPERS} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Informal papers" />
        <ProjectImmortalInformalPosts initialPosts={MOCK_IMMORTAL_INFORMAL_POSTS} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Contributors & compensation" />
        <ProjectImmortalContributors contributors={MOCK_IMMORTAL_CONTRIBUTORS} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Netizen discussion" />
        <ProjectImmortalDiscussion initialIdeas={MOCK_IMMORTAL_IDEAS} />
      </section>
    </div>
  );
}
