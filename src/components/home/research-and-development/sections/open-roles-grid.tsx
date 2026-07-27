"use client";

import { useState } from "react";

import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import type { OpenRole, RoleCommitment } from "@/types/research-and-development";

const COMMITMENT_FILTER_LABELS: Record<RoleCommitment | "all", string> = {
  all: "Any commitment",
  "full-time": "Full-time",
  "part-time": "Part-time",
  hobby: "Hobby",
};

const COMMITMENT_FILTER_ORDER: (RoleCommitment | "all")[] = [
  "all",
  "full-time",
  "part-time",
  "hobby",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

function chipClassName(isSelected: boolean): string {
  return `${FILTER_CHIP_CLASS} ${
    isSelected ? "bg-[#00696E] text-white" : "bg-muted text-foreground hover:bg-muted/70"
  }`;
}

// Client island: every open role across every project, filtered by commitment
// and by a single skill.
//
// The skill chips are built from the roles themselves and matched by EQUALITY,
// not `String.includes` — the substring predicate in talent-filter-grid.tsx
// makes a "Water" chip match "Water Polo", and copying it here would spread the
// bug. Server-side filtering replaces both when the backend lands.
export default function OpenRolesGrid({ roles }: { roles: OpenRole[] }) {
  const [selectedCommitment, setSelectedCommitment] = useState<RoleCommitment | "all">("all");
  // "all" is the no-filter sentinel; any other value is an exact skill name.
  const [selectedSkill, setSelectedSkill] = useState("all");

  const availableSkills = [...new Set(roles.flatMap((role) => role.skills))].toSorted();

  const filteredRoles = roles.filter((role) => {
    const matchesCommitment =
      selectedCommitment === "all" || role.commitment === selectedCommitment;
    const matchesSkill = selectedSkill === "all" || role.skills.includes(selectedSkill);
    return matchesCommitment && matchesSkill;
  });

  return (
    <section id="open-roles-grid" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Open roles across every project
        </h2>
        <p className="text-xs text-muted-foreground">
          {filteredRoles.length} of {roles.length} roles
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          {COMMITMENT_FILTER_ORDER.map((commitmentFilter) => (
            <button
              key={commitmentFilter}
              type="button"
              onClick={() => setSelectedCommitment(commitmentFilter)}
              className={chipClassName(selectedCommitment === commitmentFilter)}
            >
              {COMMITMENT_FILTER_LABELS[commitmentFilter]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedSkill("all")}
            className={chipClassName(selectedSkill === "all")}
          >
            All skills
          </button>
          {availableSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSelectedSkill(skill)}
              className={chipClassName(selectedSkill === skill)}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
      {/* The card is a fixed-width tile (w-72) shared with the landing rail, so
          the grid is a wrapping flex row rather than a column grid that would
          leave each card stranded at the left of a wide cell. */}
      {filteredRoles.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {filteredRoles.map((role) => (
            <OpenRoleCard key={role.id} role={role} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No role matches those filters yet — try widening them.
        </p>
      )}
    </section>
  );
}
