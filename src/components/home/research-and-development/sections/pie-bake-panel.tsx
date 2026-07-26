"use client";

import { useState } from "react";

import { formatEquityFromBasisPoints } from "@/components/home/research-and-development/sections/compensation-format";
import type {
  PieBakeChecklistItemStatus,
  PieBakeReadiness,
  PieStatus,
  TeamMember,
} from "@/types/research-and-development";

const CHECKLIST_STATUS_GLYPHS: Record<
  PieBakeChecklistItemStatus,
  { glyph: string; className: string; label: string }
> = {
  met: { glyph: "✓", className: "bg-[#00696E] text-white", label: "Met" },
  not_met: {
    glyph: "!",
    className: "bg-amber-100 text-amber-800 ring-2 ring-amber-500",
    label: "Not met",
  },
  waived: { glyph: "–", className: "bg-muted text-muted-foreground", label: "Waived by the team" },
};

// Pie bake (§14.6): the irreversible moment the dynamic pie stops recalculating
// and the percentages freeze forever. Every blocking condition is listed before
// the action, and the cap table it would freeze is shown in full — an
// irreversible action with a hidden preview is not a decision, it's a trap.
// Baking does nothing in the mock phase beyond revealing the frozen view.
export default function PieBakePanel({
  readiness,
  pieStatus,
  teamMembers,
}: {
  readiness: PieBakeReadiness;
  pieStatus: PieStatus;
  teamMembers: TeamMember[];
}) {
  const [hasPreviewedBake, setHasPreviewedBake] = useState(false);

  const blockingItems = readiness.checklistItems.filter((item) => item.status === "not_met");
  const isAlreadyBaked = pieStatus === "baked";
  const canBake = blockingItems.length === 0 && !isAlreadyBaked;
  const allocatedSlices = readiness.frozenCapTableRows.reduce(
    (runningTotal, capTableRow) => runningTotal + capTableRow.totalSlices,
    0,
  );

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Baking the pie</h3>
      <p className="text-xs text-muted-foreground">
        Baking freezes every percentage permanently at{" "}
        <span className="font-medium text-foreground">{readiness.triggerEventLabel}</span>. After a
        bake, verified effort still earns cash but no longer mints slices. It cannot be undone.
      </p>

      <ul className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
        {readiness.checklistItems.map((checklistItem) => {
          const statusGlyph = CHECKLIST_STATUS_GLYPHS[checklistItem.status];
          return (
            <li key={checklistItem.key} className="flex items-start gap-3">
              <span
                aria-label={statusGlyph.label}
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs ${statusGlyph.className}`}
              >
                {statusGlyph.glyph}
              </span>
              <span className="min-w-0">
                <span className="block text-sm">{checklistItem.displayLabel}</span>
                <span className="block text-xs text-muted-foreground">
                  {checklistItem.detailNote}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canBake}
          onClick={() => setHasPreviewedBake(true)}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isAlreadyBaked ? "Already baked" : "Bake the pie"}
        </button>
        <button
          type="button"
          onClick={() => setHasPreviewedBake((isShown) => !isShown)}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
        >
          {hasPreviewedBake ? "Hide frozen cap table" : "Preview frozen cap table"}
        </button>
        {blockingItems.length > 0 && (
          <span className="text-xs text-amber-800">
            {blockingItems.length} condition{blockingItems.length === 1 ? "" : "s"} still blocking.
          </span>
        )}
      </div>

      {hasPreviewedBake && (
        <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
          <table className="w-full min-w-md text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Slices</th>
                <th className="px-4 py-2 font-medium">Frozen equity</th>
              </tr>
            </thead>
            <tbody>
              {readiness.frozenCapTableRows.map((capTableRow) => {
                const member = teamMembers.find(
                  (teamMember) => teamMember.id === capTableRow.memberId,
                );
                return (
                  <tr key={capTableRow.memberId} className="border-b border-border/50">
                    <td className="px-4 py-2">{member?.name ?? capTableRow.memberId}</td>
                    <td className="px-4 py-2">{capTableRow.totalSlices.toLocaleString()}</td>
                    <td className="px-4 py-2 font-medium">
                      {formatEquityFromBasisPoints(capTableRow.equityBasisPoints)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-border/50 text-muted-foreground">
                <td className="px-4 py-2">Open-role reserve</td>
                <td className="px-4 py-2">{readiness.reservedSlices.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {formatEquityFromBasisPoints(
                    Math.round((readiness.reservedSlices / readiness.totalSlicesInPool) * 10000),
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Pool</td>
                <td className="px-4 py-2 font-medium">
                  {allocatedSlices.toLocaleString()} of{" "}
                  {readiness.totalSlicesInPool.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-muted-foreground">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bake readiness is a display-only mock — the freeze, the snapshot and the cap-table write are
        backend-owned later.
      </p>
    </section>
  );
}
