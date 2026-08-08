// TRANSPORT: server-fetch — awaits `getCofounderProfile` and branches on the result.
//
// `/store/find-cofounder/:profileSlug`. One person's account of themselves.
//
// THERE IS NO CONTACT BUTTON, and that is the honest state rather than an oversight. No write exists
// for expressing interest in somebody else's profile — `cofounders.api.ts` has one mutation and it
// creates your own listing. A "Get in touch" button that reached nothing would be the single most
// damaging thing this page could ship: somebody would press it, believe a message had gone, and wait.
// The gap is stated in a sentence instead, and recorded as a backend ask.
//
// THE DISCLAIMER IS REPEATED HERE rather than left on the directory. A profile is the page people
// link to and share, so it is often the first one a reader sees — and it is where the capital figure
// appears at full size.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import {
  COFOUNDER_COMMITMENT_LABELS,
  COFOUNDER_CONTRIBUTION_DESCRIPTIONS,
  COFOUNDER_CONTRIBUTION_LABELS,
  COFOUNDER_ENGAGEMENT_LABELS,
  COFOUNDER_IDENTITY_LABELS,
  type CofounderPriorVenture,
  type CofounderProfileDetail,
} from "@/lib/store/cofounders.schemas";
import { getCofounderProfile } from "@/lib/store/cofounders.api";
import { formatEquityExpectationLabel } from "@/lib/store/cofounder-format";
import { countryLabelFromCode, formatCentsRangeLabel } from "@/lib/store/format";

type CofounderProfileViewState =
  | { status: "error"; message: string }
  | { status: "ready"; detail: CofounderProfileDetail };

export default async function CofounderProfilePage({ profileSlug }: { profileSlug: string }) {
  const result = await getCofounderProfile(profileSlug);

  if (!result.success && result.error.code === "404") notFound();

  const viewState: CofounderProfileViewState = result.success
    ? { status: "ready", detail: result.data }
    : { status: "error", message: result.error.message };

  return <div className="pb-10">{renderCofounderProfile(viewState)}</div>;
}

function renderCofounderProfile(viewState: CofounderProfileViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready":
      return <CofounderProfileBody detail={viewState.detail} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function CofounderProfileBody({ detail }: { detail: CofounderProfileDetail }) {
  const { profile } = detail;
  const capitalRangeLabel =
    profile.capitalRange === null
      ? null
      : formatCentsRangeLabel(
          profile.capitalRange.minimumInCents,
          profile.capitalRange.maximumInCents,
          profile.capitalRange.currency,
        );

  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="px-4 pt-4 lg:px-6">
        <nav className="pb-2 text-xs leading-4 text-[#6F7979]" aria-label="Breadcrumb">
          <Link href="/store/find-cofounder" className="hover:underline">
            Find a cofounder
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-[#191C1C]">{profile.displayName}</span>
        </nav>

        <div className="flex items-start gap-3">
          {profile.avatarUrl === null ? (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-base font-medium text-[#00696E]">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
              {profile.displayName}
            </h1>
            <p className="mt-0.5 text-sm leading-5 text-[#6F7979]">
              {countryLabelFromCode(profile.countryCode)} ·{" "}
              {COFOUNDER_COMMITMENT_LABELS[profile.commitmentLevel]} ·{" "}
              {COFOUNDER_ENGAGEMENT_LABELS[profile.engagementState]}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#191C1C]">{profile.headline}</p>

        <p className="mt-2 text-xs leading-4 text-[#00696E]">
          {COFOUNDER_IDENTITY_LABELS[profile.identityState]}
        </p>

        {/* Repeated from the directory on purpose — this is the page people link to. */}
        <p className="mt-3 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          Written by {profile.displayName} and not checked by Qatoto. Nothing here is an offer of
          investment, and nothing on this page creates or transfers a stake in anything.
        </p>
      </header>

      <section className="px-4 pt-6 lg:px-6" aria-label="What they bring">
        <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">What they bring</h2>
        <ul className="space-y-2">
          {profile.contributionKinds.map((contributionKind) => (
            <li
              key={contributionKind}
              className="rounded-xl border border-[#CAC4D0]/60 px-4 py-2.5"
            >
              <p className="text-sm leading-5 font-medium text-[#191C1C]">
                {COFOUNDER_CONTRIBUTION_LABELS[contributionKind]}
              </p>
              <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">
                {COFOUNDER_CONTRIBUTION_DESCRIPTIONS[contributionKind]}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs leading-4 text-[#6F7979]">Capital they say they can put in</dt>
            <dd
              className={
                capitalRangeLabel === null
                  ? "text-sm leading-5 text-[#6F7979] italic"
                  : "text-sm leading-5 text-[#191C1C]"
              }
            >
              {/* NOT ZERO WHEN ABSENT. "Did not say" is the fact; a figure would be an invention,
                  and on this field an invented figure is an invented offer. */}
              {capitalRangeLabel ?? "Not stated"}
            </dd>
            {capitalRangeLabel !== null && (
              <p className="text-[11px] leading-4 text-[#6F7979]">
                Self-reported. Nobody has verified that this money exists or is available.
              </p>
            )}
          </div>
          <div>
            <dt className="text-xs leading-4 text-[#6F7979]">Stake they are hoping for</dt>
            <dd
              className={
                profile.equityExpectationBasisPoints === null
                  ? "text-sm leading-5 text-[#6F7979] italic"
                  : "text-sm leading-5 text-[#191C1C]"
              }
            >
              {profile.equityExpectationBasisPoints === null
                ? "Not stated"
                : formatEquityExpectationLabel(profile.equityExpectationBasisPoints)}
            </dd>
            {profile.equityExpectationBasisPoints !== null && (
              <p className="text-[11px] leading-4 text-[#6F7979]">
                An opening expectation to negotiate from. It is not a holding and it is not agreed.
              </p>
            )}
          </div>
        </dl>
      </section>

      <section className="px-4 pt-6 lg:px-6" aria-label="About">
        <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">In their words</h2>
        <p className="text-sm leading-6 whitespace-pre-line text-[#191C1C]">{detail.bio}</p>
      </section>

      <section className="px-4 pt-6 lg:px-6" aria-label="What they are looking for">
        <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">
          What they are looking for
        </h2>
        <p className="text-sm leading-6 whitespace-pre-line text-[#191C1C]">{detail.lookingFor}</p>
      </section>

      <section className="px-4 pt-6 lg:px-6" aria-label="Track record">
        <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">Before this</h2>
        {detail.priorVentures.length === 0 ? (
          // An empty list is the honest state for a first-timer, and saying so beats hiding the
          // section — a missing heading reads as "not shown" rather than "none".
          <p className="text-sm leading-5 text-[#6F7979]">
            No previous ventures listed. First-time founders are not a worse bet, only a different
            one.
          </p>
        ) : (
          <ul className="space-y-2">
            {detail.priorVentures.map((priorVenture) => (
              <li key={priorVenture.id}>
                <PriorVentureRow priorVenture={priorVenture} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(profile.sectors.length > 0 || detail.languages.length > 0) && (
        <section className="px-4 pt-6 lg:px-6" aria-label="Sectors and languages">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profile.sectors.length > 0 && (
              <div>
                <dt className="text-xs leading-4 text-[#6F7979]">Sectors</dt>
                <dd className="text-sm leading-5 text-[#191C1C]">{profile.sectors.join(", ")}</dd>
              </div>
            )}
            {detail.languages.length > 0 && (
              <div>
                <dt className="text-xs leading-4 text-[#6F7979]">Languages</dt>
                <dd className="text-sm leading-5 text-[#191C1C]">{detail.languages.join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="px-4 pt-6 lg:px-6" aria-label="Getting in touch">
        {/* NOT A DISABLED BUTTON. There is no write behind it, and a control that reaches nothing is
            worse here than anywhere else on the platform — somebody would press it and wait. */}
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          Introductions are not available through Qatoto yet. This page is a directory entry, not an
          inbox.
        </p>
      </section>
    </article>
  );
}

function PriorVentureRow({ priorVenture }: { priorVenture: CofounderPriorVenture }) {
  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <p className="text-sm leading-5 font-medium text-[#191C1C]">{priorVenture.name}</p>
      <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">
        {priorVenture.roleLabel} · {priorVenture.yearsActiveLabel}
      </p>
      {/* A venture with no outcome is normal — it is usually still running. Demanding a summary is
          how a directory fills up with invented exits. */}
      {priorVenture.outcomeSummary !== null && (
        <p className="mt-1 text-xs leading-4 text-[#191C1C]">{priorVenture.outcomeSummary}</p>
      )}
    </div>
  );
}
