"use client";

import Image from "next/image";
import { useState } from "react";
import ProblemReportList from "@/components/home/research-and-development/sections/problem-report-list";
import ReportProblemSheet from "@/components/home/research-and-development/sheets/report-problem-sheet";
import { MOCK_PROBLEM_REPORTS } from "@/lib/research-and-development-mocks";
import type { ProblemReport } from "@/types/research-and-development";

const buildCategoryChipClassName = (isActive: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    isActive
      ? "border-transparent bg-primary text-primary-foreground"
      : "border-[#CAC4D0]/60 text-foreground hover:bg-black/5"
  }`;

// Category-coded pin markers (§14 R_AND_D_STRUCTURE.md). "Education" icon is
// reserved for a future category — none of the current mock reports use it.
const PIN_ICON_SRC_BY_CATEGORY: Record<string, string> = {
  "Water & Sanitation": "/dummy/icons/rnd_pin_water.svg",
  "Precision Agriculture": "/dummy/icons/rnd_pin_agriculture.svg",
  Healthcare: "/dummy/icons/rnd_pin_health.svg",
  "Medical Logistics": "/dummy/icons/rnd_pin_health.svg",
  "Cold Chain": "/dummy/icons/rnd_pin_energy.svg",
  Housing: "/dummy/icons/rnd_pin_infrastructure.svg",
  "E-Waste & Recycling": "/dummy/icons/rnd_pin_infrastructure.svg",
};
const DEFAULT_PIN_ICON_SRC = "/dummy/icons/rnd_pin_infrastructure.svg";

// Civic Pulse interactive island — owns the page-local report list, the
// category filter, and the pin/card selection sync. Pins are percent-positioned
// buttons over a static world-map image (no map library, mock phase); reports
// submitted through the sheet append locally and are lost on refresh.
export default function ProblemMapCanvas() {
  const [reports, setReports] = useState<ProblemReport[]>(MOCK_PROBLEM_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(reports.map((report) => report.category)));
  const filteredReports =
    activeCategory === null
      ? reports
      : reports.filter((report) => report.category === activeCategory);

  const toggleSelectedReport = (reportId: string) => {
    setSelectedReportId((previousSelectedReportId) =>
      previousSelectedReportId === reportId ? null : reportId,
    );
  };

  const handleReportSubmitted = (newReport: ProblemReport) => {
    setReports((previousReports) => [...previousReports, newReport]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={buildCategoryChipClassName(activeCategory === null)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={buildCategoryChipClassName(activeCategory === category)}
            >
              {category}
            </button>
          ))}
        </div>
        <ReportProblemSheet onReportSubmitted={handleReportSubmitted} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="relative w-full self-start rounded-2xl bg-[#00696E]/5 p-2 sm:p-4">
          <Image
            src="/dummy/world_map.svg"
            width={1024}
            height={512}
            alt="World map of reported problems"
            className="h-auto w-full"
          />
          {filteredReports.map((report) => {
            const isSelected = report.id === selectedReportId;
            const pinSizeClassName =
              report.opportunityScore >= 80
                ? "size-5"
                : report.opportunityScore >= 60
                  ? "size-4"
                  : "size-3";
            const pinRingClassName =
              report.opportunityScore >= 80
                ? "ring-red-500"
                : report.opportunityScore >= 60
                  ? "ring-amber-500"
                  : "ring-[#00696E]";
            const pinIconSrc = PIN_ICON_SRC_BY_CATEGORY[report.category] ?? DEFAULT_PIN_ICON_SRC;

            return (
              <button
                key={report.id}
                type="button"
                onClick={() => toggleSelectedReport(report.id)}
                aria-label={`${report.title} — ${report.locationLabel}`}
                aria-pressed={isSelected}
                style={{
                  left: `${report.mapPosition.leftPercent}%`,
                  top: `${report.mapPosition.topPercent}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-full bg-white ring-2 ${pinSizeClassName} ${pinRingClassName} ${
                  isSelected ? "z-10 ring-[3px] ring-offset-2" : ""
                }`}
              >
                <Image
                  src={pinIconSrc}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
        <ProblemReportList
          reports={filteredReports}
          selectedReportId={selectedReportId}
          onSelectReport={toggleSelectedReport}
        />
      </div>
    </div>
  );
}
