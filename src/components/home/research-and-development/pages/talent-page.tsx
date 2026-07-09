import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import TalentFilterGrid from "@/components/home/research-and-development/sections/talent-filter-grid";
import { MOCK_OPEN_ROLES, MOCK_TALENT_PROFILES } from "@/lib/research-and-development-mocks";

// Talent marketplace composition (§11): filterable grid of people trading
// skills for equity, plus the open-roles rail as the reverse path — apply to a
// posted role instead of being invited. Server component over static mocks.
export default function TalentPage() {
  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1 px-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Talent</h1>
        <p className="text-sm text-muted-foreground">
          Trade skills for equity — find the people who can build your idea.
        </p>
      </header>
      <TalentFilterGrid profiles={MOCK_TALENT_PROFILES} />
      <OpenRolesRail roles={MOCK_OPEN_ROLES} />
    </div>
  );
}
