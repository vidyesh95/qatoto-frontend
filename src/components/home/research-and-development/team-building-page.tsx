// TRANSPORT: server-fetch — server component. Reads GET /open-roles,
// GET /research-projects?stage=team_building, GET /discovery/skills and
// GET /discovery/talent (requireAuth) via @/lib/rnd/*.api, with the session cookie
// forwarded by callerRequestOptions(). No React Query here.
import EquityForSkillsExplainer from "@/components/home/research-and-development/sections/equity-for-skills-explainer";
import OpenRolesGrid from "@/components/home/research-and-development/sections/open-roles-grid";
import RndStatusPanel, {
  RndErrorPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import TalentSpotlightStrip from "@/components/home/research-and-development/sections/talent-spotlight-strip";
import TeamBuildingHero from "@/components/home/research-and-development/sections/team-building-hero";
import TeamsFormingRail from "@/components/home/research-and-development/sections/teams-forming-rail";
import { listOpenRoles } from "@/lib/rnd/catalog.api";
import type { ListOpenRolesFilter } from "@/lib/rnd/catalog.schemas";
import { listDiscoverySkills, listTalentProfiles } from "@/lib/rnd/discovery.api";
import { readEnumParam, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { listResearchProjects } from "@/lib/rnd/projects.api";
import { ROLE_COMMITMENTS } from "@/lib/rnd/shared.schemas";
import { rowsOrEmpty, toListViewState } from "@/lib/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const OPEN_ROLES_PAGE_LIMIT = 36;
const TEAMS_FORMING_LIMIT = 12;
const SPOTLIGHT_PROFILES_LIMIT = 4;

/**
 * Stage 03 — Team Building (§4c.1). Cross-project and role-first: `/talent` browses
 * people, this browses roles, and a project's own Team tab answers where one project
 * stands. None of the three replaces the others, so nothing here is lifted out of
 * `team-tab.tsx`.
 *
 * FOUR CONCURRENT READS. The teams-forming rail asks the server for
 * `?stage=team_building` rather than fetching every project and filtering — the rail is
 * as narrow as the query, and filtering a fetched page would silently under-report.
 *
 * The talent spotlight needs a session (`/discovery/talent` is `requireAuth`), so signed
 * out it shows a sign-in prompt instead of an empty strip that reads as "nobody is
 * looking for a team".
 */
export default async function TeamBuildingPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  const openRolesFilter: ListOpenRolesFilter = {
    limit: OPEN_ROLES_PAGE_LIMIT,
    commitment: readEnumParam(resolvedSearchParams, "commitment", ROLE_COMMITMENTS),
    skill: readSingleParam(resolvedSearchParams, "skill"),
  };

  const [openRolesResult, teamsFormingResult, skillsResult, spotlightResult] = await Promise.all([
    listOpenRoles(openRolesFilter, requestOptions),
    listResearchProjects({ stage: "team_building", limit: TEAMS_FORMING_LIMIT }, requestOptions),
    listDiscoverySkills(requestOptions),
    listTalentProfiles({ limit: SPOTLIGHT_PROFILES_LIMIT }, requestOptions),
  ]);

  const openRolesState = toListViewState(openRolesResult);
  const teamsFormingState = toListViewState(teamsFormingResult);
  const spotlightState = toListViewState(spotlightResult);
  // Secondary read: losing it costs the chips, not the grid.
  const skillOptions = rowsOrEmpty(skillsResult);

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <TeamBuildingHero />
      <EquityForSkillsExplainer />

      {openRolesState.status === "error" ? (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load open roles." />
        </div>
      ) : (
        <OpenRolesGrid
          roles={openRolesState.status === "ready" ? openRolesState.rows : []}
          skillOptions={skillOptions}
          pagination={openRolesState.status === "ready" ? openRolesState.pagination : null}
          searchParams={resolvedSearchParams}
        />
      )}

      {/* The rail owns its own "nobody is forming a team today" copy, so an empty
          result goes through it rather than through a status panel. */}
      <TeamsFormingRail
        projects={teamsFormingState.status === "ready" ? teamsFormingState.rows : []}
      />

      {spotlightState.status === "ready" ? (
        <TalentSpotlightStrip profiles={spotlightState.rows} />
      ) : (
        <section className="space-y-1">
          <SectionHeader
            title="People looking for a team"
            href="/research-and-development/talent"
          />
          <div className="px-4 lg:px-6">
            {spotlightState.status === "error" && spotlightState.isSignInRequired ? (
              <RndSignInRequiredPanel message="Sign in to see people looking for a team." />
            ) : spotlightState.status === "error" ? (
              <RndErrorPanel message="Couldn't load talent profiles." />
            ) : (
              <RndStatusPanel message="Nobody has listed themselves yet." />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
