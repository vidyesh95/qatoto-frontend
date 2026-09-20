// TRANSPORT: server-fetch — server component. Reads GET /discovery/talent/:handle via
// @/lib/rnd/discovery.api, with the session cookie forwarded by callerRequestOptions().
// The read is `requireAuth`, so a signed-out visitor gets a sign-in panel rather than a
// profile.
import Link from "next/link";
import { notFound } from "next/navigation";

import { TalentCompensationAskBadges } from "@/components/home/research-and-development/cards/compensation-badges";
import RndStatusPanel, {
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { getTalentProfile } from "@/lib/rnd/discovery.api";
import ReportProfileOpener from "@/components/home/channel/report-profile-opener";
import HairlineDefinitionRow, {
  type HairlineDefinitionFact,
} from "@/components/home/shared/hairline-definition-row";
import { formatEffortFromMinutes, formatIsoInstant } from "@/lib/rnd/format";
import { isUnauthorized } from "@/lib/http";
import { callerRequestOptions } from "@/lib/server-http";

/**
 * The facts the row renders, in reading order.
 *
 * ⚠️ **EVERY STRING IS THE ONE THIS PAGE ALREADY PRINTED.** "Not computed yet" and "No run yet" are
 * carried through unchanged, so this migration is layout and nothing else. They are NOT dropped to
 * `null`, even though the row supports it and `cards/talent-profile-card.tsx` already drops these
 * same figures — reconciling that divergence is a copy decision needing a per-field reading, not a
 * side effect of moving a container.
 *
 * Local rather than shared, on the `buildClusterFacts` precedent: the null semantics are this
 * page's. ⚠️ This is the fourth such helper; if a fifth appears, extract the pattern.
 */
function buildTalentFacts(profile: {
  readonly verifiedEffortMinutes: number | null;
  readonly projectsCompletedCount: number | null;
  readonly projectionComputedAt: string | null;
}): readonly HairlineDefinitionFact[] {
  return [
    {
      label: "Verified effort",
      value:
        profile.verifiedEffortMinutes === null
          ? "Not computed yet"
          : formatEffortFromMinutes(profile.verifiedEffortMinutes),
    },
    {
      label: "Projects completed",
      value: String(profile.projectsCompletedCount ?? "Not computed yet"),
    },
    {
      label: "Figures as of",
      value:
        profile.projectionComputedAt === null
          ? "No run yet"
          : formatIsoInstant(profile.projectionComputedAt),
    },
  ];
}

/**
 * One person's published profile.
 *
 * THE CARDS ON `/talent` USED TO LINK NOWHERE. The read shipped with backend §11j.2 and
 * nothing called it, so a directory of people was a directory of dead ends.
 *
 * AN UNPUBLISHED PROFILE IS A `404` AND RENDERS AS `notFound()` — identical to a person
 * who does not exist. Anything else would let a visitor enumerate who has a profile they
 * chose not to publish.
 *
 * `verifiedEffortMinutes` AND `projectsCompletedCount` ARE NULLABLE, and null is not zero.
 * Null means §9 has computed nothing for this person yet; zero would assert they have
 * done nothing. On a page whose entire purpose is someone's credibility, publishing the
 * second when the truth is the first is the worst available error.
 *
 * A SKILL'S `isVerified` IS JOB-WRITTEN AND UNSETTABLE BY ANY REQUEST — it means §9
 * recorded verified effort on a project tagged with that skill. If a request could set
 * it, the badge would mean nothing, which is precisely why the column exists.
 */
export default async function TalentDetailPage({ handleOrUserId }: { handleOrUserId: string }) {
  const requestOptions = await callerRequestOptions();
  const profileResult = await getTalentProfile(handleOrUserId, requestOptions);

  if (!profileResult.success) {
    if (isUnauthorized(profileResult.error)) {
      return (
        <div className="px-4 pt-6 lg:px-6">
          <RndSignInRequiredPanel message="Sign in to see people's profiles." />
        </div>
      );
    }
    if (profileResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndStatusPanel message="Couldn't load this profile." />
      </div>
    );
  }

  const profile = profileResult.data;

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-2">
        <Link
          href="/research-and-development/talent"
          className="text-xs font-medium text-[#00696E]"
        >
          ← Talent
        </Link>
        <h1 className="text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
          {profile.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {profile.headlineRole}
          {profile.handle !== null && ` · @${profile.handle}`}
          {profile.locationLabel !== null && ` · ${profile.locationLabel}`}
          {profile.region !== null && ` · ${profile.region.displayLabel}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {profile.availability.replaceAll("_", " ")} · {profile.commitment.replaceAll("_", " ")}
        </p>
      </header>

      {profile.bio !== null && <p className="max-w-prose text-sm leading-6">{profile.bio}</p>}

      {/*
        THE SECOND ENTRY POINT FOR REPORTING A PROFILE, and it belongs here specifically.
        Video reporting sits on every card menu; profile reporting had exactly one way in — Channel
        → About → Report — while `talent_profile.bio` was a second surface publishing the same
        person's own words. That bio is now covered by `user.profileModerationState`, so the surface
        that displays it should also be a surface you can report it from; a lever nobody can pull
        from where the text is read is a lever that gets pulled late.

        SAME SHEET, SAME `reportedUserId`. A report is about a PERSON, not about a page, so one
        report from here reaches the same queue and the same moderator action as one from a channel.
      */}
      <ReportProfileOpener reportedUserId={profile.userId} displayName={profile.name} />

      {/* ⚠️ **ONE HAIRLINE ROW, NOT THREE BOXES.** `docs/Design.md` §6 bans repeating an identical
          card grid, and the figures were `text-xl font-semibold` — a third type size against §3's
          Two-Size Rule in a product written at 14 and 12px. Same conversion as the Civic Pulse
          cluster detail, through the same shared component. */}
      <HairlineDefinitionRow facts={buildTalentFacts(profile)} />

      {profile.skills.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-wide xl:text-lg">Skills</h2>
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li
                key={skill.slug}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  skill.isVerified
                    ? "bg-[#00696E]/10 font-medium text-[#00696E]"
                    : "border border-[#CAC4D0]"
                }`}
              >
                {skill.displayLabel}
                {skill.isVerified && " ✓"}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            A ✓ means the verification pipeline recorded effort on a project tagged with that skill.
            Nobody can set it by hand — including the person whose profile this is.
          </p>
        </section>
      )}

      {profile.compensationAsks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-wide xl:text-lg">
            What they are looking for
          </h2>
          {/* The ask is a DISCRIMINATED UNION on the wire, so an equity ask carrying a
              salary range is unrepresentable. The badges render it through the same
              exhaustive switch the directory cards use. */}
          <TalentCompensationAskBadges asks={profile.compensationAsks} />
          <p className="text-xs text-muted-foreground">
            This is their own stated ask, not an offer and not a rate anything pays against.
          </p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Profile updated {formatIsoInstant(profile.profileUpdatedAt)}. To invite this person, open
        one of your projects — an invite belongs to a project and a role.
      </p>
    </div>
  );
}
