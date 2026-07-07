import ProblemReportCard from "@/components/home/research-and-development/cards/problem-report-card";
import type { ProblemReport } from "@/types/research-and-development";

type ProblemReportListProps = {
  reports: ProblemReport[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
};

// Stacked Civic Pulse report cards beside the map canvas — also the
// mobile-first view. No "use client" directive: it receives function props,
// so it only ever renders inside the ProblemMapCanvas client island.
export default function ProblemReportList({
  reports,
  selectedReportId,
  onSelectReport,
}: ProblemReportListProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No reports in this category yet.</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ProblemReportCard
          key={report.id}
          report={report}
          isSelected={report.id === selectedReportId}
          onSelectReport={onSelectReport}
        />
      ))}
    </div>
  );
}
