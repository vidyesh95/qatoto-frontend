// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET /open-roles.
import CompensationBadges from "@/components/home/research-and-development/cards/compensation-badges";
import ApplyRoleSheet from "@/components/home/research-and-development/sheets/apply-role-sheet";
import { COMPENSATION_EARNED_AS_POLICY_LABELS, ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";

/**
 * Open-role tile for the landing rail, the Team tab and `/team-building`'s grid.
 *
 * Needs NO second request: `GET /open-roles` carries the project's slug, name, stage
 * and cover on the role row, plus the resolved `currency` for the money strands.
 *
 * The earned-as line comes from the strands' `earnedAsPolicy` enum rather than prose a
 * founder typed — which is what stops a role advertising a payout mechanism the
 * platform does not execute. Qatoto holds no funds and charges nobody here.
 */
export default function OpenRoleCard({ role }: { role: OpenRole }) {
  const remainingSlotCount = role.slotsTotal - role.slotsFilledCount;
  // One line per DISTINCT policy: a blended offer usually shares one, and repeating it
  // per strand would read as two different promises.
  const earnedAsPolicyLabels = [
    ...new Set(role.compensation.map((strand) => strand.earnedAsPolicy)),
  ].map((policy) => COMPENSATION_EARNED_AS_POLICY_LABELS[policy]);

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
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CompensationBadges strands={role.compensation} currency={role.currency} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {ROLE_COMMITMENT_LABELS[role.commitment]}
          </span>
        </div>
        {earnedAsPolicyLabels.map((policyLabel) => (
          <p key={policyLabel} className="text-[11px] text-muted-foreground">
            {policyLabel}
          </p>
        ))}
        {remainingSlotCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {remainingSlotCount} of {role.slotsTotal} slot{role.slotsTotal === 1 ? "" : "s"} open
          </p>
        )}
      </div>
      <div className="mt-auto">
        <ApplyRoleSheet role={role} />
      </div>
    </div>
  );
}
