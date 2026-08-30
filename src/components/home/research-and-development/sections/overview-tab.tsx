// TRANSPORT: props-only — presentational server component. Fetches nothing; the
// project and its milestone view state arrive as props from a parent that read
// GET /research-projects/:slug and GET …/milestones.
import Link from "next/link";

import MilestoneTimeline from "@/components/home/research-and-development/sections/milestone-timeline";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import type { Milestone } from "@/lib/rnd/funding.schemas";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";
import type { MemberScopedListViewState } from "@/lib/view-state";

type OverviewTabProps = {
  project: ResearchProjectDetail;
  /** `…/milestones` is member-scoped, so this tab renders four distinct outcomes. */
  milestonesState: MemberScopedListViewState<Milestone>;
};

/**
 * Overview tab: the problem and solution prose, the founder's own demand evidence, and
 * the milestone timeline.
 *
 * THE CIVIC PULSE ORIGIN CHIP AND THE DEMAND-EVIDENCE CHIPS ARE BACK, off backend §11k's
 * `originCluster` and `relatedInsights`. Three rules govern how they render:
 *
 * - The origin chip links by CLUSTER ID. Clusters have no slug anywhere in the backend.
 * - `relatedInsights` chips LINK BY INSIGHT ID, the same shape as the origin chip. This
 *   file used to state that `GET /discovery/market-insights/:insightId` did not exist and
 *   that the chips therefore could not navigate. IT DOES EXIST — `discovery.routes.ts`
 *   declares it public, above the list's `:insightId` catch — and the read had simply
 *   never been wrapped on the client. A comment asserting a route's absence is a claim to
 *   check against the router, not a fact to inherit.
 * - Both render below `demandEvidenceNotes` and look different from it. That block is the
 *   founder's own assertion; these are moderated, platform-published evidence. Collapsing
 *   the two would let an assertion borrow the credibility of a moderated insight.
 *
 * An empty `relatedInsights` and a null `originCluster` are both ordinary — most projects
 * were not born from a cluster and cite nothing. Neither renders a placeholder.
 */
export default function OverviewTab({ project, milestonesState }: OverviewTabProps) {
  function renderMilestones() {
    switch (milestonesState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the milestone timeline." />;
      case "restricted":
        return milestonesState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's milestones." />
        ) : (
          <RndMembersOnlyPanel message="Milestones are visible to this project's team." />
        );
      case "empty":
        return <RndStatusPanel message="No milestones planned yet." />;
      case "ready":
        return <MilestoneTimeline milestones={milestonesState.rows} />;
      default: {
        const exhaustiveCheck: never = milestonesState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">The problem &amp; solution</h3>
        {project.problemStatement && (
          <p className="max-w-prose text-sm leading-6">{project.problemStatement}</p>
        )}
        {project.solutionSummary && (
          <p className="max-w-prose text-sm leading-6">{project.solutionSummary}</p>
        )}
        {project.description && !project.problemStatement && !project.solutionSummary && (
          <p className="max-w-prose text-sm leading-6">{project.description}</p>
        )}
      </section>
      {/* The founder's OWN assertion, kept visually distinct from anything the platform
          computed. An assertion must never read as verified evidence. */}
      {project.demandEvidenceNotes && (
        <section className="space-y-2 rounded-2xl border border-dashed border-[#CAC4D0] p-4">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">
            Demand evidence, as stated by the founder
          </h3>
          <p className="max-w-prose text-sm leading-6 text-muted-foreground">
            {project.demandEvidenceNotes}
          </p>
        </section>
      )}
      {/* Platform-moderated evidence, deliberately styled apart from the founder's own
          notes above. Absent for most projects, and absence renders as nothing. */}
      {(project.originCluster !== null || project.relatedInsights.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">
            Evidence Qatoto moderated
          </h3>
          {project.originCluster && (
            <Link
              href={`/research-and-development/problem-map/cluster/${project.originCluster.clusterId}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E] transition hover:bg-[#00696E]/20"
            >
              Grew out of Civic Pulse: {project.originCluster.title} →
            </Link>
          )}
          {project.relatedInsights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Published market insights this project cites
              </p>
              <ul className="flex flex-wrap gap-2">
                {project.relatedInsights.map((insight) => (
                  <li key={insight.insightId}>
                    <Link
                      href={`/research-and-development/knowledge-hub/insight/${insight.insightId}`}
                      className="inline-flex rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs transition hover:bg-muted"
                    >
                      {insight.headline} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/research-and-development/project/${project.slug}/workshop`}
          className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E] transition hover:bg-[#00696E]/20"
        >
          Open the Virtual Workshop — boards, files, and team chat →
        </Link>
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Milestone timeline</h3>
        {renderMilestones()}
      </section>
    </div>
  );
}
