import Link from "next/link";

import DailyLogsFeed from "@/components/home/research-and-development/sections/daily-logs-feed";
import type { ResearchProject } from "@/types/research-and-development";

// Daily Logs tab framing around the filterable feed. The AI chips and Proof of
// Effort badges arrive precomputed on the mock data — backend-owned later.
export default function DailyLogsTab({ project }: { project: ResearchProject }) {
  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="text-xs text-muted-foreground">
        AI summaries + Proof of Effort are computed by Qatoto — display-only in this phase.
      </p>
      <div>
        <Link
          href={`/research-and-development/project/${project.id}/proof-of-effort`}
          className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E] transition hover:bg-[#00696E]/20"
        >
          How verification works — the Proof of Effort pipeline →
        </Link>
      </div>
      <div className="max-w-2xl">
        <DailyLogsFeed logs={project.dailyLogs} teamMembers={project.teamMembers} />
      </div>
    </div>
  );
}
