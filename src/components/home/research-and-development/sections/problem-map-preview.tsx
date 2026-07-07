import Image from "next/image";
import Link from "next/link";

import type { ProblemReport } from "@/types/research-and-development";

// Landing teaser for the Civic Pulse problem map: a static world-map thumbnail
// with decorative pins on the left, the top reported gaps on the right, and a
// CTA into the full problem-map page. Pins are sized by opportunity score.
export default function ProblemMapPreview({ reports }: { reports: ProblemReport[] }) {
  return (
    <section className="grid items-center gap-6 px-4 md:grid-cols-2 lg:px-6">
      <div className="relative rounded-2xl bg-[#00696E]/5 p-4">
        <Image
          src="/dummy/world_map.svg"
          width={1200}
          height={600}
          alt=""
          className="aspect-[2/1] h-auto w-full"
        />
        {reports.map((report) => (
          <span
            key={report.id}
            aria-hidden
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00696E] ${
              report.opportunityScore >= 85
                ? "size-4"
                : report.opportunityScore >= 70
                  ? "size-3"
                  : "size-2"
            }`}
            style={{
              left: `${report.mapPosition.leftPercent}%`,
              top: `${report.mapPosition.topPercent}%`,
            }}
          />
        ))}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Top reported gaps</h2>
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{report.title}</p>
                <p className="truncate text-xs text-muted-foreground">{report.locationLabel}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {report.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {report.reportCount} reports
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  report.opportunityScore >= 80
                    ? "bg-red-100 text-red-800"
                    : report.opportunityScore >= 60
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[#00696E]/10 text-[#00696E]"
                }`}
              >
                Opportunity {report.opportunityScore}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/research-and-development/problem-map"
          className="inline-block cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Open problem map
        </Link>
      </div>
    </section>
  );
}
