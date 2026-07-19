import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";

import type { OpenRole } from "@/types/research-and-development";

// Horizontally scrolling feed of open roles across all projects. Anchored so
// the Team Building stage card can deep-link here.
export default function OpenRolesRail({ roles }: { roles: OpenRole[] }) {
  return (
    <section id="open-roles" className="scroll-mt-20 space-y-1">
      <SectionHeader title="Join a team" />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {roles.map((role) => (
          <OpenRoleCard key={role.id} role={role} />
        ))}
      </div>
    </section>
  );
}
