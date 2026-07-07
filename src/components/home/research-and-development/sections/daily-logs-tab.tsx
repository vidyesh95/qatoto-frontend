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
      <div className="max-w-2xl">
        <DailyLogsFeed logs={project.dailyLogs} teamMembers={project.teamMembers} />
      </div>
    </div>
  );
}
