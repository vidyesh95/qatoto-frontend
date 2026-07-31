// TRANSPORT: client-query — the lookup and the grant both call hooks in
// `@/hooks/rnd/platform-roles`.
"use client";

import { useState, type FormEvent } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useOwnStaffContextQuery,
  usePlatformRoleSubjectQuery,
  useSetPlatformRoleMutation,
} from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";
import { PLATFORM_ROLES, type PlatformRole } from "@/lib/rnd/platform-roles.schemas";

/** What each role actually lets someone do. Shown beside the choice, because "moderator"
 *  and "auditor" are disjoint rather than ranked and picking by name alone invites the
 *  assumption that admin > auditor > moderator. */
const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  moderator: "Decide categories, cluster merges and §10 content. No escrow access.",
  auditor: "Read the escrow ledger. Read-only, and cannot moderate anything.",
  admin: "Everything above, plus granting and revoking these roles.",
};

const REVOKE_CHOICE = "none";

/**
 * Grant and revoke platform staff roles.
 *
 * ONE ACCOUNT AT A TIME, BY EXACT EMAIL. There is no user list and no search — an admin
 * console that could page through every account is an enumeration surface, and the backend
 * declines to offer one. Knowing who to promote is out-of-band, as it should be.
 *
 * NOBODY CHANGES THEIR OWN ROLE. The backend answers 409, and the control is disabled here
 * so the refusal is not the way anyone finds out. An admin who could self-demote could step
 * out of the audit trail mid-incident; one who could self-promote would make the capability
 * split decorative.
 *
 * THIS SCREEN EXISTS BECAUSE THE ALTERNATIVE WAS A SHELL. `pnpm db:grant-platform-role`
 * still works and is still the ONLY way to make the first admin — everything here needs one
 * to already exist.
 */
export default function StaffRolePage() {
  const ownStaffContextQuery = useOwnStaffContextQuery();
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformRole | typeof REVOKE_CHOICE | null>(
    null,
  );

  const subjectQuery = usePlatformRoleSubjectQuery(submittedEmail);
  const roleMutation = useSetPlatformRoleMutation();

  const canManageRoles =
    ownStaffContextQuery.data?.capabilities.includes("manage_platform_roles") ?? false;

  const subject = subjectQuery.data;
  // Compared on the resolved id, not on the typed string: a different casing of the same
  // address is the same account, and the backend refuses it either way.
  const isSubjectSelf =
    subject !== undefined && subject.userId === ownStaffContextQuery.data?.userId;

  const firstError = [subjectQuery.error, roleMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  function handleLookupSubmit(submitEvent: FormEvent<HTMLFormElement>): void {
    submitEvent.preventDefault();
    roleMutation.reset();
    setSelectedRole(null);
    setSubmittedEmail(emailDraft.trim());
  }

  function handleSaveClick(): void {
    if (subject === undefined || selectedRole === null) return;
    roleMutation.mutate({
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
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Granting roles needs the admin role. Your role is{" "}
          {ownStaffContextQuery.data?.platformRole ?? "none"}.
        </output>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Grant or revoke a platform role. Look an account up by its exact email address — there is
          no directory to browse. Every change is recorded in the audit log.
        </p>
      </header>

      <form onSubmit={handleLookupSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 space-y-1 text-xs">
          <span className="font-medium">Email address</span>
          <input
            type="email"
            required
            value={emailDraft}
            onChange={(changeEvent) => setEmailDraft(changeEvent.target.value)}
            placeholder="someone@example.com"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={emailDraft.trim() === "" || subjectQuery.isFetching}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {subjectQuery.isFetching ? "Looking up…" : "Look up"}
        </button>
      </form>

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {subject !== undefined && (
        <section className="space-y-4 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{subject.name}</p>
            <p className="text-xs text-muted-foreground">{subject.email}</p>
            <p className="text-xs text-muted-foreground">
              Current role: <span className="font-medium">{subject.platformRole ?? "none"}</span>
            </p>
          </div>

          {isSubjectSelf ? (
            <output className="block rounded-xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              This is your own account. You cannot change your own role — ask another admin.
            </output>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium">Set role to</legend>
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
                      onChange={() => setSelectedRole(role)}
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
                    onChange={() => setSelectedRole(REVOKE_CHOICE)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">none</span>
                    <span className="block text-muted-foreground">
                      Revokes any role. Takes effect on their next request.
                    </span>
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={selectedRole === null || roleMutation.isPending}
                  className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {roleMutation.isPending ? "Saving…" : "Save"}
                </button>
                {roleMutation.isSuccess && (
                  <output className="text-xs text-muted-foreground">
                    Saved. {subject.email} is now{" "}
                    <span className="font-medium">{roleMutation.data.platformRole ?? "none"}</span>.
                  </output>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
