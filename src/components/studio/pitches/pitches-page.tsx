// TRANSPORT: client-query — `GET /pitches/mine`, plus the lifecycle writes
// (`POST …/submit`, `POST …/close`, `DELETE /pitches/:id`).
"use client";

import Link from "next/link";
import { useState } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  ExternalLinkOut,
  PitchDisclaimer,
  PitchStatusBadge,
} from "@/components/pitches/pitch-shared";
import PitchOutcomesPanel from "@/components/studio/pitches/pitch-outcomes-panel";
import {
  useClosePitchMutation,
  useDeletePitchMutation,
  useMyPitchesQuery,
  usePitchQuery,
  useSubmitPitchMutation,
} from "@/hooks/rnd/pitches";
import { ApiRequestError } from "@/lib/http";
import type { Pitch } from "@/lib/rnd/pitches.schemas";

/**
 * Every pitch you are running, across every venture you founded.
 *
 * WHAT A PITCH IS HERE: the idea you already own, plus a video, plus a link to wherever the
 * money actually happens. Qatoto lists it. It does not hold funds, take a fee, or promise
 * anything to anyone who follows the link — which is why `PitchDisclaimer` renders on this
 * page too and not only on the public one. A founder should read the same sentence a
 * stranger does.
 *
 * ⚠️ NO AMOUNT AND NO EQUITY PERCENTAGE APPEARS ANYWHERE ON THIS PAGE, and none can: the
 * backend stores neither. "Raising $X for Y%" on a Qatoto-hosted page would be a general
 * solicitation, and `commerce_cofounder_profile` already refused the same column pair on the
 * same ground. The ask lives on the third party's page, behind the outbound link.
 *
 * THE LIFECYCLE IS THE PAGE. Draft → submit → a moderator decides → live, or rejected with a
 * reason you can act on. Every control here is one step of that, and nothing shortcuts it:
 * there is no publish button, because publishing is not a founder's to do.
 */
export default function StudioPitchesPage() {
  const [page, setPage] = useState(1);
  const pitchesQuery = useMyPitchesQuery(page, undefined);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Pitches</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Publish an idea to people who might fund it. Qatoto lists your pitch and links out —{" "}
        <strong>funding happens off Qatoto</strong>, wherever your link points.
      </p>

      <div className="mt-4 max-w-2xl">
        <PitchDisclaimer />
      </div>

      {renderPitches()}
    </div>
  );

  function renderPitches() {
    if (pitchesQuery.isPending) {
      return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
    }

    if (pitchesQuery.error !== null) {
      return (
        <div className="mt-6">
          <StatusPanel message="Couldn't load your pitches. Please try again." />
        </div>
      );
    }

    // AN EMPTY LIST IS NOT AN ERROR, and the copy names the one thing that has to be true
    // first: a pitch belongs to a venture, so someone with no published venture has nowhere
    // to put one. Guessing which of the two reasons applies would be worse than saying both.
    if (pitchesQuery.data.rows.length === 0) {
      return (
        <div className="mt-6 max-w-2xl rounded-2xl border border-border p-6">
          <p className="text-sm text-foreground">You have no pitches yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A pitch belongs to a venture you founded, and the venture has to be published first.
            Open one from its page in Research and Development.
          </p>
          <Link
            href="/research-and-development"
            className="mt-3 inline-block text-sm text-foreground underline"
          >
            Research and Development
          </Link>
        </div>
      );
    }

    return (
      <>
        <ul className="mt-6 max-w-3xl space-y-3">
          {pitchesQuery.data.rows.map((pitch) => (
            <li key={pitch.id}>
              <PitchCard pitch={pitch} />
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
            Page {page} of {Math.max(1, pitchesQuery.data.pagination.totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= pitchesQuery.data.pagination.totalPages}
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
}

function PitchCard({ pitch }: { readonly pitch: Pitch }) {
  const submitMutation = useSubmitPitchMutation();
  const closeMutation = useClosePitchMutation();
  const deleteMutation = useDeletePitchMutation();

  // ONE ERROR SURFACE ACROSS THREE MUTATIONS. Three separate banners would let two failures
  // render at once and leave the reader guessing which control they belong to.
  const firstError = [submitMutation.error, closeMutation.error, deleteMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isBusy = submitMutation.isPending || closeMutation.isPending || deleteMutation.isPending;

  // Only a pitch with a public page has funding to report against — `GET /pitches/:slug`
  // serves `published` and `closed` and 404s for a draft, so the query stays disabled until
  // there is something for it to find.
  const hasPublicPage = pitch.status === "published" || pitch.status === "closed";
  const detailQuery = usePitchQuery(pitch.slug, hasPublicPage);

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-medium text-foreground">{pitch.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{pitch.projectName}</p>
        </div>
        <PitchStatusBadge status={pitch.status} />
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{pitch.summary}</p>

      {/* THE REJECTION REASON IS SHOWN IN FULL. It is the moderator's own sentence and the
          only thing that makes a rejection actionable rather than a wall. */}
      {pitch.status === "rejected" && pitch.rejectionReason !== null && (
        <div className="mt-3 rounded-xl bg-destructive/10 p-3">
          <p className="text-xs font-medium text-destructive">Not published</p>
          <p className="mt-1 text-sm text-foreground">{pitch.rejectionReason}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit the pitch and submit it again once you have addressed this.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1">
        {pitch.externalFundingUrl !== null && (
          <ExternalLinkOut href={pitch.externalFundingUrl} label="Funding page" />
        )}
        {pitch.externalContactUrl !== null && (
          <ExternalLinkOut href={pitch.externalContactUrl} label="Contact" />
        )}
        {pitch.externalFundingUrl === null && pitch.externalContactUrl === null && (
          <p className="text-xs text-muted-foreground">
            No links yet. Add a funding link or a contact link before submitting — Qatoto hosts no
            funding of its own, so one of those two is how anyone reaches you.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pitch.status === "published" && (
          <Link
            href={`/research-and-development/pitches/${pitch.slug}`}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground"
          >
            View public page
          </Link>
        )}

        {(pitch.status === "draft" || pitch.status === "rejected") && (
          <>
            <Link
              href={`/studio/pitches/edit?pitchId=${encodeURIComponent(pitch.id)}`}
              className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground"
            >
              Edit
            </Link>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                submitMutation.mutate(pitch.id);
              }}
              className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
          </>
        )}

        {pitch.status === "draft" && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              deleteMutation.mutate(pitch.id);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete draft"}
          </button>
        )}

        {pitch.status === "published" && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              closeMutation.mutate(pitch.id);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
          >
            {closeMutation.isPending ? "Closing…" : "Close pitch"}
          </button>
        )}
      </div>

      {/* Said plainly rather than left to the badge: a submitted pitch has no verdict yet,
          and copy that implies one is the same error as rendering a 202 as a result. */}
      {pitch.status === "pending" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Waiting for review. A moderator checks for spam, scams and illegal content — not whether
          the venture is a good one. You will be notified either way.
        </p>
      )}

      {pitch.status === "closed" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Closed. The page still resolves and says you are no longer raising, so old links do not
          break.
        </p>
      )}

      {hasPublicPage && detailQuery.data !== undefined && (
        <PitchOutcomesPanel pitchId={pitch.id} outcomes={detailQuery.data.outcomes} />
      )}

      {firstError !== undefined && (
        <p className="mt-3 text-xs leading-4 text-destructive">{firstError.apiError.message}</p>
      )}
    </article>
  );
}
