// TRANSPORT: props-only — presentational server component. Fetches nothing; the log
// arrives as a prop from a parent that read a daily-log list endpoint.
import Image from "next/image";

import { formatIsoDate } from "@/lib/rnd/format";
import { EFFORT_VERIFICATION_STATUS_LABELS } from "@/lib/rnd/labels";
import type { DailyLogView, EffortVerificationStatus } from "@/lib/rnd/daily-logs.schemas";

/**
 * Six states, not a checkmark.
 *
 * `not_run` and `unverified` MUST read differently — one means nothing was ever asked
 * of the pipeline, the other means it was asked and the answer was no — and the two
 * in-flight states must not look like a refusal. The boolean this replaces rendered
 * four of the six identically, as an absent badge.
 */
const EFFORT_VERIFICATION_STATUS_CLASSES: Record<EffortVerificationStatus, string> = {
  not_run: "bg-muted text-muted-foreground",
  queued: "bg-muted text-muted-foreground",
  running: "bg-[#D6E3FF] text-[#191C1C]",
  verified: "bg-[#00696E]/10 text-[#00696E]",
  flagged_for_review: "bg-amber-100 text-amber-800",
  unverified: "bg-red-100 text-red-800",
};

/**
 * Daily-log feed entry: author header with the verification state, the video when there
 * is one, and the narrative behind a native `<details>` (zero JS).
 *
 * THE AI SUMMARY CHIPS ARE GONE. `DailyLogView` carries none — they live on
 * `GET …/daily-logs/:logId` alone, so rendering them in a feed would be one extra
 * request per card. See R_AND_D_STRUCTURE.md §18.
 *
 * `videoSource: "none"` is a first-class value, not a missing one: a member with no
 * video that day still logs, and a physical-work claim has no video by definition. So
 * the absence of a video renders as nothing, never as a broken thumbnail.
 */
export default function DailyLogCard({ log }: { log: DailyLogView }) {
  const hasVideo = log.videoSource !== "none" && log.videoThumbnailUrl !== null;

  return (
    <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {log.authorAvatarImageUrl ? (
          <Image
            src={log.authorAvatarImageUrl}
            width={32}
            height={32}
            alt={log.authorName}
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
            {log.authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium">{log.authorName}</span>
        <span className="text-xs text-muted-foreground">{formatIsoDate(log.logDate)}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${EFFORT_VERIFICATION_STATUS_CLASSES[log.effortVerificationStatus]}`}
        >
          {EFFORT_VERIFICATION_STATUS_LABELS[log.effortVerificationStatus]}
        </span>
        {log.status === "draft" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Draft
          </span>
        )}
      </div>
      {hasVideo && log.videoThumbnailUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={log.videoThumbnailUrl}
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            alt={`Daily log video from ${formatIsoDate(log.logDate)}`}
            className="object-cover"
          />
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-white/90 text-[#191C1C]">
              ▶
            </span>
          </div>
        </div>
      )}
      {log.narrative && (
        <>
          <p className="line-clamp-2 text-sm">{log.narrative}</p>
          <details>
            <summary className="cursor-pointer text-xs font-medium text-[#00696E]">
              Read full log
            </summary>
            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
              {log.narrative}
            </p>
          </details>
        </>
      )}
      {log.analysisStatus === "failed" && log.analysisFailureReason && (
        <p className="text-xs text-muted-foreground">
          Analysis did not complete: {log.analysisFailureReason}
        </p>
      )}
    </div>
  );
}
