import MarketInsightsRail from "@/components/home/research-and-development/rails/market-insights-rail";
import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import ProjectsRail from "@/components/home/research-and-development/rails/projects-rail";
import LifecycleRolesStrip from "@/components/home/research-and-development/sections/lifecycle-roles-strip";
import PipelineHero from "@/components/home/research-and-development/sections/pipeline-hero";
import PipelineStagesStrip from "@/components/home/research-and-development/sections/pipeline-stages-strip";
import ProblemMapPreview from "@/components/home/research-and-development/sections/problem-map-preview";
import ProjectImmortalBanner from "@/components/home/research-and-development/sections/project-immortal-banner";
import Link from "next/link";
import {
  MOCK_MARKET_INSIGHTS,
  MOCK_OPEN_ROLES,
  MOCK_PROBLEM_REPORTS,
  MOCK_RESEARCH_PROJECTS,
} from "@/mocks/research-and-development-mocks";

// R&D landing page body. Server component — composes the pipeline story top to
// bottom (§4 of R_AND_D_STRUCTURE.md): hero, stage strip, lifecycle roles,
// featured projects, problem-map teaser, market insights, open roles, moonshot
// banner, bottom CTA.
export default function ResearchAndDevelopmentPage() {
  const topReportedGaps = MOCK_PROBLEM_REPORTS.toSorted(
    (firstReport, secondReport) => secondReport.opportunityScore - firstReport.opportunityScore,
  ).slice(0, 4);
  const featuredInsights = MOCK_MARKET_INSIGHTS.slice(0, 5);

  return (
    <div className="space-y-8 pb-8">
      <PipelineHero />
      <PipelineStagesStrip />
      <LifecycleRolesStrip />
      <ProjectsRail projects={MOCK_RESEARCH_PROJECTS} />
      <ProblemMapPreview reports={topReportedGaps} />
      <MarketInsightsRail insights={featuredInsights} />
      <OpenRolesRail roles={MOCK_OPEN_ROLES} />
      <ProjectImmortalBanner />
      <section className="mx-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
        <h2 className="text-xl font-semibold md:text-2xl">Have an idea the world needs?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Post it and Qatoto lines up the demand data, teammates, and backers to build it.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/research-and-development/new"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Post your idea
          </Link>
        </div>
      </section>
    </div>
  );
}
