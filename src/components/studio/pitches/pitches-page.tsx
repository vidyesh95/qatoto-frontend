// TRANSPORT: client-query — `GET /pitches/mine`, plus the lifecycle writes
// (`POST …/submit`, `POST …/close`, `DELETE /pitches/:id`).
"use client";

import Image from "next/image";
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
import { formatDurationLabel } from "@/lib/feed/format";
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
}

function PitchVideoThumbnail({ video }: { readonly video: Pitch["pitchVideo"] }) {
  if (video === null) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No video on this pitch. Funders watch before they read — a pitch without one is much weaker.
      </p>
    );
  }

  const durationLabel = formatDurationLabel(video.durationSeconds);
  return (
    <span className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
      {video.thumbnailUrl === null ? (
        <Image
          src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      ) : (
        <Image
          src={video.thumbnailUrl}
          alt=""
          width={128}
          height={72}
          className="size-full object-cover"
        />
      )}
      {durationLabel !== null && (
        <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-xs font-medium text-white">
          {durationLabel}
        </span>
      )}
    </span>
  );
}

function PitchLinksSection({
  externalFundingUrl,
  externalContactUrl,
}: {
  readonly externalFundingUrl: string | null;
  readonly externalContactUrl: string | null;
}) {
  if (externalFundingUrl === null && externalContactUrl === null) {
    return (
      <p className="text-xs text-muted-foreground">
        No links yet. Add a funding link or a contact link before submitting — Qatoto hosts no
        funding of its own, so one of those two is how anyone reaches you.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      {externalFundingUrl !== null && (
        <ExternalLinkOut href={externalFundingUrl} label="Funding page" />
      )}
      {externalContactUrl !== null && <ExternalLinkOut href={externalContactUrl} label="Contact" />}
    </div>
  );
}

function PitchCardActions({
  pitch,
  isBusy,
  isSubmitPending,
  isDeletePending,
  isClosePending,
  onSubmit,
  onDelete,
  onClose,
}: {
  readonly pitch: Pitch;
  readonly isBusy: boolean;
  readonly isSubmitPending: boolean;
  readonly isDeletePending: boolean;
  readonly isClosePending: boolean;
  readonly onSubmit: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}) {
  return (
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
            onClick={onSubmit}
            className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
          >
            {isSubmitPending ? "Submitting…" : "Submit for review"}
          </button>
        </>
      )}

      {pitch.status === "draft" && (
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
        >
          {isDeletePending ? "Deleting…" : "Delete draft"}
        </button>
      )}

      {pitch.status === "published" && (
        <button
          type="button"
          disabled={isBusy}
          onClick={onClose}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
        >
          {isClosePending ? "Closing…" : "Close pitch"}
        </button>
      )}
    </div>
  );
}

function PitchStatusNotice({
  status,
  rejectionReason,
}: {
  readonly status: Pitch["status"];
  readonly rejectionReason: string | null;
}) {
  if (status === "rejected" && rejectionReason !== null) {
    return (
      <div className="mt-3 rounded-xl bg-destructive/10 p-3">
        <p className="text-xs font-medium text-destructive">Not published</p>
        <p className="mt-1 text-sm text-foreground">{rejectionReason}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Edit the pitch and submit it again once you have addressed this.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Waiting for review. A moderator checks for spam, scams and illegal content — not whether the
        venture is a good one. You will be notified either way.
      </p>
    );
  }

  if (status === "closed") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Closed. The page still resolves and says you are no longer raising, so old links do not
        break.
      </p>
    );
  }

  return null;
}

function PitchCard({ pitch }: { readonly pitch: Pitch }) {
  const submitMutation = useSubmitPitchMutation();
  const closeMutation = useClosePitchMutation();
  const deleteMutation = useDeletePitchMutation();

  const firstError = [submitMutation.error, closeMutation.error, deleteMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isBusy = submitMutation.isPending || closeMutation.isPending || deleteMutation.isPending;
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

      <div className="mt-2 flex gap-3">
        {pitch.pitchVideo !== null && <PitchVideoThumbnail video={pitch.pitchVideo} />}
        <p className="text-sm text-muted-foreground">{pitch.summary}</p>
      </div>

      {pitch.pitchVideo === null && <PitchVideoThumbnail video={null} />}

      <PitchStatusNotice status={pitch.status} rejectionReason={pitch.rejectionReason} />

      <PitchLinksSection
        externalFundingUrl={pitch.externalFundingUrl}
        externalContactUrl={pitch.externalContactUrl}
      />

      <PitchCardActions
        pitch={pitch}
        isBusy={isBusy}
        isSubmitPending={submitMutation.isPending}
        isDeletePending={deleteMutation.isPending}
        isClosePending={closeMutation.isPending}
        onSubmit={() => submitMutation.mutate(pitch.id)}
        onDelete={() => deleteMutation.mutate(pitch.id)}
        onClose={() => closeMutation.mutate(pitch.id)}
      />

      {hasPublicPage && detailQuery.data !== undefined && (
        <PitchOutcomesPanel pitchId={pitch.id} outcomes={detailQuery.data.outcomes} />
      )}

      {firstError !== undefined && (
        <p className="mt-3 text-xs leading-4 text-destructive">{firstError.apiError.message}</p>
      )}
    </article>
  );
}
