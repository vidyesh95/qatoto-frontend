import ApplyRoleSheet from "@/components/home/research-and-development/sheets/apply-role-sheet";

import type { OpenRole, RoleCommitment } from "@/types/research-and-development";

const ROLE_COMMITMENT_LABELS: Record<RoleCommitment, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  hobby: "Hobby",
};

// Equity-for-skills role tile for the open-roles rail and the Team tab: role
// title, parent project, skill chips, equity range, commitment tag, and the
// apply-role sheet trigger at the bottom.
export default function OpenRoleCard({ role }: { role: OpenRole }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold">{role.roleTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{role.projectName}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {role.skills.map((skill) => (
          <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {skill}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-xs font-medium text-[#191C1C]">
          {role.equityRange} equity
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {ROLE_COMMITMENT_LABELS[role.commitment]}
        </span>
      </div>
      <div className="mt-auto">
        <ApplyRoleSheet role={role} />
      </div>
    </div>
  );
}
