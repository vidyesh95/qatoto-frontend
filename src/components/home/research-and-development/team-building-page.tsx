import EquityForSkillsExplainer from "@/components/home/research-and-development/sections/equity-for-skills-explainer";
import OpenRolesGrid from "@/components/home/research-and-development/sections/open-roles-grid";
import TalentSpotlightStrip from "@/components/home/research-and-development/sections/talent-spotlight-strip";
import TeamBuildingHero from "@/components/home/research-and-development/sections/team-building-hero";
import TeamsFormingRail from "@/components/home/research-and-development/sections/teams-forming-rail";
import {
  MOCK_OPEN_ROLES,
  MOCK_RESEARCH_PROJECTS,
  MOCK_TALENT_PROFILES,
} from "@/mocks/research-and-development-mocks";

// Stage 03 — Team Building (R_AND_D_STRUCTURE.md §4c.1). Cross-project and
// role-first: /talent browses people, this browses roles, and the project's own
// Team tab answers where one project stands. None of the three replaces the
// others, so nothing here is lifted out of team-tab.tsx.
//
// Server component over static mocks; only the roles grid is a client island.
export default function TeamBuildingPage() {
  const projectsFormingTeams = MOCK_RESEARCH_PROJECTS.filter(
    (project) => project.stage === "team-building",
  );
  const spotlightProfiles = MOCK_TALENT_PROFILES.slice(0, 4);

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <TeamBuildingHero />
      <EquityForSkillsExplainer />
      <OpenRolesGrid roles={MOCK_OPEN_ROLES} />
      <TeamsFormingRail projects={projectsFormingTeams} />
      <TalentSpotlightStrip profiles={spotlightProfiles} />
    </div>
  );
}
