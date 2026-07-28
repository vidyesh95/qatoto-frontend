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
import type { MemberScopedListViewState } from "@/lib/rnd/view-state";

type OverviewTabProps = {
  project: ResearchProjectDetail;
  /** `…/milestones` is member-scoped, so this tab renders four distinct outcomes. */
  milestonesState: MemberScopedListViewState<Milestone>;
};

/**
 * Overview tab: the problem and solution prose, the founder's own demand evidence, and
 * the milestone timeline.
 *
 * THE MARKET-DEMAND CHIPS AND THE CIVIC PULSE ORIGIN LINK ARE GONE, and not merely
 * deferred. `ResearchProjectDetailView` carries no `relatedInsightIds` and no
 * `originProblemReportId` — there is no server-side link between a project and the
 * insight or cluster it grew from, so there is nothing to resolve. They return when the
 * backend adds the relation, not when a phase lands. See R_AND_D_STRUCTURE.md §18.
 *
 * THE PROOF-OF-EFFORT LINK IS ALSO GONE for now: that route still renders mock data
 * keyed by mock slugs, so a real slug reaching it is a 404. It returns with phase 4.
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
