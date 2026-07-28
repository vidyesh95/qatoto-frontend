// TRANSPORT: mock — NOT WIRED (phase 2). Reads a static dataset from
// src/mocks/research-and-development*. Every figure here is fabricated; see
// docs/R_AND_D_STRUCTURE.md §18 for what wires it and §19 for the transport map.
import { notFound } from "next/navigation";

import DailyLogsTab from "@/components/home/research-and-development/sections/daily-logs-tab";
import FundingTab from "@/components/home/research-and-development/sections/funding-tab";
import GovernanceTab from "@/components/home/research-and-development/sections/governance-tab";
import OverviewTab from "@/components/home/research-and-development/sections/overview-tab";
import ProjectHeader from "@/components/home/research-and-development/sections/project-header";
import ProjectTabs from "@/components/home/research-and-development/sections/project-tabs";
import TeamTab from "@/components/home/research-and-development/sections/team-tab";
import { MOCK_RESEARCH_PROJECTS } from "@/mocks/research-and-development-mocks";

// Project detail page body: resolves one mock project by slug, then hands the five
// server-rendered tab panels to the client tabs island.
//
// THE OVERVIEW CROSS-REFERENCES ARE DARK UNTIL PHASE 2, and deliberately so. Market
// insights and problem clusters are now read from the API, so the mock market-insight
// and problem-report arrays are gone. A mock project's `relatedInsightIds` /
// `originProblemReportId` are authored slugs that match no real row, so resolving them
// against live data would yield nothing anyway — and fabricating a match to keep the
// chips on screen would be inventing evidence. Both sections are length-guarded and
// stay hidden until the phase-2 project read supplies the server-side links.
export default function ProjectDetail({ projectId }: { projectId: string }) {
  const project = MOCK_RESEARCH_PROJECTS.find(
    (candidateProject) => candidateProject.id === projectId,
  );
  if (!project) notFound();

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <ProjectHeader project={project} />
      <ProjectTabs
        overviewPanel={<OverviewTab project={project} relatedInsights={[]} />}
        dailyLogsPanel={<DailyLogsTab project={project} />}
        teamPanel={<TeamTab project={project} />}
        fundingPanel={<FundingTab project={project} />}
        governancePanel={<GovernanceTab project={project} />}
      />
    </div>
  );
}
