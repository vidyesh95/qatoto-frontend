// TRANSPORT: server-fetch — server component. Reads GET /discovery/talent (requireAuth),
// GET /discovery/skills and GET /open-roles via @/lib/rnd/*.api, with the session cookie
// forwarded by callerRequestOptions(). No React Query here.
import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import RndStatusPanel, {
  RndErrorPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import TalentFilterGrid from "@/components/home/research-and-development/sections/talent-filter-grid";
import EditTalentProfileSheet from "@/components/home/research-and-development/sheets/edit-talent-profile-sheet";
import { listOpenRoles } from "@/lib/rnd/catalog.api";
import {
  listDiscoverySkills,
  listTalentProfiles,
  type ListTalentFilter,
} from "@/lib/rnd/discovery.api";
import {
  TALENT_AVAILABILITIES,
  type DiscoverySkill,
  type TalentProfile,
} from "@/lib/rnd/discovery.schemas";
import { readEnumParam, readMultiParam, type RawSearchParams } from "@/lib/filter-href";
import { ROLE_COMMITMENTS } from "@/lib/rnd/shared.schemas";
import { rowsOrEmpty, toListViewState, type ListViewState } from "@/lib/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const TALENT_PAGE_LIMIT = 24;
const OPEN_ROLES_LIMIT = 12;

/**
 * Talent marketplace (§11): a filterable grid of people trading skills for pay and
 * equity, plus the open-roles rail as the reverse path — apply to a posted role instead
 * of being invited. The header carries the profile editor (§14.6).
 *
 * `GET /discovery/talent` IS `requireAuth` — the only §6 read that returns other
 * people's personal data — so a signed-out visitor gets `401` and sees a sign-in prompt
 * with an EMPTY grid. Never a mock list behind a paywall message: that would be
 * inventing people.
 *
 * Filters come from the URL and go to the backend, which filters in SQL. Reading them
 * through `readEnumParam` drops an unrecognized value rather than forwarding it, because
 * every backend query schema is `.strict()` and a hand-edited `?commitment=banana` would
 * otherwise render a 422 as a broken page.
 */
export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  const talentFilter: ListTalentFilter = {
    limit: TALENT_PAGE_LIMIT,
    commitment: readEnumParam(resolvedSearchParams, "commitment", ROLE_COMMITMENTS),
    availability: readEnumParam(resolvedSearchParams, "availability", TALENT_AVAILABILITIES),
    skill: readMultiParam(resolvedSearchParams, "skill"),
  };

  const [talentResult, skillsResult, openRolesResult] = await Promise.all([
    listTalentProfiles(talentFilter, requestOptions),
    listDiscoverySkills(requestOptions),
    listOpenRoles({ limit: OPEN_ROLES_LIMIT }, requestOptions),
  ]);

  // The skill vocabulary is a SECONDARY read: losing it costs the chips, not the page,
  // so it degrades to an empty list instead of taking the grid down with it.
  const skillOptions = rowsOrEmpty(skillsResult);
  const openRolesState = toListViewState(openRolesResult);

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

      {renderTalentGrid(toListViewState(talentResult), skillOptions, resolvedSearchParams)}

      {openRolesState.status === "ready" ? (
        <OpenRolesRail roles={openRolesState.rows} />
      ) : (
        <div className="px-4 lg:px-6">
          {openRolesState.status === "error" ? (
            <RndErrorPanel message="Couldn't load open roles." />
          ) : (
            <RndStatusPanel message="No open roles right now." />
          )}
        </div>
      )}
    </div>
  );
}

function renderTalentGrid(
  state: ListViewState<TalentProfile>,
  skillOptions: DiscoverySkill[],
  searchParams: RawSearchParams,
) {
  switch (state.status) {
    case "error":
      return (
        <div className="px-4 lg:px-6">
          {state.isSignInRequired ? (
            <RndSignInRequiredPanel message="Sign in to browse the talent directory. Profiles are opt-in, so we only show them to signed-in members." />
          ) : (
            <RndErrorPanel message="Couldn't load the talent directory." />
          )}
        </div>
      );
    // An empty result with filters applied is a different sentence from an empty
    // directory, so the grid keeps its chips and says so itself.
    case "empty":
      return (
        <TalentFilterGrid profiles={[]} skillOptions={skillOptions} searchParams={searchParams} />
      );
    case "ready":
      return (
        <TalentFilterGrid
          profiles={state.rows}
          skillOptions={skillOptions}
          searchParams={searchParams}
        />
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
