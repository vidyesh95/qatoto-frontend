// TRANSPORT: server-fetch — server component. Reads GET /research-projects/:slug
// (public) plus nine member-scoped child reads, forwarding the session cookie through
// callerRequestOptions(). The Compensation tab's controls are client-query islands nested
// inside it. See docs/R_AND_D_STRUCTURE.md §19 for the transport map.
import { notFound } from "next/navigation";

import CompensationTab from "@/components/home/research-and-development/sections/compensation-tab";
import DailyLogsTab from "@/components/home/research-and-development/sections/daily-logs-tab";
import FundingTab from "@/components/home/research-and-development/sections/funding-tab";
import OverviewTab from "@/components/home/research-and-development/sections/overview-tab";
import ProjectHeader from "@/components/home/research-and-development/sections/project-header";
import ProjectLaunchReadiness from "@/components/home/research-and-development/sections/project-launch-readiness";
import ProjectTabs from "@/components/home/research-and-development/sections/project-tabs";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import TeamTab from "@/components/home/research-and-development/sections/team-tab";
import {
  getProjectCompensation,
  listCompensationAgreements,
  listCompensationPeriods,
} from "@/lib/rnd/compensation.api";
import { listProjectDailyLogs } from "@/lib/rnd/daily-logs.api";
import {
  getProjectInvestorConfidence,
  listProjectFundingRounds,
  listProjectMilestones,
} from "@/lib/rnd/funding.api";
import { getResearchProjectDetail, listProjectOpenRoles } from "@/lib/rnd/projects.api";
import { getProjectLaunchReadiness } from "@/lib/rnd/suppliers.api";
import { toMemberScopedItemViewState, toMemberScopedListViewState } from "@/lib/rnd/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const DAILY_LOGS_PAGE_LIMIT = 30;
const COMPENSATION_PERIOD_LIMIT = 12;

/**
 * Project detail page body.
 *
 * THE READ ORDER IS LOAD-BEARING. The public detail read runs alone and first: its
 * `404` means "no such project, or a draft you do not own" and becomes `notFound()`,
 * which leaks nothing. Only once it SUCCEEDS is the project's existence public
 * knowledge the visitor arrived with — which is what makes a "members only" message
 * legitimate on the four child reads, and only there. Everywhere else in this app a 404
 * must stay silent about why.
 *
 * The child reads then run concurrently off one `callerRequestOptions()`, and each gets
 * its OWN view state: a dead `…/milestones` dims the Overview tab's timeline and nothing
 * else.
 */
export default async function ProjectDetail({ projectSlug }: { projectSlug: string }) {
  const requestOptions = await callerRequestOptions();
  const detailResult = await getResearchProjectDetail(projectSlug, requestOptions);

  if (!detailResult.success) {
    if (detailResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndErrorPanel message="Couldn't load this project." />
      </div>
    );
  }

  const project = detailResult.data;

  const [
    openRolesResult,
    milestonesResult,
    dailyLogsResult,
    fundingRoundsResult,
    confidenceResult,
    launchReadinessResult,
    agreementsResult,
    periodsResult,
    compensationResult,
  ] = await Promise.all([
    listProjectOpenRoles(projectSlug, requestOptions),
    listProjectMilestones(projectSlug, requestOptions),
    listProjectDailyLogs(projectSlug, { limit: DAILY_LOGS_PAGE_LIMIT }, requestOptions),
    listProjectFundingRounds(projectSlug, requestOptions),
    getProjectInvestorConfidence(projectSlug, requestOptions),
    getProjectLaunchReadiness(projectSlug, requestOptions),
    listCompensationAgreements(projectSlug, {}, requestOptions),
    listCompensationPeriods(projectSlug, { limit: COMPENSATION_PERIOD_LIMIT }, requestOptions),
    getProjectCompensation(projectSlug, requestOptions),
  ]);

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <ProjectHeader project={project} />
      <ProjectTabs
        overviewPanel={
          <OverviewTab
            project={project}
            milestonesState={toMemberScopedListViewState(milestonesResult)}
          />
        }
        dailyLogsPanel={
          <DailyLogsTab dailyLogsState={toMemberScopedListViewState(dailyLogsResult)} />
        }
        teamPanel={
          <TeamTab
            project={project}
            openRolesState={toMemberScopedListViewState(openRolesResult)}
          />
        }
        fundingPanel={
          <FundingTab
            fundingRoundsState={toMemberScopedListViewState(fundingRoundsResult)}
            investorConfidenceState={toMemberScopedItemViewState(confidenceResult)}
          />
        }
        compensationPanel={
          <CompensationTab
            agreementsState={toMemberScopedListViewState(agreementsResult)}
            periodsState={toMemberScopedListViewState(periodsResult)}
            compensationState={toMemberScopedItemViewState(compensationResult)}
            projectSlug={projectSlug}
            viewerProjectRole={project.viewerProjectRole}
          />
        }
        goToMarketPanel={
          <div className="space-y-3 px-4 lg:px-6">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Launch readiness</h3>
            <ProjectLaunchReadiness
              readinessState={toMemberScopedItemViewState(launchReadinessResult)}
            />
          </div>
        }
      />
    </div>
  );
}
