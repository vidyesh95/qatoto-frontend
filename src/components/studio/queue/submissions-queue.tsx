"use client";

import Image from "next/image";
import Link from "next/link";
import { useStudioVideos, StudioVideo } from "@/state/studio-videos-context";

// Creator-side approval queue (UI phase). Anime episodes land here on Save and
// wait for Qatoto staff review — this list is read-only status tracking; the
// approve/reject actions live in /admin/review, enforced server-side.
export default function SubmissionsQueue() {
  const { videos } = useStudioVideos();
  const animeSubmissions = videos.filter((video) => video.videoType === "anime-episode");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submissions are reviewed by Qatoto staff. Status updates here — approval is handled
        server-side, and approved episodes appear in Anime on their premiere date.
      </p>

      {animeSubmissions.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No submissions yet</p>
          <p className="text-sm text-muted-foreground">
            Upload a video with type “Anime episode” and it will show up here for review.
          </p>
          <Link
            href="/studio"
            className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Upload episode
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {animeSubmissions.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionRow({ submission }: { submission: StudioVideo }) {
  const episodeDetails = submission.animeEpisodeDetails;
  const episodeSummary = episodeDetails
    ? `${episodeDetails.seriesName} · ${episodeDetails.seasonLabel} · Ep ${episodeDetails.episodeNumber}`
    : submission.fileName;

  return (
    <li className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
      <span className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Image
          src="/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{submission.title}</p>
        <p className="truncate text-xs text-muted-foreground">{episodeSummary}</p>
        {submission.status.kind === "rejected" && (
          <p className="mt-1 text-xs text-destructive">
            Reason: {submission.status.rejectionReason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <SubmissionStatusBadge submission={submission} />
        <span className="w-24 text-right text-xs text-muted-foreground">
          {submission.uploadedAtLabel}
        </span>
      </div>
    </li>
  );
}

// Queue rows only ever hold review states, but the switch covers the whole
// status union so adding a variant elsewhere fails compilation here too.
function SubmissionStatusBadge({ submission }: { submission: StudioVideo }) {
  switch (submission.status.kind) {
    case "pending-review":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Pending
        </span>
      );
    case "approved":
      return (
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          Rejected
        </span>
      );
    case "processing":
    case "draft":
    case "scheduled":
    case "published":
      return null;
    default: {
      const exhaustiveCheck: never = submission.status;
      return exhaustiveCheck;
    }
  }
}
