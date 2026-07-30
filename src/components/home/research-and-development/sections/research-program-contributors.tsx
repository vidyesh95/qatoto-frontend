// TRANSPORT: client-query — the role filter navigates, and the join/edit form calls
// `useProgramParticipationMutation`. The first page of contributors arrives as props.
"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { useProgramParticipationMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { formatEffortFromMinutes } from "@/lib/rnd/format";
import { RESEARCH_PARTICIPANT_ROLE_LABELS } from "@/lib/rnd/labels";
import {
  RESEARCH_PARTICIPANT_ROLES,
  ResearchParticipantRoleSchema,
  type ResearchParticipant,
  type ResearchParticipantRole,
} from "@/lib/rnd/research-programs.schemas";
import { COMPENSATION_KINDS, CompensationKindSchema } from "@/lib/rnd/shared.schemas";

import { MutationAcceptedNotice, MutationErrorNotice } from "./mutation-feedback";

const COMPENSATION_PREFERENCE_LABELS: Record<(typeof COMPENSATION_KINDS)[number], string> = {
  salary: "Salary",
  one_time: "One-time",
  equity: "Equity",
};

type ResearchProgramContributorsProps = {
  programSlug: string;
  contributors: ResearchParticipant[];
  /** The role the server filtered by, so the chips reflect what is actually on screen. */
  activeRole: ResearchParticipantRole | null;
  canJoin: boolean;
  /** True when the viewer already has a participant row — the form becomes an edit. */
  isViewerParticipant: boolean;
};

/**
 * Who is building this, and how they want to be compensated.
 *
 * THE ROLE FILTER IS A SERVER ROUND TRIP, not a client-side `.filter()` over a fetched array.
 * The mock filtered in the browser, which on a program with thousands of contributors means the
 * whole roster crosses the wire to render five rows — exactly what CLAUDE.md's thin-client rule
 * exists to prevent.
 *
 * THE MOCK'S `effortLabel` IS TWO FIELDS NOW. It held "312 hrs logged" on nine rows and "Funding
 * tranche 2 of 4" on two — one field, two meanings. A funder shows tranche progress; everyone
 * else shows hours, summed from their effort logs rather than stored.
 */
export default function ResearchProgramContributors({
  programSlug,
  contributors,
  activeRole,
  canJoin,
  isViewerParticipant,
}: ResearchProgramContributorsProps) {
  /**
   * The filter hrefs are built HERE, from the slug, rather than passed in as a callback.
   *
   * A FUNCTION CANNOT CROSS THE SERVER→CLIENT BOUNDARY. An earlier version took a
   * `buildRoleHref` prop, and React threw "Functions cannot be passed directly to Client
   * Components" while serializing the payload — which killed the whole page subtree, not just
   * this component. `pnpm build` was happy; only rendering the production server caught it.
   */
  const buildRoleHref = (role: ResearchParticipantRole | null): string =>
    role === null
      ? `/research-and-development/programs/${programSlug}`
      : `/research-and-development/programs/${programSlug}?role=${role}`;

  const participationMutation = useProgramParticipationMutation(programSlug);

  const [role, setRole] = useState<ResearchParticipantRole>("researcher");
  const [compensationPreference, setCompensationPreference] =
    useState<(typeof COMPENSATION_KINDS)[number]>("equity");
  const [contributionSummary, setContributionSummary] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const mutationError =
    participationMutation.error instanceof ApiRequestError
      ? participationMutation.error
      : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    participationMutation.mutate(
      {
        action: isViewerParticipant ? "update" : "join",
        role,
        compensationPreference,
        contributionSummary: contributionSummary.trim() === "" ? null : contributionSummary.trim(),
      },
      { onSuccess: () => setIsFormOpen(false) },
    );
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Everyone contributing to this programme, and how each of them wants to be compensated.
        Effort and contributions are self-reported records — they mint no equity.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <RoleChip label="All" href={buildRoleHref(null)} isActive={activeRole === null} />
        {RESEARCH_PARTICIPANT_ROLES.map((roleOption) => (
          <RoleChip
            key={roleOption}
            label={RESEARCH_PARTICIPANT_ROLE_LABELS[roleOption]}
            href={buildRoleHref(roleOption)}
            isActive={activeRole === roleOption}
          />
        ))}
      </div>

      {canJoin && (
        <div className="space-y-3">
          {isFormOpen ? (
            <form
              onSubmit={handleSubmit}
              className="grid gap-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4 sm:grid-cols-3"
            >
              <label className="space-y-1 text-xs">
                <span className="font-medium">How you contribute</span>
                <select
                  value={role}
                  onChange={(event) => {
                    // Parsed against the domain enum before it reaches state: a `<select>` value
                    // is a string, and this is the one place it becomes a typed role.
                    const parsed = ResearchParticipantRoleSchema.safeParse(event.target.value);
                    if (parsed.success) setRole(parsed.data);
                  }}
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                >
                  {RESEARCH_PARTICIPANT_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {RESEARCH_PARTICIPANT_ROLE_LABELS[roleOption]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium">Compensation preference</span>
                <select
                  value={compensationPreference}
                  onChange={(event) => {
                    const parsed = CompensationKindSchema.safeParse(event.target.value);
                    if (parsed.success) setCompensationPreference(parsed.data);
                  }}
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                >
                  {COMPENSATION_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {COMPENSATION_PREFERENCE_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium">What you bring (optional)</span>
                <input
                  value={contributionSummary}
                  onChange={(event) => setContributionSummary(event.target.value)}
                  maxLength={500}
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                  placeholder="Senolytics assay data"
                />
              </label>

              <div className="flex items-center gap-2 sm:col-span-3">
                <button
                  type="submit"
                  disabled={participationMutation.isPending}
                  className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:opacity-60"
                >
                  {participationMutation.isPending
                    ? "Saving…"
                    : isViewerParticipant
                      ? "Update my details"
                      : "Join this programme"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C]"
            >
              {isViewerParticipant ? "Edit how I contribute" : "Join this programme"}
            </button>
          )}

          {participationMutation.isSuccess && !isFormOpen && (
            <MutationAcceptedNotice message="Your contribution details were saved." />
          )}
          {mutationError && <MutationErrorNotice error={mutationError.apiError} />}
        </div>
      )}

      {contributors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {activeRole === null
            ? "Nobody has joined this programme yet."
            : `No ${RESEARCH_PARTICIPANT_ROLE_LABELS[activeRole].toLowerCase()}s have joined yet.`}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contributors.map((contributor) => (
            <li
              key={contributor.participantId}
              className="flex items-start gap-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
            >
              {contributor.participant.avatarImageUrl ? (
                <Image
                  src={contributor.participant.avatarImageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00696E]/10 text-sm font-medium text-[#00696E]"
                >
                  {contributor.participant.name.slice(0, 1).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{contributor.participant.name}</p>
                  {contributor.isViewer && (
                    <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[10px] text-[#00696E]">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {RESEARCH_PARTICIPANT_ROLE_LABELS[contributor.role]}
                </p>
                {/*
                  The mock's `effortLabel` split in two. A funder shows tranche progress; anyone
                  else shows hours, summed from their logs.
                */}
                <p className="text-xs text-muted-foreground">
                  {contributor.fundingTrancheIndex !== null &&
                  contributor.fundingTrancheTotal !== null
                    ? `Funding tranche ${String(contributor.fundingTrancheIndex)} of ${String(contributor.fundingTrancheTotal)}`
                    : `${formatEffortFromMinutes(contributor.totalEffortMinutes)} logged`}
                </p>
                {contributor.contributionSummary && (
                  <p className="text-xs text-muted-foreground">{contributor.contributionSummary}</p>
                )}
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {COMPENSATION_PREFERENCE_LABELS[contributor.compensationPreference]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A filter chip. An anchor, not a button — filtering is a server round trip. */
function RoleChip({ label, href, isActive }: { label: string; href: string; isActive: boolean }) {
  return (
    <a
      href={href}
      aria-current={isActive ? "true" : undefined}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        isActive ? "border-[#00696E] bg-[#00696E] text-white" : "border-[#CAC4D0] hover:bg-muted"
      }`}
    >
      {label}
    </a>
  );
}
