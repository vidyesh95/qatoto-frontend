import Image from "next/image";

import InviteTalentButton from "@/components/home/research-and-development/sections/invite-talent-button";
import type { TalentAvailability, TalentProfile } from "@/types/research-and-development";

const AVAILABILITY_LABELS: Record<TalentAvailability, string> = {
  "open-to-work": "Open to work",
  "open-to-offers": "Open to offers",
  unavailable: "Unavailable",
};

const AVAILABILITY_PILL_CLASSES: Record<TalentAvailability, string> = {
  "open-to-work": "bg-[#00696E]/10 text-[#00696E]",
  "open-to-offers": "bg-[#D6E3FF] text-[#191C1C]",
  unavailable: "bg-muted text-muted-foreground",
};

const COMMITMENT_LABELS: Record<TalentProfile["commitment"], string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  hobby: "Hobby",
};

// Marketplace tile for /talent: avatar, headline role, availability, top
// skills, equity ask, and an invite toggle. All figures are display-only
// mocks — matching and outreach are backend-owned later.
export default function TalentProfileCard({ profile }: { profile: TalentProfile }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        <Image
          src={profile.avatarImageSrc}
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
          {AVAILABILITY_LABELS[profile.availability]}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {skill}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 font-medium text-[#191C1C]">
          Asks {profile.equityAsk} equity
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">
          {COMMITMENT_LABELS[profile.commitment]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {profile.locationLabel} · {profile.projectsCompletedCount} project
        {profile.projectsCompletedCount === 1 ? "" : "s"} · {profile.effortHoursLogged} hrs logged
      </p>
      <InviteTalentButton />
    </div>
  );
}
