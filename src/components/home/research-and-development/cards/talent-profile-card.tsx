// TRANSPORT: props-only — presentational server component. Fetches nothing; profiles
// arrive as props from a parent that read GET /discovery/talent.
import Image from "next/image";

import { TalentCompensationAskBadges } from "@/components/home/research-and-development/cards/compensation-badges";
import InviteTalentButton from "@/components/home/research-and-development/sections/invite-talent-button";
import { formatEffortFromMinutes } from "@/lib/rnd/format";
import { ROLE_COMMITMENT_LABELS, TALENT_AVAILABILITY_LABELS } from "@/lib/rnd/labels";
import type { TalentAvailability, TalentProfile } from "@/lib/rnd/discovery.schemas";

const AVAILABILITY_PILL_CLASSES: Record<TalentAvailability, string> = {
  open_to_work: "bg-[#00696E]/10 text-[#00696E]",
  open_to_offers: "bg-[#D6E3FF] text-[#191C1C]",
  unavailable: "bg-muted text-muted-foreground",
};

// The directory is opt-in and a profile may carry no photo.
const FALLBACK_AVATAR_IMAGE_SRC = "/dummy/profile_image_01.avif";

/**
 * Marketplace tile for `/talent`: avatar, headline role, availability, top skills,
 * compensation ask and an invite toggle.
 *
 * The two projection figures are NULLABLE and rendered as absences when null.
 * `verifiedEffortMinutes` and `projectsCompletedCount` are written by §9's jobs, so
 * null means "no job has computed this" — printing "0 hrs logged" would assert this
 * person has done nothing, which is a claim about them rather than about the pipeline.
 *
 * A skill's `isVerified` is job-written and unsettable by any request. That is the
 * whole point of the badge, so the tick is safe to trust here.
 */
export default function TalentProfileCard({ profile }: { profile: TalentProfile }) {
  const projectionFigures = [
    profile.locationLabel,
    profile.projectsCompletedCount === null
      ? null
      : `${profile.projectsCompletedCount} project${profile.projectsCompletedCount === 1 ? "" : "s"}`,
    profile.verifiedEffortMinutes === null
      ? null
      : `${formatEffortFromMinutes(profile.verifiedEffortMinutes)} verified`,
  ].filter((figure): figure is string => figure !== null);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        <Image
          src={profile.avatarImageUrl ?? FALLBACK_AVATAR_IMAGE_SRC}
          width={48}
          height={48}
          alt={profile.name}
          className="size-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{profile.name}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{profile.headlineRole}</p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AVAILABILITY_PILL_CLASSES[profile.availability]}`}
        >
          {TALENT_AVAILABILITY_LABELS[profile.availability]}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 3).map((skill) => (
          <span key={skill.slug} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {skill.displayLabel}
            {skill.isVerified && <span title="Verified by recorded effort"> ✓</span>}
          </span>
        ))}
      </div>
      {profile.compensationAsks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">Wants</span>
          <TalentCompensationAskBadges asks={profile.compensationAsks} />
          <span className="rounded-full bg-muted px-2 py-0.5">
            {ROLE_COMMITMENT_LABELS[profile.commitment]}
          </span>
        </div>
      )}
      {projectionFigures.length > 0 && (
        <p className="text-xs text-muted-foreground">{projectionFigures.join(" · ")}</p>
      )}
      <InviteTalentButton />
    </div>
  );
}
