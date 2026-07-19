"use client";

import { useState } from "react";

import { COMPENSATION_KIND_LABELS } from "@/components/home/research-and-development/cards/compensation-badges";
import TalentProfileCard from "@/components/home/research-and-development/cards/talent-profile-card";
import type {
  CompensationKind,
  RoleCommitment,
  TalentProfile,
} from "@/types/research-and-development";

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

// "all" is the no-filter sentinel; the rest are the CompensationKind values a
// profile can ask for. Labels reuse COMPENSATION_KIND_LABELS, "all" → "Any pay".
const COMPENSATION_FILTER_ORDER: (CompensationKind | "all")[] = [
  "all",
  "salary",
  "one-time",
  "equity",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

// Client island: commitment + skill + pay-kind filter selections over the static
// profile list. Filtering is a plain in-memory .filter — search over real talent
// pools is backend-owned later.
export default function TalentFilterGrid({ profiles }: { profiles: TalentProfile[] }) {
  const [selectedCommitment, setSelectedCommitment] = useState<RoleCommitment | "all">("all");
  // "all" is the no-filter sentinel; any other value is a SKILL_CATEGORY_FILTERS entry.
  const [selectedSkillCategory, setSelectedSkillCategory] = useState("all");
  const [selectedCompensationKind, setSelectedCompensationKind] = useState<
    CompensationKind | "all"
  >("all");

  const filteredProfiles = profiles.filter((profile) => {
    const matchesCommitment =
      selectedCommitment === "all" || profile.commitment === selectedCommitment;
    const matchesSkillCategory =
      selectedSkillCategory === "all" ||
      profile.skills.some((skill) => skill.includes(selectedSkillCategory));
    const matchesCompensation =
      selectedCompensationKind === "all" ||
      profile.compensationAsk.some((component) => component.kind === selectedCompensationKind);
    return matchesCommitment && matchesSkillCategory && matchesCompensation;
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
        <div className="flex gap-2 overflow-x-auto">
          {COMPENSATION_FILTER_ORDER.map((payKind) => (
            <button
              key={payKind}
              type="button"
              onClick={() => setSelectedCompensationKind(payKind)}
              className={`${FILTER_CHIP_CLASS} ${
                selectedCompensationKind === payKind
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {payKind === "all" ? "Any pay" : COMPENSATION_KIND_LABELS[payKind]}
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
