import TalentProfileCard from "@/components/home/research-and-development/cards/talent-profile-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import type { TalentProfile } from "@/types/research-and-development";

// A short slice of the /talent marketplace on the role-first page: a founder
// reading open roles is often the person who needs to hire, not apply. The
// see-all chevron hands off to /talent rather than duplicating its filters.
export default function TalentSpotlightStrip({ profiles }: { profiles: TalentProfile[] }) {
  return (
    <section className="space-y-1">
      <SectionHeader title="People looking for a team" href="/research-and-development/talent" />
      <div className="grid gap-4 px-4 pt-2 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
        {profiles.map((profile) => (
          <TalentProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </section>
  );
}
