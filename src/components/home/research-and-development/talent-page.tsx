import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import TalentFilterGrid from "@/components/home/research-and-development/sections/talent-filter-grid";
import EditTalentProfileSheet from "@/components/home/research-and-development/sheets/edit-talent-profile-sheet";
import { MOCK_OPEN_ROLES, MOCK_TALENT_PROFILES } from "@/mocks/research-and-development-mocks";

// Talent marketplace composition (§11): filterable grid of people trading
// skills for pay & equity, plus the open-roles rail as the reverse path — apply
// to a posted role instead of being invited. The header also carries the
// profile editor (§14.6): a marketplace you can be listed in but never update
// only ever describes people as they were the day they joined.
export default function TalentPage() {
  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">Talent</h1>
          <p className="text-sm text-muted-foreground">
            Trade skills for pay &amp; equity — find the people who can build your idea.
          </p>
        </div>
        <EditTalentProfileSheet />
      </header>
      <TalentFilterGrid profiles={MOCK_TALENT_PROFILES} />
      <OpenRolesRail roles={MOCK_OPEN_ROLES} />
    </div>
  );
}
