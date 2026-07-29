// TRANSPORT: client-query — "use client" page body. Reads GET /applications/mine and
// GET /invites/mine through React Query and writes the invite accept/decline. Needs
// QueryProvider, which (home)/layout.tsx mounts.
"use client";

import Link from "next/link";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndStatusPanel, {
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import {
  useMyApplicationsQuery,
  useMyInvitesQuery,
  useRespondToInviteMutation,
} from "@/hooks/rnd/projects";
import { ApiRequestError, isUnauthorized } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { ProjectApplicationStatus, ProjectInviteStatus } from "@/lib/rnd/projects.schemas";

const APPLICATION_STATUS_LABELS: Record<ProjectApplicationStatus, string> = {
  pending: "Waiting on the team",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "You withdrew it",
  expired: "Expired",
};

const INVITE_STATUS_LABELS: Record<ProjectInviteStatus, string> = {
  pending: "Waiting on you",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "The team withdrew it",
  expired: "Expired",
};

/**
 * The applicant's and invitee's own inbox.
 *
 * THIS PAGE EXISTS BECAUSE THE INVITE FLOW OTHERWISE TERMINATES NOWHERE. `/accept` and
 * `/decline` both need an `inviteId`, and an invitee holds no project slug to go looking
 * for one — the project-scoped list is the FOUNDER's inbox and is maintainer-gated, so it
 * can never answer "who wants me?". Backend §11j.2 shipped the two `/mine` reads for
 * exactly this screen and nothing linked to them until now.
 *
 * NEITHER READ TAKES A USER ID, and neither may ever be given one: both filter on the
 * session. A `?userId=` on a personal list is a client-supplied authorization input.
 *
 * A DRAFT PROJECT'S APPLICATION STAYS VISIBLE HERE. That is deliberate rather than a
 * leak — the applicant is its counterparty and already knows the project exists, because
 * they applied to it.
 */
export default function ApplicationInboxPage() {
  const applicationsQuery = useMyApplicationsQuery();
  const invitesQuery = useMyInvitesQuery();
  const respondMutation = useRespondToInviteMutation();

  const respondError =
    respondMutation.error instanceof ApiRequestError ? respondMutation.error.apiError : null;

  // A 401 on either read is a signed-out visitor, not a failure to explain away.
  const isSignInRequired =
    (applicationsQuery.error instanceof ApiRequestError &&
      isUnauthorized(applicationsQuery.error.apiError)) ||
    (invitesQuery.error instanceof ApiRequestError && isUnauthorized(invitesQuery.error.apiError));

  return (
    <div className="space-y-8 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">
          Your applications &amp; invites
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything you asked to join, and everyone who asked you.
        </p>
      </header>

      {isSignInRequired ? (
        <RndSignInRequiredPanel message="Sign in to see what you applied to and who invited you." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium tracking-wide xl:text-lg">Invitations to you</h2>
            {renderInvites()}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium tracking-wide xl:text-lg">Your applications</h2>
            {renderApplications()}
          </section>
        </>
      )}

      {respondError !== null && <MutationErrorNotice error={respondError} />}
    </div>
  );

  function renderInvites() {
    if (invitesQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading…</p>;
    }
    if (invitesQuery.isError) {
      return <RndStatusPanel message="Couldn't load your invitations." />;
    }
    if (invitesQuery.data.length === 0) {
      return <RndStatusPanel message="Nobody has invited you to a project yet." />;
    }

    return (
      <ul className="space-y-3">
        {invitesQuery.data.map((invite) => (
          <li key={invite.id} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/research-and-development/project/${invite.projectSlug}`}
                  className="font-medium hover:text-[#00696E]"
                >
                  {invite.projectName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {invite.invitedByName} invited you
                  {invite.roleTitle !== null && ` as ${invite.roleTitle}`} ·{" "}
                  {formatIsoInstant(invite.createdAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {INVITE_STATUS_LABELS[invite.status]}
              </span>
            </div>

            {invite.message !== null && <p className="text-sm">{invite.message}</p>}

            {invite.expiresAt !== null && invite.status === "pending" && (
              <p className="text-xs text-muted-foreground">
                Expires {formatIsoInstant(invite.expiresAt)}
              </p>
            )}

            {invite.status === "pending" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() =>
                    respondMutation.mutate({
                      projectSlug: invite.projectSlug,
                      inviteId: invite.id,
                      decision: "accept",
                    })
                  }
                  className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Accept and join
                </button>
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() =>
                    respondMutation.mutate({
                      projectSlug: invite.projectSlug,
                      inviteId: invite.id,
                      decision: "decline",
                    })
                  }
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  function renderApplications() {
    if (applicationsQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading…</p>;
    }
    if (applicationsQuery.isError) {
      return <RndStatusPanel message="Couldn't load your applications." />;
    }
    if (applicationsQuery.data.length === 0) {
      return (
        <RndStatusPanel message="You have not applied to anything yet. Open roles live on the team-building page." />
      );
    }

    return (
      <ul className="space-y-3">
        {applicationsQuery.data.map((application) => (
          <li key={application.id} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/research-and-development/project/${application.projectSlug}`}
                  className="font-medium hover:text-[#00696E]"
                >
                  {application.projectName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {application.roleTitleSnapshot ?? "Open application"} ·{" "}
                  {formatIsoInstant(application.createdAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {APPLICATION_STATUS_LABELS[application.status]}
              </span>
            </div>

            <p className="text-sm">{application.shortPitch}</p>

            {/* The founder's note back is the whole reason someone opens this screen. */}
            {application.reviewNote !== null && (
              <p className="rounded-xl bg-muted/50 p-3 text-sm">
                From the team: {application.reviewNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  }
}
