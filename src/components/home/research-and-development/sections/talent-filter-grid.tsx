"use client";

import { useState } from "react";

import TalentProfileCard from "@/components/home/research-and-development/cards/talent-profile-card";
import type { RoleCommitment, TalentProfile } from "@/types/research-and-development";

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

// Skill-category chips are a curated slice of the mock skill vocabulary — a
// profile matches when any of its skills contains the chip text.
const SKILL_CATEGORY_FILTERS = [
  "Water & Sanitation",
  "Precision Agriculture",
  "Modular Construction",
  "E-Waste & Recycling",
  "Medical Logistics",
  "Cold Chain",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

// Client island: two filter selections over the static profile list. Filtering
// is a plain in-memory .filter — search over real talent pools is backend-owned
// later.
export default function TalentFilterGrid({ profiles }: { profiles: TalentProfile[] }) {
  const [selectedCommitment, setSelectedCommitment] = useState<RoleCommitment | "all">("all");
  // "all" is the no-filter sentinel; any other value is a SKILL_CATEGORY_FILTERS entry.
  const [selectedSkillCategory, setSelectedSkillCategory] = useState("all");

  const filteredProfiles = profiles.filter((profile) => {
    const matchesCommitment =
      selectedCommitment === "all" || profile.commitment === selectedCommitment;
    const matchesSkillCategory =
      selectedSkillCategory === "all" ||
      profile.skills.some((skill) => skill.includes(selectedSkillCategory));
    return matchesCommitment && matchesSkillCategory;
  });

  return (
    <section className="space-y-4 px-4 lg:px-6">
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          {COMMITMENT_FILTER_ORDER.map((commitmentFilter) => (
            <button
              key={commitmentFilter}
              type="button"
              onClick={() => setSelectedCommitment(commitmentFilter)}
              className={`${FILTER_CHIP_CLASS} ${
                selectedCommitment === commitmentFilter
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {COMMITMENT_FILTER_LABELS[commitmentFilter]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedSkillCategory("all")}
            className={`${FILTER_CHIP_CLASS} ${
              selectedSkillCategory === "all"
                ? "bg-[#00696E] text-white"
                : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            All skills
          </button>
          {SKILL_CATEGORY_FILTERS.map((skillCategory) => (
            <button
              key={skillCategory}
              type="button"
              onClick={() => setSelectedSkillCategory(skillCategory)}
              className={`${FILTER_CHIP_CLASS} ${
                selectedSkillCategory === skillCategory
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {skillCategory}
            </button>
          ))}
        </div>
      </div>
      {filteredProfiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <TalentProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nobody matches those filters yet — try widening them.
        </p>
      )}
    </section>
  );
}
