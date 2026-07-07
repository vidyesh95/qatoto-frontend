import { notFound } from "next/navigation";

import DailyLogsTab from "@/components/home/research-and-development/sections/daily-logs-tab";
import FundingTab from "@/components/home/research-and-development/sections/funding-tab";
import GovernanceTab from "@/components/home/research-and-development/sections/governance-tab";
import OverviewTab from "@/components/home/research-and-development/sections/overview-tab";
import ProjectHeader from "@/components/home/research-and-development/sections/project-header";
import ProjectTabs from "@/components/home/research-and-development/sections/project-tabs";
import TeamTab from "@/components/home/research-and-development/sections/team-tab";
import {
  MOCK_MARKET_INSIGHTS,
  MOCK_PROBLEM_REPORTS,
  MOCK_RESEARCH_PROJECTS,
} from "@/lib/research-and-development-mocks";

// Project detail page body: resolves one mock project by slug plus its
// cross-referenced insights and origin report, then hands the five
// server-rendered tab panels to the client tabs island.
export default function ProjectDetail({ projectId }: { projectId: string }) {
  const project = MOCK_RESEARCH_PROJECTS.find(
    (candidateProject) => candidateProject.id === projectId,
  );
  if (!project) notFound();

  const relatedInsights = MOCK_MARKET_INSIGHTS.filter((insight) =>
    project.relatedInsightIds.includes(insight.id),
  );
  const originReport = MOCK_PROBLEM_REPORTS.find(
    (problemReport) => problemReport.id === project.originProblemReportId,
  );

  return (
    <div className="space-y-6 pb-8">
      <ProjectHeader project={project} />
      <ProjectTabs
        overviewPanel={
          <OverviewTab
            project={project}
            relatedInsights={relatedInsights}
            originReport={originReport}
          />
        }
        dailyLogsPanel={<DailyLogsTab project={project} />}
        teamPanel={<TeamTab project={project} />}
        fundingPanel={<FundingTab project={project} />}
        governancePanel={<GovernanceTab project={project} />}
      />
    </div>
  );
}
