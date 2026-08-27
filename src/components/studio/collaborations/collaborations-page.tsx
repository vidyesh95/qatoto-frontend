// TRANSPORT: client-query — `GET /users/me/collaborations` and `GET /users/me/collaborators`.
"use client";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  useMyCollaborationsQuery,
  useMyCollaboratorsQuery,
  useRespondToCollaborationMutation,
} from "@/hooks/videos/collaborations";
import { COLLABORATION_STATUS_LABELS } from "@/lib/videos/collaborations.schemas";
import type { CollaborationInvite, VideoCollaborator } from "@/lib/videos/collaborations.schemas";

/**
 * Collaborator credits — who worked on your videos, and what you have been credited on.
 *
 * A CHANNEL FEATURE, not a product team. This used to live at `/studio/team`, which is the
 * pipeline stage where a founder assembles the people who build the product; that page now does
 * that job and this one kept the credits. Nothing here changed in the move except the heading.
 *
 * ⚠️ THIS PAGE GRANTS NOBODY ANYTHING, AND THE COPY HAS TO SAY SO. `/studio/team`'s roadmap line
 * read "who else can act on this account", which is ACCOUNT-LEVEL DELEGATION — roles, invites that
 * confer access, revocation. **That does not exist**: no delegation primitive exists anywhere in
 * the backend, and nothing authorizes off `video_collaborator`. Shipping this page under the old
 * summary without correcting it would be claiming a capability the platform does not have, so the
 * roadmap entry was rewritten alongside it.
 *
 * WHAT IT DOES DO is make a credit mean something. `video_collaborator.status` has had
 * `invited | accepted | declined` since the table existed and **no route could write anything but
 * `invited`** — there was no accept, no decline, and no read by which an invitee could learn they
 * had been named. So a "collaborator" was an email address a creator typed into a box. Now the
 * person named can confirm or refuse it, which is the difference between a claim and a credit.
 *
 * TWO HALVES, TWO DIFFERENT PEOPLE. The top is what OTHERS say about you and only you can answer;
 * the bottom is what you say about others and only they can answer. Neither list can edit the
 * other, which is why they are separate reads rather than one merged table.
 */
export default function StudioCollaborationsPage() {
  const invitesQuery = useMyCollaborationsQuery();
  const rosterQuery = useMyCollaboratorsQuery();
  const respondMutation = useRespondToCollaborationMutation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Collaborations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Collaborator credits on videos. <strong>A credit grants no access</strong> — it does not let
        anyone sign in, edit a video, or act on your account. It records who worked on what.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Credits you have been given</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only you can answer these. Declining is an answer the creator can see, not a way to hide
          the invitation.
        </p>
        {renderInvites()}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">People you have credited</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Added on a video&apos;s <em>Video elements</em> step. Only the person named can confirm a
          credit — you cannot confirm it for them.
        </p>
        {renderRoster()}
      </section>
    </div>
  );

  function renderInvites() {
    if (invitesQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (invitesQuery.error !== null) {
      return (
        <div className="mt-3">
          <StatusPanel message="Couldn't load your credits. Please try again." />
        </div>
      );
    }
    if (invitesQuery.data.length === 0) {
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Nobody has credited you on a video yet.
        </p>
      );
    }
    return (
      <ul className="mt-3 space-y-3">
        {invitesQuery.data.map((invite) => (
          <li key={invite.videoId}>
            <InviteCard
              invite={invite}
              isBusy={respondMutation.isPending}
              onRespond={(response) => {
                respondMutation.mutate({ videoId: invite.videoId, input: { response } });
              }}
            />
          </li>
        ))}
      </ul>
    );
  }

  function renderRoster() {
    if (rosterQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (rosterQuery.error !== null) {
      return (
        <div className="mt-3">
          <StatusPanel message="Couldn't load your collaborators. Please try again." />
        </div>
      );
    }
    if (rosterQuery.data.length === 0) {
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          You have not credited anyone yet. Add them on a video&apos;s{" "}
          <Link href="/studio/videos" className="underline">
            Video elements
          </Link>{" "}
          step.
        </p>
      );
    }
    return (
      <ul className="mt-3 space-y-2">
        {rosterQuery.data.map((collaborator) => (
          <li
            key={`${collaborator.videoId}:${collaborator.invitedEmail}`}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{collaborator.invitedEmail}</p>
              <p className="text-xs text-muted-foreground">{collaborator.videoTitle}</p>
            </div>
            <StatusChip status={collaborator.status} />
          </li>
        ))}
      </ul>
    );
  }
}

function StatusChip({ status }: { readonly status: VideoCollaborator["status"] }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
      {COLLABORATION_STATUS_LABELS[status]}
    </span>
  );
}

function InviteCard({
  invite,
  isBusy,
  onRespond,
}: {
  readonly invite: CollaborationInvite;
  readonly isBusy: boolean;
  readonly onRespond: (response: "accepted" | "declined") => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{invite.videoTitle}</p>
          <p className="text-xs text-muted-foreground">Credited by {invite.creatorName}</p>
        </div>
        <StatusChip status={invite.status} />
      </div>

      {/*
        THE BUTTONS DISAPPEAR ONCE ANSWERED, rather than offering to change the answer. There is no
        route back to `invited` and there should not be — reverting would erase a decision somebody
        made. Re-crediting is the creator's move, not the invitee's.
      */}
      {invite.status === "invited" && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRespond("accepted")}
            className="cursor-pointer rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRespond("declined")}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
