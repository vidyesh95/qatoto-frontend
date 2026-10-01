// TRANSPORT: client-query — the lookup, the proposal and both verdicts call hooks in
// `@/hooks/rnd/platform-roles`.
"use client";

import { useState, type FormEvent } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useCancelPlatformRoleProposalMutation,
  useCountersignPlatformRoleMutation,
  useOwnStaffContextQuery,
  usePlatformRoleProposalsQuery,
  usePlatformRoleSubjectQuery,
  useProposePlatformRoleMutation,
} from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import { PLATFORM_ROLES, type PlatformRole } from "@/lib/rnd/platform-roles.schemas";

/** What each role actually lets someone do. Shown beside the choice, because "moderator"
 *  and "auditor" are disjoint rather than ranked and picking by name alone invites the
 *  assumption that admin > auditor > moderator. */
const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  moderator: "Decide categories, cluster merges and §10 content. No escrow access.",
  auditor: "Read the escrow ledger. Read-only, and cannot moderate anything.",
  admin: "Everything above, plus proposing and countersigning these roles.",
};

const REVOKE_CHOICE = "none";

function StaffSubjectRoleProposalForm({
  selectedRole,
  onSelectRole,
  isPending,
  isSuccess,
  onPropose,
}: {
  selectedRole: PlatformRole | typeof REVOKE_CHOICE | null;
  onSelectRole: (role: PlatformRole | typeof REVOKE_CHOICE) => void;
  isPending: boolean;
  isSuccess: boolean;
  onPropose: () => void;
}) {
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">Propose role</legend>
        {PLATFORM_ROLES.map((role) => (
          <label key={role} className="flex items-start gap-2 text-xs">
            <input
              type="radio"
              name="platform-role"
              value={role}
              // The visible text lives in nested spans; naming the control directly
              // keeps the accessible name flat and unambiguous.
              aria-label={role}
              checked={selectedRole === role}
              onChange={() => onSelectRole(role)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{role}</span>
              <span className="block text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
        <label className="flex items-start gap-2 text-xs">
          <input
            type="radio"
            name="platform-role"
            value={REVOKE_CHOICE}
            aria-label="none — revoke any role"
            checked={selectedRole === REVOKE_CHOICE}
            onChange={() => onSelectRole(REVOKE_CHOICE)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">none</span>
            <span className="block text-muted-foreground">
              Revokes any role, once countersigned.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPropose}
          disabled={selectedRole === null || isPending}
          className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Proposing…" : "Propose"}
        </button>
        {isSuccess && (
          <output className="text-xs text-muted-foreground">
            Proposed. It takes effect when another admin countersigns it below.
          </output>
        )}
      </div>
    </>
  );
}

type PlatformRoleProposal = NonNullable<
  ReturnType<typeof usePlatformRoleProposalsQuery>["data"]
>[number];

function StaffRoleProposalItem({
  proposal,
  ownUserId,
  isCountersignPending,
  isCancelPending,
  onCountersign,
  onCancel,
}: {
  proposal: PlatformRoleProposal;
  ownUserId: string | undefined;
  isCountersignPending: boolean;
  isCancelPending: boolean;
  onCountersign: () => void;
  onCancel: () => void;
}) {
  // Both are refused by the backend — and by a CHECK constraint underneath it.
  // Disabled here so the refusal is not how anyone finds out.
  const isOwnProposal = proposal.proposedByUserId === ownUserId;
  const isAboutSelf = proposal.subjectUserId === ownUserId;
  const isBlocked = isOwnProposal || isAboutSelf;

  return (
    <li className="space-y-3 rounded-2xl border border-outline-variant/60 bg-card p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {proposal.subjectName}{" "}
          <span className="font-normal text-muted-foreground">
            {proposal.previousPlatformRole ?? "none"} → {proposal.nextPlatformRole ?? "none"}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{proposal.subjectEmail}</p>
        <p className="text-xs text-muted-foreground">
          Proposed by {proposal.proposedByName ?? proposal.proposedByUserId} ·{" "}
          {formatIsoInstant(proposal.proposedAt)}
        </p>
        {proposal.proposeNote !== "" && <p className="text-xs">{proposal.proposeNote}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBlocked || isCountersignPending}
          onClick={onCountersign}
          className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-xs font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          Countersign
        </button>
        <button
          type="button"
          disabled={isCancelPending}
          onClick={onCancel}
          className="cursor-pointer rounded-full border border-outline-variant px-4 py-2 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Withdraw
        </button>
        {isOwnProposal && (
          <span className="text-xs text-muted-foreground">
            You proposed this, so another admin has to countersign it.
          </span>
        )}
        {isAboutSelf && !isOwnProposal && (
          <span className="text-xs text-muted-foreground">This is about your own account.</span>
        )}
      </div>
    </li>
  );
}
export default function StaffRolePage() {
  const ownStaffContextQuery = useOwnStaffContextQuery();
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformRole | typeof REVOKE_CHOICE | null>(
    null,
  );

  const subjectQuery = usePlatformRoleSubjectQuery(submittedEmail);
  const proposalsQuery = usePlatformRoleProposalsQuery();
  const proposeMutation = useProposePlatformRoleMutation();
  const countersignMutation = useCountersignPlatformRoleMutation();
  const cancelMutation = useCancelPlatformRoleProposalMutation();

  const canManageRoles =
    ownStaffContextQuery.data?.capabilities.includes("manage_platform_roles") ?? false;
  const ownUserId = ownStaffContextQuery.data?.userId;

  const subject = subjectQuery.data;
  // Compared on the resolved id, not on the typed string: a different casing of the same
  // address is the same account, and the backend refuses it either way.
  const isSubjectSelf = subject !== undefined && subject.userId === ownUserId;

  const firstError = [
    subjectQuery.error,
    proposeMutation.error,
    countersignMutation.error,
    cancelMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  function handleLookupSubmit(submitEvent: FormEvent<HTMLFormElement>): void {
    submitEvent.preventDefault();
    proposeMutation.reset();
    countersignMutation.reset();
    setSelectedRole(null);
    setSubmittedEmail(emailDraft.trim());
  }

  function handleProposeClick(): void {
    if (subject === undefined || selectedRole === null) return;
    proposeMutation.mutate({
      email: subject.email,
      role: selectedRole === REVOKE_CHOICE ? null : selectedRole,
    });
  }

  if (ownStaffContextQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!canManageRoles) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <output className="block rounded-2xl border border-outline-variant/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Managing roles needs the admin role. Your role is{" "}
          {ownStaffContextQuery.data?.platformRole ?? "none"}.
        </output>
      </div>
    );
  }

  const pendingProposals = proposalsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Propose a role change by exact email — there is no directory to browse. A proposal changes
          nothing until a <span className="font-medium">different</span> admin countersigns it.
          Every applied change is recorded in the audit log.
        </p>
      </header>

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Propose a change</h2>

        <form onSubmit={handleLookupSubmit} className="flex flex-wrap items-end gap-2">
          <label className="flex-1 space-y-1 text-xs">
            <span className="font-medium">Email address</span>
            <input
              type="email"
              required
              value={emailDraft}
              onChange={(changeEvent) => setEmailDraft(changeEvent.target.value)}
              placeholder="someone@example.com"
              className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={emailDraft.trim() === "" || subjectQuery.isFetching}
            className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {subjectQuery.isFetching ? "Looking up…" : "Look up"}
          </button>
        </form>

        {subject !== undefined && (
          <div className="space-y-4 rounded-2xl border border-outline-variant/60 bg-card p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{subject.name}</p>
              <p className="text-xs text-muted-foreground">{subject.email}</p>
              <p className="text-xs text-muted-foreground">
                Current role: <span className="font-medium">{subject.platformRole ?? "none"}</span>
              </p>
            </div>

            {isSubjectSelf ? (
              <output className="block rounded-xl border border-outline-variant/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                This is your own account. You cannot change your own role — ask another admin.
              </output>
            ) : (
              <StaffSubjectRoleProposalForm
                selectedRole={selectedRole}
                onSelectRole={setSelectedRole}
                isPending={proposeMutation.isPending}
                isSuccess={proposeMutation.isSuccess}
                onPropose={handleProposeClick}
              />
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Awaiting countersignature</h2>
        {proposalsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pendingProposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting.</p>
        ) : (
          <ul className="space-y-3">
            {pendingProposals.map((proposal) => (
              <StaffRoleProposalItem
                key={proposal.proposalId}
                proposal={proposal}
                ownUserId={ownUserId}
                isCountersignPending={countersignMutation.isPending}
                isCancelPending={cancelMutation.isPending}
                onCountersign={() =>
                  countersignMutation.mutate({ proposalId: proposal.proposalId })
                }
                onCancel={() => cancelMutation.mutate(proposal.proposalId)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
