"use client";

import Image from "next/image";
import { useState } from "react";

import {
  IMMORTAL_COMPENSATION_PREFERENCE_LABELS,
  IMMORTAL_CONTRIBUTOR_ROLE_LABELS,
} from "@/lib/project-immortal-mocks";
import type {
  ImmortalCompensationPreference,
  ImmortalContributor,
  ImmortalContributorRole,
} from "@/types/research-and-development";

type RoleFilter = ImmortalContributorRole | "all";

const ROLE_FILTER_ORDER: ImmortalContributorRole[] = [
  "researcher",
  "founder-director",
  "venture-capitalist",
  "supplier",
  "supporter",
];

const COMPENSATION_CHIP_CLASS_NAMES: Record<ImmortalCompensationPreference, string> = {
  salary: "bg-[#D6E3FF] text-blue-900",
  "one-time": "bg-amber-100 text-amber-800",
  equity: "bg-[#00696E]/10 text-[#00696E]",
};

const buildRoleChipClassName = (isActive: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    isActive
      ? "border-transparent bg-primary text-primary-foreground"
      : "border-[#CAC4D0]/60 text-foreground hover:bg-black/5"
  }`;

type ProjectImmortalContributorsProps = {
  contributors: ImmortalContributor[];
};

// Who is working on the program, what they put in, and how they want to be paid.
// Effort hours and escrow figures are mock — the backend owns the real ledger.
export default function ProjectImmortalContributors({
  contributors,
}: ProjectImmortalContributorsProps) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilter>("all");

  const filteredContributors =
    selectedRoleFilter === "all"
      ? contributors
      : contributors.filter((contributor) => contributor.role === selectedRoleFilter);

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Qatoto tracks every contributor&apos;s effort and the money they put at risk, then
        distributes salary, a one-time payout, or equity — whichever each contributor chose.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedRoleFilter("all")}
          aria-pressed={selectedRoleFilter === "all"}
          className={buildRoleChipClassName(selectedRoleFilter === "all")}
        >
          All
        </button>
        {ROLE_FILTER_ORDER.map((contributorRole) => (
          <button
            key={contributorRole}
            type="button"
            onClick={() => setSelectedRoleFilter(contributorRole)}
            aria-pressed={selectedRoleFilter === contributorRole}
            className={buildRoleChipClassName(selectedRoleFilter === contributorRole)}
          >
            {IMMORTAL_CONTRIBUTOR_ROLE_LABELS[contributorRole]}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
        {filteredContributors.map((contributor) => (
          <li key={contributor.id} className="flex items-center gap-3 p-3">
            <Image
              src={contributor.avatarSrc}
              width={36}
              height={36}
              alt={contributor.name}
              className="size-9 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{contributor.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {IMMORTAL_CONTRIBUTOR_ROLE_LABELS[contributor.role]}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {contributor.effortLabel} · {contributor.contributionLabel}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${COMPENSATION_CHIP_CLASS_NAMES[contributor.compensationPreference]}`}
            >
              {IMMORTAL_COMPENSATION_PREFERENCE_LABELS[contributor.compensationPreference]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
