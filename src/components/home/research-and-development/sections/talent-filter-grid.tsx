// TRANSPORT: props-only — presentational server component. Fetches nothing; profiles,
// the skill vocabulary and the current selections all arrive as props from talent-page,
// which read GET /discovery/talent and GET /discovery/skills.
//
// NO LONGER A CLIENT ISLAND. Filtering moved into the query string, so the chips are
// Links and the backend does the filtering in SQL.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import TalentProfileCard from "@/components/home/research-and-development/cards/talent-profile-card";
import {
  buildFilterHref,
  toggleMultiParamPatch,
  type RawSearchParams,
} from "@/lib/rnd/filter-href";
import { ROLE_COMMITMENT_LABELS, TALENT_AVAILABILITY_LABELS } from "@/lib/rnd/labels";
import {
  TALENT_AVAILABILITIES,
  type DiscoverySkill,
  type TalentProfile,
} from "@/lib/rnd/discovery.schemas";
import { ROLE_COMMITMENTS } from "@/lib/rnd/shared.schemas";

// Chips are capped because `/discovery/skills` is the full vocabulary and a row of a
// hundred is not a filter, it is a wall. The cap is on DISPLAY only — the backend still
// accepts any slug, so a hand-built URL reaches the rest.
const MAX_SKILL_CHIPS = 12;

/**
 * Commitment + skill + availability chips over the talent directory.
 *
 * SKILLS FILTER BY SLUG EQUALITY, which is the structural fix for a live bug: this grid
 * used to run `profile.skills.some((skill) => skill.includes(chipText))`, so a "Water"
 * chip matched "Water Polo". The chips are built from `GET /discovery/skills` — the
 * canonical vocabulary — and the backend matches slugs exactly.
 *
 * Repeated `?skill=` values are ANDed by the backend, so two chips narrow rather than
 * widen. That is what a row of selected chips means.
 *
 * THE PAY-KIND CHIPS ARE GONE. They filtered `compensationAsk` client-side, and
 * `/discovery/talent` accepts no such param — its query schema is `.strict()` over
 * commitment / skill / availability / region / sort / page / limit, so sending one would
 * be a 422 rather than an ignored key. Restoring the filter needs a backend column, not
 * a frontend chip.
 */
export default function TalentFilterGrid({
  profiles,
  skillOptions,
  searchParams,
}: {
  profiles: TalentProfile[];
  skillOptions: DiscoverySkill[];
  searchParams: RawSearchParams;
}) {
  const selectedCommitment = searchParams.commitment;
  const selectedAvailability = searchParams.availability;
  const selectedSkillSlugs = new Set(
    Array.isArray(searchParams.skill)
      ? searchParams.skill
      : typeof searchParams.skill === "string"
        ? [searchParams.skill]
        : [],
  );

  const commitmentChips: FilterChipOption[] = [
    {
      label: "Any commitment",
      href: buildFilterHref(searchParams, { commitment: undefined }),
      isSelected: selectedCommitment === undefined,
    },
    ...ROLE_COMMITMENTS.map((commitment) => ({
      label: ROLE_COMMITMENT_LABELS[commitment],
      href: buildFilterHref(searchParams, { commitment }),
      isSelected: selectedCommitment === commitment,
    })),
  ];

  const availabilityChips: FilterChipOption[] = [
    {
      label: "Any availability",
      href: buildFilterHref(searchParams, { availability: undefined }),
      isSelected: selectedAvailability === undefined,
    },
    ...TALENT_AVAILABILITIES.map((availability) => ({
      label: TALENT_AVAILABILITY_LABELS[availability],
      href: buildFilterHref(searchParams, { availability }),
      isSelected: selectedAvailability === availability,
    })),
  ];

  const skillChips: FilterChipOption[] = [
    {
      label: "All skills",
      href: buildFilterHref(searchParams, { skill: undefined }),
      isSelected: selectedSkillSlugs.size === 0,
    },
    ...skillOptions.slice(0, MAX_SKILL_CHIPS).map((skill) => ({
      label: skill.displayLabel,
      href: buildFilterHref(searchParams, toggleMultiParamPatch(searchParams, "skill", skill.slug)),
      isSelected: selectedSkillSlugs.has(skill.slug),
    })),
  ];

  return (
    <section className="space-y-4 px-4 lg:px-6">
      <div className="space-y-2">
        <FilterChipRow options={commitmentChips} ariaLabel="Filter by commitment" />
        <FilterChipRow options={availabilityChips} ariaLabel="Filter by availability" />
        {skillOptions.length > 0 && (
          <FilterChipRow options={skillChips} ariaLabel="Filter by skill" />
        )}
      </div>
      {profiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <TalentProfileCard key={profile.userId} profile={profile} />
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
