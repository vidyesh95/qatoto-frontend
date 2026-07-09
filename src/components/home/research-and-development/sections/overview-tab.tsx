import Image from "next/image";
import Link from "next/link";

import MarketInsightCard from "@/components/home/research-and-development/cards/market-insight-card";
import MilestoneTimeline from "@/components/home/research-and-development/sections/milestone-timeline";
import type {
  MarketInsight,
  ProblemReport,
  ResearchProject,
} from "@/types/research-and-development";

type OverviewTabProps = {
  project: ResearchProject;
  relatedInsights: MarketInsight[];
  originReport?: ProblemReport;
};

// Overview tab: problem & solution prose, market-demand evidence insights, the
// Civic Pulse origin-report link when the project was born from one, and the
// milestone timeline.
export default function OverviewTab({ project, relatedInsights, originReport }: OverviewTabProps) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">The problem &amp; solution</h3>
        <p className="max-w-prose text-sm leading-6">{project.description}</p>
      </section>
      {relatedInsights.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Market-demand evidence</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {relatedInsights.map((insight) => (
              <MarketInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      )}
      <div>
        <Link
          href={`/research-and-development/project/${project.id}/workshop`}
          className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E] transition hover:bg-[#00696E]/20"
        >
          Open the Virtual Workshop — boards, files, and team chat →
        </Link>
      </div>
      {originReport && (
        <Link
          href="/research-and-development/problem-map"
          className="inline-flex items-center gap-2 rounded-full bg-[#D6E3FF] px-3 py-1.5 text-xs font-medium text-[#191C1C] transition hover:bg-[#D6E3FF]/70"
        >
          <Image
            src="/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={20}
            height={20}
            alt=""
          />
          Born from Civic Pulse report: {originReport.title}
        </Link>
      )}
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Milestone timeline</h3>
        <MilestoneTimeline milestones={project.milestones} />
      </section>
    </div>
  );
}
