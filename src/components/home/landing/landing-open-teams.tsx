// TRANSPORT: server-fetch — server component. Reads GET /research-projects?stage=team_building and
// GET /open-roles, both public, via @/lib/rnd/*.api. No session is forwarded and no React Query.

import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import TeamsFormingRail from "@/components/home/research-and-development/sections/teams-forming-rail";
import { listOpenRoles } from "@/lib/rnd/catalog.api";
import { listResearchProjects } from "@/lib/rnd/projects.api";
import { toListViewState } from "@/lib/view-state";

const LANDING_TEAMS_LIMIT = 8;
const LANDING_ROLES_LIMIT = 8;

/**
 * Teams forming and open roles, for the home page.
 *
 * AN EMPTY LIST RENDERS NOTHING, here but not on `/team-building`. That page is about these lists,
 * so it owes an explanation when they are empty. The home page is about Qatoto, and an empty rail
 * under the pitch would only tell a first visitor that nobody is here. A failed read is treated the
 * same way: the pitch and its two buttons still work without it.
 */
export default async function LandingOpenTeams() {
  const [teamsFormingResult, openRolesResult] = await Promise.all([
    listResearchProjects({ stage: "team_building", limit: LANDING_TEAMS_LIMIT }),
    listOpenRoles({ limit: LANDING_ROLES_LIMIT }),
  ]);

  const teamsFormingState = toListViewState(teamsFormingResult);
  const openRolesState = toListViewState(openRolesResult);

  return (
    <>
      {teamsFormingState.status === "ready" && (
        <TeamsFormingRail projects={teamsFormingState.rows} />
      )}
      {openRolesState.status === "ready" && <OpenRolesRail roles={openRolesState.rows} />}
    </>
  );
}
