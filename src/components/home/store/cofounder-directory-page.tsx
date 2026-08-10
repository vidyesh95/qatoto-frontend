// TRANSPORT: server-fetch — awaits `listCofounderProfiles` and branches on the result.
//
// `/store/find-cofounder`. People offering capital, expertise, reach or operating time, filtered by
// which of those they bring.
//
// EVERYTHING ON THIS PAGE IS SOMEBODY'S OWN ACCOUNT OF THEMSELVES. The three rules in
// `cofounders.schemas.ts` are what the copy here enforces:
//
//  1. A capital range is DECLARED and unverified, and the word "declared" is in the row rather than
//     in a tooltip. No copy says committed, funded, raised, escrowed or available.
//  2. A profile is not an offer and Qatoto is not a broker — there is no "invest" button, no
//     "matched" language, and the list is not presented as ranked.
//  3. An equity figure is an EXPECTATION, not a holding. It renders as "hoping for", never as a
//     stake anybody has.
//
// `not_looking` PROFILES STAY IN THE LIST. Hiding them would make somebody who is mid-conversation
// look as though they had left the platform. The row says where they are and offers nothing to click
// beyond the profile itself.

import Image from "next/image";
import Link from "next/link";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyFilteredPanel,
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import {
  buildFilterHref,
  readEnumParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import {
  COFOUNDER_COMMITMENT_LABELS,
  COFOUNDER_COMMITMENT_LEVELS,
  COFOUNDER_CONTRIBUTION_KINDS,
  COFOUNDER_CONTRIBUTION_LABELS,
  COFOUNDER_ENGAGEMENT_LABELS,
  COFOUNDER_IDENTITY_LABELS,
  type CofounderProfileCard,
} from "@/lib/store/cofounders.schemas";
import { listCofounderProfiles } from "@/lib/store/cofounders.api";
import { countryLabelFromCode, formatCentsRangeLabel } from "@/lib/store/format";
import { formatEquityExpectationLabel } from "@/lib/store/cofounder-format";

type CofounderDirectoryViewState =
  | { status: "error"; message: string }
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      profiles: CofounderProfileCard[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function CofounderDirectoryPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const contributionKind = readEnumParam(
    searchParams,
    "contributionKind",
    COFOUNDER_CONTRIBUTION_KINDS,
  );
  const commitmentLevel = readEnumParam(
    searchParams,
    "commitmentLevel",
    COFOUNDER_COMMITMENT_LEVELS,
  );
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const result = await listCofounderProfiles({
    contributionKind,
    commitmentLevel,
    cursor: requestedCursor,
  });

  const appliedFilterCount =
    (contributionKind === undefined ? 0 : 1) + (commitmentLevel === undefined ? 0 : 1);

  const viewState: CofounderDirectoryViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          profiles: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  const contributionOptions: FilterChipOption[] = [
    {
      label: "Anything they bring",
      href: buildFilterHref(searchParams, { contributionKind: undefined }),
      isSelected: contributionKind === undefined,
    },
    ...COFOUNDER_CONTRIBUTION_KINDS.map((kind) => ({
      label: COFOUNDER_CONTRIBUTION_LABELS[kind],
      href: buildFilterHref(searchParams, { contributionKind: kind }),
      isSelected: contributionKind === kind,
    })),
  ];

  const commitmentOptions: FilterChipOption[] = [
    {
      label: "Any commitment",
      href: buildFilterHref(searchParams, { commitmentLevel: undefined }),
      isSelected: commitmentLevel === undefined,
    },
    ...COFOUNDER_COMMITMENT_LEVELS.map((level) => ({
      label: COFOUNDER_COMMITMENT_LABELS[level],
      href: buildFilterHref(searchParams, { commitmentLevel: level }),
      isSelected: commitmentLevel === level,
    })),
  ];

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
          Find a cofounder
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          People offering money, a domain they have already done, reach into a market, or the time
          to run the thing. Filter by what you are short of.
        </p>
        {/* THE DISCLAIMER THAT MAKES THE REST OF THE PAGE HONEST. Said once, at the top, in plain
            words — not as small print under a figure. */}
        <p className="mt-2 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          Everything here is written by the person it describes and is not checked by Qatoto. A
          profile is not an offer of investment, Qatoto is not a broker, and nothing on this page
          creates or transfers a stake in anything.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 lg:px-6">
        <Link
          href="/store/find-cofounder/new"
          className="shrink-0 rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          List yourself
        </Link>
        {/* The only route to a profile that is not `published` — this directory returns published
            rows only, so a draft, a submitted profile and a rejected one are all invisible here. */}
        <Link
          href="/store/find-cofounder/mine"
          className="shrink-0 rounded-full bg-background px-4 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted"
        >
          Your profile
        </Link>
      </div>

      <div className="space-y-2 px-4 pt-3 lg:px-6">
        <FilterChipRow
          options={contributionOptions}
          ariaLabel="Filter people by what they contribute"
        />
        <FilterChipRow options={commitmentOptions} ariaLabel="Filter people by commitment level" />
      </div>

      {renderCofounderDirectory(viewState, searchParams)}
    </div>
  );
}

function renderCofounderDirectory(
  viewState: CofounderDirectoryViewState,
  searchParams: RawSearchParams,
) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          {viewState.appliedFilterCount > 0 ? (
            <StoreEmptyFilteredPanel
              appliedFilterCount={viewState.appliedFilterCount}
              clearFiltersHref="/store/find-cofounder"
            />
          ) : (
            <StoreEmptyPanel message="Nobody has listed themselves yet." />
          )}
        </div>
      );
    case "ready":
      return (
        <>
          <ul className="mt-4 space-y-3 px-4 lg:px-6">
            {viewState.profiles.map((profile) => (
              <li key={profile.id}>
                <CofounderRow profile={profile} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more people"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function CofounderRow({ profile }: { profile: CofounderProfileCard }) {
  const capitalRangeLabel =
    profile.capitalRange === null
      ? null
      : formatCentsRangeLabel(
          profile.capitalRange.minimumInCents,
          profile.capitalRange.maximumInCents,
          profile.capitalRange.currency,
        );

  return (
    <Link
      href={`/store/find-cofounder/${profile.slug}`}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <div className="flex items-start gap-3">
        {profile.avatarUrl === null ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-sm font-medium text-[#00696E]">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-medium text-[#191C1C]">{profile.displayName}</p>
          <p className="text-xs leading-4 text-[#6F7979]">
            {countryLabelFromCode(profile.countryCode)} ·{" "}
            {COFOUNDER_COMMITMENT_LABELS[profile.commitmentLevel]}
          </p>
        </div>

        {/* Only the two states that change what a reader should do are called out. "Open to
            introductions" is the default and needs no badge. */}
        {profile.engagementState !== "open_to_intros" && (
          <span className="shrink-0 rounded bg-[#F2F4F4] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#6F7979]">
            {COFOUNDER_ENGAGEMENT_LABELS[profile.engagementState]}
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#191C1C]">{profile.headline}</p>

      {profile.contributionKinds.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {profile.contributionKinds.map((contributionKind) => (
            <li
              key={contributionKind}
              className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]"
            >
              {COFOUNDER_CONTRIBUTION_LABELS[contributionKind]}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4">
        {/* Says what was checked, and what was not. Never a bare "Verified" beside a money figure. */}
        <span className="text-[#00696E]">{COFOUNDER_IDENTITY_LABELS[profile.identityState]}</span>

        {/* "DECLARED" IS IN THE ROW. Absent when they did not say — never rendered as zero, which
            would be a figure this person never gave. */}
        {capitalRangeLabel !== null && (
          <span className="text-[#191C1C]">Declares {capitalRangeLabel} of capital</span>
        )}

        {/* "Hoping for" and never "holds". An expectation is an ask, not an allocation. */}
        {profile.equityExpectationBasisPoints !== null && (
          <span className="text-[#6F7979]">
            hoping for {formatEquityExpectationLabel(profile.equityExpectationBasisPoints)}
          </span>
        )}
      </div>

      {profile.sectors.length > 0 && (
        <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">{profile.sectors.join(" · ")}</p>
      )}
    </Link>
  );
}
