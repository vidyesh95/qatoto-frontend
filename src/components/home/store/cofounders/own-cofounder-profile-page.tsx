// TRANSPORT: client-query — reads `/community/cofounder-profiles/mine` and drives its lifecycle.
"use client";

// `/store/find-cofounder/mine`. The profile you wrote about yourself, in whatever state it is in.
//
// WHY THIS PAGE EXISTS, because §18.3 names it as a defect rather than a nicety: as originally
// specified, creating a profile answered `draft`, the public reads returned `published` only, and
// there was no submit route, no `/mine` read and no withdraw. A user made a profile NOBODY COULD
// EVER SEE, INCLUDING THEMSELVES.
//
// THE FOUR ACTIONS AND WHEN EACH IS OFFERED:
//
//   draft           → edit, SUBMIT for review
//   pending_review  → nothing. A moderator has it; editing would mean re-approving.
//   published       → change engagement state, WITHDRAW. Nothing else.
//   withdrawn       → edit, SUBMIT again
//
// `engagement-state` IS ITS OWN ROUTE AND ITS OWN CONTROL because it is the one edit a published
// profile may make without re-entering moderation: availability is a fact about the person, not
// content somebody approved.
//
// THREE SENTENCES THIS PAGE MUST BE UNABLE TO WRITE:
//
//  · "YOU ARE NOW LISTED" ON SUBMIT. Submitting is not publishing; a moderator decides, and until
//    they do the profile appears in no public read.
//  · "REMOVE MY PROFILE" ON WITHDRAW. Withdraw is reversible and there is no delete on this
//    surface. The row still exists and its owner can submit it again.
//  · "YOU ARE HIDDEN" ON `not_looking`. That state stays visible in the directory, saying so, with
//    no contact affordance — removing it would make somebody mid-conversation look as though they
//    had left the platform (§18.2).
//
// AND THE FIELD THAT IS NOT HERE: there is no capital or equity input anywhere on this page. No
// column exists to hold one (§14), and the backend's write schemas answer 422 rather than
// discarding a figure — so adding one would not merely fail to save, it would break the write.

import Link from "next/link";
import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  StoreEmptyPanel,
  StoreErrorPanel,
  StoreSignInRequiredPanel,
} from "@/components/home/store/shared/store-status-panel";
import RecordDetailSkeleton from "@/components/home/store/skeletons/record-detail-skeleton";
import {
  useOwnCofounderProfileQuery,
  useSubmitOwnCofounderProfile,
  useUpdateOwnCofounderProfile,
  useUpdateOwnCofounderEngagementState,
  useWithdrawOwnCofounderProfile,
} from "@/hooks/store/cofounders";
import {
  COFOUNDER_COMMITMENT_LABELS,
  COFOUNDER_CONTRIBUTION_LABELS,
  COFOUNDER_ENGAGEMENT_LABELS,
  COFOUNDER_ENGAGEMENT_STATES,
  COFOUNDER_IDENTITY_LABELS,
  COFOUNDER_PROFILE_STATE_LABELS,
  type CofounderEngagementState,
  type OwnCofounderProfile,
} from "@/lib/store/cofounders.schemas";
import { countryLabelFromCode, formatIsoInstantLabel } from "@/lib/store/format";

type OwnProfileViewState =
  | { status: "loading" }
  | { status: "signInRequired"; message: string }
  | { status: "noProfileYet" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: OwnCofounderProfile };

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const QUIET_BUTTON_CLASS =
  "rounded-full bg-background px-4 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted disabled:opacity-50";

export default function OwnCofounderProfilePage() {
  const ownProfileQuery = useOwnCofounderProfileQuery();

  const viewState: OwnProfileViewState = (() => {
    if (ownProfileQuery.isPending) return { status: "loading" };
    if (ownProfileQuery.isError) {
      return { status: "error", message: "Your profile could not be loaded." };
    }
    const result = ownProfileQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) {
      if (result.error.code === "401") {
        return { status: "signInRequired", message: result.error.message };
      }
      // A 404 HERE IS "YOU HAVE NOT WRITTEN ONE", NOT AN ERROR. This is the one place on the store
      // surface where a 404 is a normal state rather than a dead link, because the resource is
      // the viewer's own and its absence is the default.
      if (result.error.code === "404") return { status: "noProfileYet" };
      return { status: "error", message: result.error.message };
    }
    return { status: "ready", profile: result.data };
  })();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <nav className="pb-2 text-xs leading-4 text-[#6F7979]" aria-label="Breadcrumb">
          <Link href="/store/find-cofounder" className="hover:underline">
            Find a cofounder
          </Link>
        </nav>
        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          Your cofounder profile
        </h1>
      </header>

      <div className="px-4 pt-6 lg:px-6">{renderOwnProfile(viewState)}</div>
    </div>
  );
}

function renderOwnProfile(viewState: OwnProfileViewState) {
  switch (viewState.status) {
    case "loading":
      return <RecordDetailSkeleton />;
    case "signInRequired":
      return <StoreSignInRequiredPanel message={viewState.message} />;
    case "noProfileYet":
      return (
        <div>
          <StoreEmptyPanel message="You have not written a profile yet." />
          <p className="mt-3 text-center">
            <Link href="/store/find-cofounder/new" className={PRIMARY_BUTTON_CLASS}>
              Write one
            </Link>
          </p>
        </div>
      );
    case "error":
      return <StoreErrorPanel message={viewState.message} />;
    case "ready":
      return <OwnProfileBody profile={viewState.profile} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function OwnProfileBody({ profile }: { profile: OwnCofounderProfile }) {
  const isEditable = profile.state === "draft" || profile.state === "withdrawn";
  const wasRejected = profile.state === "draft" && profile.decisionReason !== null;

  return (
    <article>
      <p className="text-xs leading-4 text-[#6F7979]">
        {COFOUNDER_PROFILE_STATE_LABELS[profile.state]}
        {" · "}
        {COFOUNDER_IDENTITY_LABELS[profile.profile.identityState]}
        {profile.publishedAt === null
          ? ""
          : ` · first published ${formatIsoInstantLabel(profile.publishedAt)}`}
      </p>

      <h2 className="mt-1 text-base leading-6 font-medium text-[#191C1C]">
        {profile.profile.headline}
      </h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        {profile.profile.displayName} · {countryLabelFromCode(profile.profile.countryCode)} ·{" "}
        {COFOUNDER_COMMITMENT_LABELS[profile.profile.commitmentLevel]}
      </p>

      {wasRejected && profile.decisionReason !== null && (
        <div className="mt-3 rounded-lg bg-[#E0E3E3] px-3 py-2">
          <p className="text-xs leading-4 font-medium text-[#191C1C]">
            A moderator sent this back. Here is why:
          </p>
          <p className="mt-1 text-xs leading-4 text-[#4A6364]">{profile.decisionReason}</p>
        </div>
      )}

      {profile.state === "pending_review" && (
        <p className="mt-3 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          A moderator has this. You cannot edit it while they do — everything here is content they
          are about to approve.
        </p>
      )}

      <section className="mt-4" aria-label="About you">
        <p className="text-sm leading-6 whitespace-pre-line text-[#191C1C]">{profile.bio}</p>
      </section>

      <section className="mt-4" aria-label="What you are looking for">
        <h3 className="text-sm font-medium text-[#191C1C]">What you are looking for</h3>
        <p className="mt-1 text-sm leading-6 whitespace-pre-line text-[#191C1C]">
          {profile.lookingFor}
        </p>
      </section>

      <p className="mt-4 text-xs leading-4 text-[#6F7979]">
        {profile.profile.contributionKinds
          .map((contributionKind) => COFOUNDER_CONTRIBUTION_LABELS[contributionKind])
          .join(" · ")}
      </p>

      {profile.priorVentures.length > 0 && (
        <section className="mt-4" aria-label="Prior ventures">
          <h3 className="text-sm font-medium text-[#191C1C]">Before this</h3>
          <ul className="mt-1 space-y-1">
            {profile.priorVentures.map((venture) => (
              <li key={venture.id} className="text-sm leading-5 text-[#191C1C]">
                {venture.name} — {venture.roleLabel}, {venture.yearsActiveLabel}
                {/* An absent outcome renders as absent. Demanding one invites invention. */}
                {venture.outcomeSummary === null ? "" : `. ${venture.outcomeSummary}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.state === "published" && <EngagementStateControl profile={profile} />}

      {isEditable && <EditProfileForm profile={profile} />}

      <LifecycleControls profile={profile} isEditable={isEditable} />
    </article>
  );
}

// --- Editing -----------------------------------------------------------------

/**
 * `PATCH /community/cofounder-profiles/mine`, in place.
 *
 * IN PLACE RATHER THAN A LINK TO THE COMPOSER, because the composer is a CREATE and `userId` is
 * unique server-side: sending somebody with an existing profile back through it produces a
 * conflict, not an edit.
 *
 * ONLY THE FIELDS THE PATCH ACCEPTS. There is no capital or equity input, for the reason in the
 * file header — the backend answers 422 rather than discarding a figure, so one would break the
 * write outright rather than merely fail to save.
 *
 * NOTHING IS SENT AS `""`. A field cleared to blank is OMITTED, which means "leave it alone"
 * rather than "set it to empty" — the patch has no way to express deletion and pretending it does
 * would quietly discard somebody's bio.
 */
function EditProfileForm({ profile }: { profile: OwnCofounderProfile }) {
  const [headline, setHeadline] = useState(profile.profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [lookingFor, setLookingFor] = useState(profile.lookingFor);
  const updateProfile = useUpdateOwnCofounderProfile();

  const trimmedHeadline = headline.trim();
  const trimmedBio = bio.trim();
  const trimmedLookingFor = lookingFor.trim();

  const hasChanges =
    trimmedHeadline !== profile.profile.headline ||
    trimmedBio !== profile.bio ||
    trimmedLookingFor !== profile.lookingFor;

  return (
    <form
      className="mt-6 rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasChanges || updateProfile.isPending) return;
        updateProfile.mutate({
          input: {
            ...(trimmedHeadline.length === 0 || trimmedHeadline === profile.profile.headline
              ? {}
              : { headline: trimmedHeadline }),
            ...(trimmedBio.length === 0 || trimmedBio === profile.bio ? {} : { bio: trimmedBio }),
            ...(trimmedLookingFor.length === 0 || trimmedLookingFor === profile.lookingFor
              ? {}
              : { lookingFor: trimmedLookingFor }),
          },
        });
      }}
    >
      <h3 className="text-sm font-medium text-[#191C1C]">Edit</h3>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        {/* Says what saving does NOT do, because "save" reads as "publish" to most people. */}
        Saving keeps this a draft. Sending it for review is the separate button below.
      </p>

      <label className="mt-3 block text-xs text-[#6F7979]">
        One line about you
        <input
          className="mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-[#191C1C] outline-none focus:border-[#00696E]"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
        />
      </label>

      <label className="mt-2 block text-xs text-[#6F7979]">
        The longer version
        <textarea
          className="mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm leading-6 text-[#191C1C] outline-none focus:border-[#00696E]"
          rows={5}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </label>

      <label className="mt-2 block text-xs text-[#6F7979]">
        What you are looking for
        <textarea
          className="mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm leading-6 text-[#191C1C] outline-none focus:border-[#00696E]"
          rows={3}
          value={lookingFor}
          onChange={(event) => setLookingFor(event.target.value)}
        />
      </label>

      <button
        type="submit"
        className={`mt-3 ${QUIET_BUTTON_CLASS}`}
        disabled={!hasChanges || updateProfile.isPending}
      >
        Save changes
      </button>
      <MutationNotice
        result={updateProfile.data}
        fallbackMessage="Those changes did not save. Try again."
        hasThrown={updateProfile.isError}
      />
    </form>
  );
}

// --- Engagement state --------------------------------------------------------

function EngagementStateControl({ profile }: { profile: OwnCofounderProfile }) {
  const [engagementState, setEngagementState] = useState<CofounderEngagementState>(
    profile.profile.engagementState,
  );
  const updateEngagementState = useUpdateOwnCofounderEngagementState();

  return (
    <section className="mt-6 rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <h3 className="text-sm font-medium text-[#191C1C]">Where you are right now</h3>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        The only thing you can change without going back through review.
      </p>

      <div className="mt-2 space-y-1">
        {COFOUNDER_ENGAGEMENT_STATES.map((candidateState) => (
          <label key={candidateState} className="flex items-center gap-2 text-sm text-[#191C1C]">
            <input
              type="radio"
              name="engagement-state"
              checked={engagementState === candidateState}
              onChange={() => setEngagementState(candidateState)}
            />
            {COFOUNDER_ENGAGEMENT_LABELS[candidateState]}
          </label>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
        {/* Said outright, because people press "not looking" expecting to disappear. */}
        None of these removes you from the directory. &ldquo;Not looking&rdquo; keeps your profile
        visible saying exactly that, with no way for anyone to contact you — taking it down would
        make you look as though you had left.
      </p>

      <button
        type="button"
        className={`mt-2 ${QUIET_BUTTON_CLASS}`}
        disabled={
          updateEngagementState.isPending || engagementState === profile.profile.engagementState
        }
        onClick={() => updateEngagementState.mutate({ input: { engagementState } })}
      >
        Save
      </button>
      <MutationNotice
        result={updateEngagementState.data}
        fallbackMessage="That did not save. Try again."
        hasThrown={updateEngagementState.isError}
      />
    </section>
  );
}

// --- Submit and withdraw -----------------------------------------------------

function LifecycleControls({
  profile,
  isEditable,
}: {
  profile: OwnCofounderProfile;
  isEditable: boolean;
}) {
  const submitProfile = useSubmitOwnCofounderProfile();
  const withdrawProfile = useWithdrawOwnCofounderProfile();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {isEditable && (
        // NO "EDIT" LINK TO THE COMPOSER. That route is a CREATE and `userId` is unique
        // server-side, so sending somebody with an existing profile through it produces a conflict
        // rather than an edit. Editing happens in the form above.
        <span>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={submitProfile.isPending}
            onClick={() => submitProfile.mutate()}
          >
            {/* Not "publish". A moderator decides. */}
            Send for review
          </button>
          <MutationNotice
            result={submitProfile.data}
            fallbackMessage="That did not send. Try again."
            hasThrown={submitProfile.isError}
          />
        </span>
      )}

      {profile.state === "published" && (
        <span>
          <button
            type="button"
            className={QUIET_BUTTON_CLASS}
            disabled={withdrawProfile.isPending}
            onClick={() => withdrawProfile.mutate()}
          >
            Take yourself out of the directory
          </button>
          <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
            {/* Withdraw is reversible and there is no delete. Say so before they press it. */}
            Reversible. Your profile is kept and you can send it back for review whenever you want.
          </p>
          <MutationNotice
            result={withdrawProfile.data}
            fallbackMessage="That did not save. Try again."
            hasThrown={withdrawProfile.isError}
          />
        </span>
      )}
    </div>
  );
}
