// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";

import type { OpenRole } from "@/lib/rnd/catalog.schemas";

// Horizontally scrolling feed of open roles across all projects. Anchored so
// the Team Building stage card can deep-link here.
export default function OpenRolesRail({ roles }: { roles: OpenRole[] }) {
  return (
    <section id="open-roles" className="scroll-mt-20 space-y-1">
      <SectionHeader title="Join a team" href="/research-and-development/team-building" />
      {/* SNAPS TO A CARD, so a swipe or a trackpad flick never rests with a card cut in half.
          `scroll-px-*` matches the `px-*` gutter so the snapped card keeps that gutter instead of
          landing flush against the edge, and `*:snap-start` sets the alignment from here, so the
          card is unchanged everywhere else it renders. */}
      <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-2 *:snap-start lg:scroll-px-6 lg:px-6">
        {roles.map((role) => (
          <OpenRoleCard key={role.id} role={role} />
        ))}
      </div>
    </section>
  );
}
