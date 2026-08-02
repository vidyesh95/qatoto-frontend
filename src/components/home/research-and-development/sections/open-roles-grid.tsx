// TRANSPORT: props-only — presentational server component. Fetches nothing; roles, the
// skill vocabulary and the current selections arrive as props from team-building-page,
// which read GET /open-roles and GET /discovery/skills.
//
// NO LONGER A CLIENT ISLAND. Filtering moved into the query string, so the chips are
// Links and the backend filters in SQL.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import type { DiscoverySkill } from "@/lib/rnd/discovery.schemas";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import { ROLE_COMMITMENTS } from "@/lib/rnd/shared.schemas";
import type { PaginationMeta } from "@/lib/http";

const MAX_SKILL_CHIPS = 12;

/**
 * Every open role across every project, filtered by commitment and by skill.
 *
 * ONE SKILL AT A TIME, deliberately. `/open-roles` takes `?skill=` as a single value —
 * unlike `/discovery/talent`, whose `?skill=` repeats and ANDs — so selecting a second
 * skill replaces the first rather than narrowing. Repeating the key here would be a 422
 * from the `.strict()` schema. Widening it is a backend change, not a chip change.
 *
 * The chips come from `GET /discovery/skills` and match BY SLUG EQUALITY. They used to
 * be built from the fetched roles themselves, which cannot work against a paginated
 * feed: the chip row would only ever offer the skills on the current page.
 *
 * The count reads "N roles" rather than "N of M": the total is the SERVER's total across
 * every page, so comparing it to the rows in hand would print a fraction of a filter.
 */
export default function OpenRolesGrid({
  roles,
  skillOptions,
  pagination,
  searchParams,
}: {
  roles: OpenRole[];
  skillOptions: DiscoverySkill[];
  pagination: PaginationMeta | null;
  searchParams: RawSearchParams;
}) {
  const selectedCommitment = searchParams.commitment;
  const selectedSkill = typeof searchParams.skill === "string" ? searchParams.skill : undefined;

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

  const skillChips: FilterChipOption[] = [
    {
      label: "All skills",
      href: buildFilterHref(searchParams, { skill: undefined }),
      isSelected: selectedSkill === undefined,
    },
    ...skillOptions.slice(0, MAX_SKILL_CHIPS).map((skill) => ({
      label: skill.displayLabel,
      // Clicking the selected chip clears it — with a single-valued param there is no
      // other way to get back to "all skills" from the keyboard.
      href: buildFilterHref(searchParams, {
        skill: selectedSkill === skill.slug ? undefined : skill.slug,
      }),
      isSelected: selectedSkill === skill.slug,
    })),
  ];

  return (
    <section id="open-roles-grid" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Open roles across every project
        </h2>
        {pagination !== null && (
          <p className="text-xs text-muted-foreground">
            {pagination.total} role{pagination.total === 1 ? "" : "s"}
            {pagination.totalPages > 1 && ` · showing page ${pagination.page}`}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <FilterChipRow options={commitmentChips} ariaLabel="Filter by commitment" />
        {skillOptions.length > 0 && (
          <FilterChipRow options={skillChips} ariaLabel="Filter by skill" />
        )}
      </div>
      {/* The card is a fixed-width tile (w-72) shared with the landing rail, so the grid
          is a wrapping flex row rather than a column grid that would leave each card
          stranded at the left of a wide cell. */}
      {roles.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {roles.map((role) => (
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
