import type { ProblemReport } from "@/types/research-and-development";

type ProblemReportCardProps = {
  report: ProblemReport;
  isSelected?: boolean;
  onSelectReport?: (reportId: string) => void;
};

// Civic Pulse report tile: title, location, category, report count, and an
// opportunity-score badge (score bands drive the badge color). Renders as a
// selectable button when a client parent passes onSelectReport (map-canvas
// pin sync), otherwise as a plain div for server-rendered lists.
export default function ProblemReportCard({
  report,
  isSelected = false,
  onSelectReport,
}: ProblemReportCardProps) {
  const opportunityBadgeClassName =
    report.opportunityScore >= 80
      ? "bg-red-100 text-red-800"
      : report.opportunityScore >= 60
        ? "bg-amber-100 text-amber-800"
        : "bg-[#00696E]/10 text-[#00696E]";

  const containerClassName = `w-full rounded-2xl border p-4 text-left transition-colors ${
    isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
  }`;

  const reportContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{report.title}</p>
          <p className="truncate text-xs text-muted-foreground">{report.locationLabel}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${opportunityBadgeClassName}`}
        >
          Opportunity {report.opportunityScore}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{report.category}</span>
        <span className="text-xs text-muted-foreground">{report.reportCount} reports</span>
      </div>
    </>
  );

  if (onSelectReport) {
    return (
      <button
        type="button"
        onClick={() => onSelectReport(report.id)}
        className={`cursor-pointer ${containerClassName}`}
      >
        {reportContent}
      </button>
    );
  }

  return <div className={containerClassName}>{reportContent}</div>;
}
