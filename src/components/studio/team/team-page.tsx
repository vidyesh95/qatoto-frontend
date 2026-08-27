// TRANSPORT: client-query — `GET /applications/received`, `GET /open-roles/mine` and
// `GET /research-projects/mine`, plus the accept/decline writes on the project-scoped route.
"use client";

import Link from "next/link";
import { useState } from "react";

import CompensationBadges from "@/components/home/research-and-development/cards/compensation-badges";
import StatusPanel from "@/components/home/shared/status-panel";
import { INPUT_CLASS } from "@/components/ui/field-classes";
import {
  useDecideApplicationMutation,
  useMaintainedOpenRolesQuery,
  useMyProjectsQuery,
  useReceivedApplicationsQuery,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import type { ReceivedApplication } from "@/lib/rnd/projects.schemas";

/**
 * The people side of every venture you run.
 *
 * ⚠️ THIS ROUTE USED TO SHOW VIDEO-COLLABORATOR CREDITS, and the swap is the point. Those are
 * a YouTube/Douyin feature — "who worked on this video" — and they now live at
 * `/studio/collaborations` under Channel. `/studio/team` sits in the sidebar's **Product
 * journey** section between Pitches and Funding, a section whose own comment says it maps
 * "pitch → team → fund". This is that stage: the founder posts an idea, people ask to join as
 * hobbyists, for equity, for a wage, or for a blend of the two, and they build the thing.
 *
 * WHY IT EXISTS AT ALL, and it is the same gap `/studio/funding` was built to close: the whole
 * team-building domain is PER PROJECT. `GET /research-projects/:slug/applications` is
 * maintainer-gated on one venture, so a founder running three opened three project pages to
 * answer "who wants to join". `GET /applications/received` is the cross-venture read that did
 * not exist.
 *
 * ⚠️ THE WRITES STAY WHERE THEY ARE. Accept and decline call the project-scoped route, which
 * is why every row carries `projectSlug`. That transaction locks the role row to serialize two
 * maintainers accepting the last seat; a second copy at the root would be a second chance to
 * get that wrong. Roster changes and role editing stay on the project's own Team tab, and this
 * page links through — the `/studio/funding` shape exactly.
 *
 * ⚠️ NOTHING HERE GRANTS EQUITY, and no number on this page is a share of anything. A role's
 * advertised band is an OFFER; the only equity that exists is minted by verified effort through
 * the slice ledger. Accepting someone writes a `project_member` row and opens a stint — it
 * writes no ledger entry at all.
 */
export default function StudioTeamPage() {
  const [page, setPage] = useState(1);
  const applicationsQuery = useReceivedApplicationsQuery("pending", page);
  const rolesQuery = useMaintainedOpenRolesQuery();
  const projectsQuery = useMyProjectsQuery(undefined);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Team</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Who wants to build with you, across every venture you run. People join as hobbyists, for
        equity, for a wage, or a blend — <strong>what a role advertises is an offer</strong>, and
        equity itself is earned through verified work rather than granted on arrival.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Applications waiting on you</h2>
        {renderApplications()}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Roles you advertise</h2>
        {renderRoles()}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Your ventures</h2>
        {renderVentures()}
      </section>
    </div>
  );

  function renderApplications() {
    if (applicationsQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (applicationsQuery.error !== null) {
      return (
        <div className="mt-3 max-w-2xl">
          <StatusPanel message="Couldn't load your applications. Please try again." />
        </div>
      );
    }
    // AN EMPTY QUEUE IS NOT AN ERROR, and it has two causes worth separating: nobody has
    // applied, or you advertise nothing for them to apply to. The second is actionable.
    if (applicationsQuery.data.rows.length === 0) {
      return (
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Nobody is waiting on a decision.{" "}
          {rolesQuery.data !== undefined && rolesQuery.data.length === 0
            ? "You have not advertised any roles yet — open one from a venture's Team tab."
            : "Applications to any venture you maintain land here."}
        </p>
      );
    }

    return (
      <>
        <ul className="mt-3 max-w-3xl space-y-3">
          {applicationsQuery.data.rows.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage((current) => current - 1);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {Math.max(1, applicationsQuery.data.pagination.totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= applicationsQuery.data.pagination.totalPages}
            onClick={() => {
              setPage((current) => current + 1);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </>
    );
  }

  function renderRoles() {
    if (rolesQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (rolesQuery.error !== null) {
      return (
        <div className="mt-3 max-w-2xl">
          <StatusPanel message="Couldn't load your roles. Please try again." />
        </div>
      );
    }
    if (rolesQuery.data.length === 0) {
      return (
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          You advertise no roles. Open one from a venture&apos;s Team tab — say what the work is,
          what you can commit, and what it pays in cash, equity or both.
        </p>
      );
    }
    return (
      <ul className="mt-3 flex max-w-3xl flex-wrap gap-3">
        {rolesQuery.data.map((role) => (
          <li key={role.id}>
            <AdvertisedRoleCard role={role} />
          </li>
        ))}
      </ul>
    );
  }

  function renderVentures() {
    if (projectsQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (projectsQuery.error !== null || projectsQuery.data.rows.length === 0) {
      return (
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          You have not founded a venture yet.{" "}
          <Link href="/research-and-development/new" className="underline">
            Post an idea
          </Link>{" "}
          and people can start asking to join it.
        </p>
      );
    }
    return (
      <ul className="mt-3 max-w-2xl space-y-2">
        {projectsQuery.data.rows.map((project) => (
          <li
            key={project.slug}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{project.name}</p>
              {/* The count comes off `project_stats`, which the venture list already carries —
                  so the roster summary costs no extra read. */}
              <p className="text-xs text-muted-foreground">
                {project.teamMemberCount} on the team · {project.openRoleCount} open role
                {project.openRoleCount === 1 ? "" : "s"}
              </p>
            </div>
            {/* The roster writes live on the project's own Team tab and stay there. */}
            <Link
              href={`/research-and-development/project/${project.slug}`}
              className="shrink-0 text-xs text-foreground underline"
            >
              Manage the team
            </Link>
          </li>
        ))}
      </ul>
    );
  }
}

function ApplicationCard({ application }: { readonly application: ReceivedApplication }) {
  const [reviewNote, setReviewNote] = useState("");
  // The mutation is PROJECT-SCOPED — the row's own slug is what addresses it, which is why
  // `/applications/received` carries one on every row.
  const decideMutation = useDecideApplicationMutation(application.projectSlug);

  const error = decideMutation.error instanceof ApiRequestError ? decideMutation.error : undefined;

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{application.applicantName}</p>
          <p className="text-xs text-muted-foreground">
            {application.projectName} · {application.roleTitleSnapshot ?? "Open application"} ·{" "}
            {ROLE_COMMITMENT_LABELS[application.statedCommitment]}
          </p>
        </div>
      </div>

      <p className="mt-2 text-sm whitespace-pre-line text-foreground">{application.shortPitch}</p>

      {application.selectedSkills.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Says they have: {application.selectedSkills.join(", ")}
        </p>
      )}

      {/* ⚠️ THEIR OWN SENTENCE, and it is read by you and by nothing else. It is not a rate, it
          is not priced, and it is not an input to any grant — the R&D surface says exactly this
          and the wording must not drift between the two places a founder reads it. */}
      {application.expectedCompensationNote !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          What they hope for: {application.expectedCompensationNote}
        </p>
      )}

      <input
        className={`${INPUT_CLASS} mt-3`}
        value={reviewNote}
        placeholder="A note back to them (they will read this)"
        onChange={(changeEvent) => {
          setReviewNote(changeEvent.target.value);
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={decideMutation.isPending}
          onClick={() => {
            decideMutation.mutate({
              applicationId: application.id,
              decision: "accept",
              reviewNote: reviewNote.trim().length > 0 ? reviewNote.trim() : undefined,
            });
          }}
          className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {decideMutation.isPending ? "Working…" : "Accept and add to the team"}
        </button>
        <button
          type="button"
          disabled={decideMutation.isPending}
          onClick={() => {
            decideMutation.mutate({
              applicationId: application.id,
              decision: "decline",
              reviewNote: reviewNote.trim().length > 0 ? reviewNote.trim() : undefined,
            });
          }}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
        >
          Decline
        </button>
      </div>

      {error !== undefined && (
        <p className="mt-2 text-xs leading-4 text-destructive">{error.apiError.message}</p>
      )}
    </article>
  );
}

function AdvertisedRoleCard({ role }: { readonly role: OpenRole }) {
  return (
    <div className="w-72 rounded-2xl border border-border p-4">
      <p className="text-sm font-medium text-foreground">{role.roleTitle}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {role.projectName} · {ROLE_COMMITMENT_LABELS[role.commitment]}
      </p>

      {/* The same chips the public board renders, so a founder checking their own listing sees
          exactly what a candidate sees. */}
      <div className="mt-2 flex flex-wrap gap-1">
        <CompensationBadges strands={role.compensation} currency={role.currency} />
      </div>

      {/* UNPAID IS A REAL ANSWER and is said out loud. A role with no strands is the hobbyist
          case; rendering nothing there would read as missing data rather than as the terms. */}
      {role.compensation.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Unpaid — contribute for the work.</p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {role.slotsFilledCount} of {role.slotsTotal} filled · {role.status}
      </p>
    </div>
  );
}
