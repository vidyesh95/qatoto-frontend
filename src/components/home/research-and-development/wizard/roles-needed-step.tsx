// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import type { RoleCommitment } from "@/types/research-and-development";

import {
  ROLES_NEEDED_OPTIONS,
  type NewIdeaStepProps,
} from "@/components/home/research-and-development/wizard/wizard-shared";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

const COMMITMENT_OPTIONS: { value: RoleCommitment; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "hobby", label: "Hobby" },
];

// Step 3: the equity-for-skills offer — which roles, how much equity, what
// commitment. All display-only; equity math is backend-owned later.
export default function RolesNeededStep({ draft, onDraftChange }: NewIdeaStepProps) {
  const toggleRoleNeeded = (roleOption: string) => {
    const nextRolesNeeded = draft.rolesNeeded.includes(roleOption)
      ? draft.rolesNeeded.filter((selectedRole) => selectedRole !== roleOption)
      : [...draft.rolesNeeded, roleOption];
    onDraftChange({ rolesNeeded: nextRolesNeeded });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Roles needed</span>
        <div className="flex flex-wrap gap-2">
          {ROLES_NEEDED_OPTIONS.map((roleOption) => {
            const isRoleSelected = draft.rolesNeeded.includes(roleOption);
            return (
              <button
                key={roleOption}
                type="button"
                aria-pressed={isRoleSelected}
                onClick={() => toggleRoleNeeded(roleOption)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isRoleSelected
                    ? "bg-[#00696E] text-white"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {roleOption}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Equity to offer, in percent</span>
        {/* TWO NUMERIC FIELDS, NOT ONE FREE-TEXT RANGE. The old input took "2–4% per
            role", which `offeredEquityBasisPointsMin` / `…Max` cannot be parsed out of —
            they are integer basis points, and no float ever touches equity. */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={draft.offeredEquityPercentMin}
            onChange={(changeEvent) =>
              onDraftChange({ offeredEquityPercentMin: changeEvent.target.value })
            }
            placeholder="Min"
            className={INPUT_CLASS}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={draft.offeredEquityPercentMax}
            onChange={(changeEvent) =>
              onDraftChange({ offeredEquityPercentMax: changeEvent.target.value })
            }
            placeholder="Max"
            className={INPUT_CLASS}
          />
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Expected commitment</span>
        <select
          value={draft.expectedCommitment}
          onChange={(changeEvent) => {
            const selectedCommitment = COMMITMENT_OPTIONS.find(
              (commitmentOption) => commitmentOption.value === changeEvent.target.value,
            )?.value;
            if (selectedCommitment) onDraftChange({ expectedCommitment: selectedCommitment });
          }}
          className={INPUT_CLASS}
        >
          {COMMITMENT_OPTIONS.map((commitmentOption) => (
            <option key={commitmentOption.value} value={commitmentOption.value}>
              {commitmentOption.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
